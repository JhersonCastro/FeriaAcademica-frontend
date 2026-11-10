import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, concatMap, filter, finalize, map, of, tap } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { AddedArtifact, ArtifactTypeName, UploadProgress, WorkDto } from '../../../core/models/work';
import {
  ARTIFACT_TYPES,
  ARTIFACT_TYPE_LABELS,
  MAX_FILE_MB,
  REVIEW_RESULT_CHIPS,
  REVIEW_RESULT_LABELS,
  WORK_STATUS_CHIPS,
  WORK_STATUS_LABELS,
  artifactRows,
  canReplace,
  canReturnToDraft,
  canSubmitFinalVersion,
  canWithdraw,
  fileError,
  fileSizeLabel,
  isDeadlinePassed,
  isHttpUrl,
  reviewsNewestFirst,
  sendRequirements,
} from '../../../core/works/work-rules';
import { WorksService } from '../../../core/works/works.service';

type ViewState = 'loading' | 'ready' | 'error';

/** Actions that ask for confirmation first: sending (two ways), the final version, withdrawing, going back to draft. */
type PendingAction = 'send-version' | 'send-draft' | 'send-final' | 'withdraw' | 'return-to-draft';

interface Confirmation {
  title: string;
  text: string;
  button: string;
  destructive: boolean;
}

const SEND_CONFIRMATION: Confirmation = {
  title: '¿Enviar el trabajo a revisión?',
  text: 'Entrará al final de la cola de revisión de tu profesor. Mientras nadie lo abra podrás devolverlo a Borrador; una vez en revisión ya no podrás cambiarlo.',
  button: 'Sí, enviar',
  destructive: false,
};

const CONFIRMATIONS: Record<PendingAction, Confirmation> = {
  'send-version': SEND_CONFIRMATION,
  'send-draft': SEND_CONFIRMATION,
  'send-final': {
    title: '¿Entregar la versión final?',
    text: 'Solo se puede entregar una versión final por trabajo: después no podrás cambiarla.',
    button: 'Sí, entregar',
    destructive: false,
  },
  withdraw: {
    title: '¿Retirar este trabajo?',
    text: 'Quedará Cancelado y no participará en esta feria. Esta acción no se puede deshacer.',
    button: 'Sí, retirar',
    destructive: true,
  },
  'return-to-draft': {
    title: '¿Devolver el trabajo a Borrador?',
    text: 'Perderás tu lugar en la cola de revisión. Podrás editarlo y volver a enviarlo antes del cierre; el reenvío entrará al final de la cola.',
    button: 'Sí, devolver',
    destructive: false,
  },
};

/**
 * The author's view of one work.
 * - HU-011: current status and every piece of reviewer feedback.
 * - HU-012: replace it with a new version while the call is open (the old one is kept).
 */
@Component({
  selector: 'app-work-detail-page',
  imports: [DatePipe, NgTemplateOutlet, ReactiveFormsModule, RouterLink],
  templateUrl: './work-detail-page.html',
  styleUrl: './work-detail-page.css',
  host: { class: 'page-content' },
})
export class WorkDetailPage {
  private readonly works = inject(WorksService);
  private readonly workId = inject(ActivatedRoute).snapshot.paramMap.get('workId') ?? '';

  protected readonly user = inject(AuthService).user;
  protected readonly today = new Date();

  protected readonly statusLabels = WORK_STATUS_LABELS;
  protected readonly statusChips = WORK_STATUS_CHIPS;
  protected readonly resultLabels = REVIEW_RESULT_LABELS;
  protected readonly resultChips = REVIEW_RESULT_CHIPS;
  protected readonly artifactTypes = ARTIFACT_TYPES;
  protected readonly artifactLabels = ARTIFACT_TYPE_LABELS;

  protected readonly state = signal<ViewState>('loading');
  protected readonly work = signal<WorkDto | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly artifacts = computed(() => artifactRows(this.work()?.artifacts ?? []));
  protected readonly reviews = computed(() => reviewsNewestFirst(this.work()?.reviews ?? []));
  protected readonly latestReview = computed(() => this.reviews()[0] ?? null);

  protected readonly deadlinePassed = computed(() =>
    isDeadlinePassed(this.work()?.submissionDeadline ?? null),
  );
  protected readonly replaceable = computed(() => {
    const work = this.work();
    return work !== null && canReplace(work.status, work.submissionDeadline);
  });
  /** Back to draft after "approved with changes": the participant must correct and resend. */
  protected readonly needsCorrection = computed(
    () => this.work()?.status === 'Draft' && this.latestReview()?.result === 'Rejected',
  );
  protected readonly withdrawable = computed(() => {
    const work = this.work();
    return work !== null && canWithdraw(work.status);
  });
  protected readonly returnable = computed(() => {
    const work = this.work();
    return work !== null && canReturnToDraft(work.status, work.submissionDeadline);
  });
  protected readonly inReview = computed(() => this.work()?.status === 'InReview');
  /** HU-030: approved and still without its final version. */
  protected readonly finalizable = computed(() => {
    const work = this.work();
    return work !== null && canSubmitFinalVersion(work.status, work.artifacts);
  });
  protected readonly finalDelivered = computed(
    () => this.work()?.artifacts.some((artifact) => artifact.isFinal) ?? false,
  );
  /** HU-017: what a draft needs before it can be sent. */
  protected readonly requirements = computed(() => {
    const work = this.work();
    return work ? sendRequirements(work.artifacts.length, work.submissionDeadline) : [];
  });

  protected readonly confirming = signal<PendingAction | null>(null);
  protected readonly confirmation = computed(() => {
    const action = this.confirming();
    return action ? CONFIRMATIONS[action] : null;
  });

  protected readonly form = inject(NonNullableFormBuilder).group({
    type: ['Document' as ArtifactTypeName, Validators.required],
    linkUrl: ['', Validators.required],
  });
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // HU-015: the new version is a PDF file (default) or a link.
  protected readonly maxFileMb = MAX_FILE_MB;
  protected readonly fileSizeLabel = fileSizeLabel;
  protected readonly source = signal<'file' | 'link'>('file');
  protected readonly file = signal<File | null>(null);
  protected readonly fileProblem = signal<string | null>(null);
  protected readonly dragging = signal(false);
  /** Upload percentage while a file goes up; `null` otherwise. */
  protected readonly progress = signal<number | null>(null);

  constructor() {
    this.load();
  }

  protected chooseSource(source: 'file' | 'link'): void {
    this.source.set(source);
    this.formError.set(null);
  }

  protected onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setFile(input.files?.[0] ?? null);
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.setFile(event.dataTransfer?.files?.[0] ?? null);
  }

  protected clearFile(): void {
    this.file.set(null);
    this.fileProblem.set(null);
  }

  private setFile(file: File | null): void {
    if (!file) {
      return;
    }
    const problem = fileError(file);
    this.fileProblem.set(problem);
    this.file.set(problem ? null : file);
  }

  /** The chosen source is ready to be sent: a valid PDF, or a valid link. */
  private sourceReady(): boolean {
    return this.source() === 'file'
      ? this.file() !== null
      : isHttpUrl(this.form.controls.linkUrl.value);
  }

  protected showLinkError(): boolean {
    const control = this.form.controls.linkUrl;
    return this.source() === 'link' && (control.touched || this.submitted()) && !isHttpUrl(control.value);
  }

  protected showFileError(): boolean {
    return this.source() === 'file' && this.submitted() && !this.file();
  }

  /**
   * Sending (a new version, or the draft as it is) and the two ways of taking a work back ask
   * for confirmation first; `confirm` runs what was asked.
   */
  protected askSend(action: 'send-version' | 'send-draft'): void {
    if (action === 'send-version') {
      this.submitted.set(true);
      if (!this.work() || !this.sourceReady()) {
        return;
      }
    }
    this.confirming.set(action);
  }

  /** The final version needs its PDF; the delivery is final, so it asks first. */
  protected askFinal(): void {
    this.submitted.set(true);
    if (!this.work() || !this.file()) {
      return;
    }
    this.confirming.set('send-final');
  }

  protected askWithdraw(): void {
    this.confirming.set('withdraw');
  }

  protected askReturnToDraft(): void {
    this.confirming.set('return-to-draft');
  }

  protected cancelConfirmation(): void {
    this.confirming.set(null);
  }

  protected confirm(): void {
    const action = this.confirming();
    const work = this.work();
    this.confirming.set(null);
    if (!action || !work) {
      return;
    }
    switch (action) {
      case 'send-version':
        this.replace(true);
        break;
      case 'send-draft':
        this.run(this.works.submit(work.id), 'Enviaste tu trabajo a revisión.');
        break;
      case 'send-final': {
        const file = this.file();
        if (file) {
          this.run(
            this.track(this.works.submitFinalVersion(work.id, file)),
            'Entregaste la versión final de tu trabajo.',
          );
        }
        break;
      }
      case 'withdraw':
        this.run(this.works.withdraw(work.id), 'Retiraste el trabajo: quedó cancelado.');
        break;
      case 'return-to-draft':
        this.run(
          this.works.withdraw(work.id),
          'Tu trabajo volvió a Borrador. Puedes corregirlo y reenviarlo antes del cierre.',
        );
        break;
    }
  }

  /** Draft only: keeps the new version without sending it yet. */
  protected saveDraftVersion(): void {
    this.replace(false);
  }

  private replace(submitAfterwards: boolean): void {
    const work = this.work();
    this.submitted.set(true);
    if (!work || !this.sourceReady()) {
      return;
    }
    const { type, linkUrl } = this.form.getRawValue();
    const file = this.file();

    // A submitted work must go back to draft first. Never withdraw a draft: that cancels it.
    const toDraft: Observable<unknown> =
      work.status === 'Submitted' ? this.works.withdraw(work.id) : of(null);
    let version = 0;
    const steps = toDraft.pipe(
      concatMap(() =>
        this.source() === 'file' && file
          ? this.upload(work.id, type, file)
          : this.works.addLink(work.id, { type, linkUrl: linkUrl.trim() }),
      ),
      concatMap((added) => {
        version = added.version;
        return submitAfterwards ? this.works.submit(work.id) : of(null);
      }),
    );

    this.run(steps, () => {
      const kept = version > 1 ? ` La versión ${version - 1} se conservó.` : '';
      const sent = submitAfterwards ? ' Tu trabajo volvió a la cola de revisión.' : '';
      return `Se creó la versión ${version} de ${this.artifactLabels[type].toLowerCase()}.${kept}${sent}`;
    });
  }

  private upload(workId: string, type: ArtifactTypeName, file: File): Observable<AddedArtifact> {
    return this.track(this.works.uploadFile(workId, type, file));
  }

  /** Publishes the percentage while a PDF goes up and emits the artifact once it is stored. */
  private track(upload: Observable<UploadProgress>): Observable<AddedArtifact> {
    this.progress.set(0);
    return upload.pipe(
      tap((event) => {
        if (event.kind === 'progress') {
          this.progress.set(event.percent);
        }
      }),
      filter((event): event is Extract<UploadProgress, { kind: 'done' }> => event.kind === 'done'),
      map((event) => event.artifact),
      finalize(() => this.progress.set(null)),
    );
  }

  private run(action: Observable<unknown>, success: string | (() => string)): void {
    this.saving.set(true);
    this.formError.set(null);
    this.successMessage.set(null);
    action.subscribe({
      complete: () => {
        this.saving.set(false);
        this.submitted.set(false);
        this.form.controls.linkUrl.reset('');
        this.clearFile();
        this.successMessage.set(typeof success === 'function' ? success() : success);
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(error));
        // Part of the steps may have gone through (e.g. back to draft): show the real state.
        this.load();
      },
    });
  }

  private load(): void {
    this.works.get(this.workId).subscribe({
      next: (work) => {
        this.work.set(work);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.state.set('error');
      },
    });
  }
}
