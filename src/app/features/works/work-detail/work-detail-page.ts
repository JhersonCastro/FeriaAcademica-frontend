import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, concatMap, of } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { ArtifactTypeName, WorkDto } from '../../../core/models/work';
import {
  ARTIFACT_TYPES,
  ARTIFACT_TYPE_LABELS,
  REVIEW_RESULT_CHIPS,
  REVIEW_RESULT_LABELS,
  WORK_STATUS_CHIPS,
  WORK_STATUS_LABELS,
  artifactRows,
  canReplace,
  isDeadlinePassed,
  isHttpUrl,
  reviewsNewestFirst,
} from '../../../core/works/work-rules';
import { WorksService } from '../../../core/works/works.service';

type ViewState = 'loading' | 'ready' | 'error';

/**
 * The author's view of one work.
 * - HU-011: current status and every piece of reviewer feedback.
 * - HU-012: replace it with a new version while the call is open (the old one is kept).
 */
@Component({
  selector: 'app-work-detail-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './work-detail-page.html',
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

  protected readonly form = inject(NonNullableFormBuilder).group({
    type: ['Document' as ArtifactTypeName, Validators.required],
    linkUrl: ['', Validators.required],
  });
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected showLinkError(): boolean {
    const control = this.form.controls.linkUrl;
    return (control.touched || this.submitted()) && !isHttpUrl(control.value);
  }

  /** Uploads the new version and sends the work to review again. */
  protected replaceAndSubmit(): void {
    this.replace(true);
  }

  /** Draft only: keeps the new version without sending it yet. */
  protected saveDraftVersion(): void {
    this.replace(false);
  }

  /** Draft only: sends the current versions to review without adding another one. */
  protected submitDraft(): void {
    const work = this.work();
    if (!work) {
      return;
    }
    this.run(this.works.submit(work.id), 'Enviaste tu trabajo a revisión.');
  }

  private replace(submitAfterwards: boolean): void {
    const work = this.work();
    this.submitted.set(true);
    if (!work || this.form.invalid || !isHttpUrl(this.form.controls.linkUrl.value)) {
      return;
    }
    const { type, linkUrl } = this.form.getRawValue();

    // A submitted work must go back to draft first. Never withdraw a draft: that cancels it.
    const toDraft: Observable<unknown> =
      work.status === 'Submitted' ? this.works.withdraw(work.id) : of(null);
    let version = 0;
    const steps = toDraft.pipe(
      concatMap(() => this.works.addLink(work.id, { type, linkUrl: linkUrl.trim() })),
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

  private run(action: Observable<unknown>, success: string | (() => string)): void {
    this.saving.set(true);
    this.formError.set(null);
    this.successMessage.set(null);
    action.subscribe({
      complete: () => {
        this.saving.set(false);
        this.submitted.set(false);
        this.form.controls.linkUrl.reset('');
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
