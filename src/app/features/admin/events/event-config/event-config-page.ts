import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/api/api-error';
import {
  EVENT_STATUS_CHIPS,
  canClose,
  canPublish,
  canScheduleStages,
} from '../../../../core/events/event-rules';
import { seatsLabel } from '../../../../core/events/event-seats';
import {
  EventStageDto,
  EventSummary,
  EventsService,
  StageStatus,
  StageType,
} from '../../../../core/events/events.service';
import {
  STAGE_TIME_ZONE_LABEL,
  StageDraft,
  draftFromStage,
  draftRange,
  emptyDraft,
  formatDuration,
  formatStageDate,
  orderConflictText,
  sortStages,
  stageStatusAt,
  timelineConflicts,
  validateDraft,
} from '../../../../core/events/stage-plan';
import {
  STAGE_DESCRIPTIONS,
  STAGE_LABELS,
  STAGE_TYPES,
  eventStatusLabel,
} from '../../../../core/models/labels';

type EventAction = 'publish' | 'close';
type DraftField = keyof StageDraft;

/** How a stage is told apart in the timeline: its state in its own schedule, or a conflict. */
type StageKind = StageStatus | 'Conflict';

const STAGE_KINDS: Record<StageKind, { label: string; chip: string; node: string }> = {
  Closed: { label: 'Finalizada', chip: 'chip--neutral', node: 'node--done' },
  Open: { label: 'En curso', chip: 'chip--navy', node: 'node--open' },
  Scheduled: { label: 'Pendiente', chip: 'chip--info', node: 'node--pending' },
  Conflict: { label: 'Con conflicto', chip: 'chip--danger', node: 'node--conflict' },
};

const ACTION_NOTICES: Record<EventAction, string> = {
  publish: 'La feria quedó publicada: ya acepta inscripciones.',
  close: 'La feria quedó cerrada: se habilitan los certificados y se detienen las inscripciones.',
};

/** Super admin: publish or close a fair, set its seats and plan the timeline of its stages. */
@Component({
  selector: 'app-event-config-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './event-config-page.html',
  styleUrl: './event-config-page.css',
  host: { class: 'page-content' },
})
export class EventConfigPage {
  private readonly events = inject(EventsService);
  private readonly eventId = inject(ActivatedRoute).snapshot.paramMap.get('eventId') ?? '';
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly stageLabels = STAGE_LABELS;
  protected readonly stageDescriptions = STAGE_DESCRIPTIONS;
  protected readonly stageTypes = STAGE_TYPES;
  protected readonly timeZone = STAGE_TIME_ZONE_LABEL;
  protected readonly statusChips = EVENT_STATUS_CHIPS;
  protected readonly statusLabel = eventStatusLabel;
  protected readonly seats = seatsLabel;
  protected readonly formatDate = formatStageDate;
  protected readonly orderConflict = orderConflictText;

  protected readonly event = signal<EventSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly publishable = computed(() => canPublish(this.event()?.status ?? 'Closed'));
  protected readonly closable = computed(() => canClose(this.event()?.status ?? 'Closed'));
  protected readonly schedulable = computed(() =>
    canScheduleStages(this.event()?.status ?? 'Closed'),
  );

  // Publish / close.
  protected readonly confirming = signal<EventAction | null>(null);
  protected readonly acting = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  // Seats.
  protected readonly capacityForm = this.fb.group({
    capacity: this.fb.control<number | null>(null, [Validators.min(1)]),
  });
  protected readonly capacitySaving = signal(false);
  protected readonly capacityError = signal<string | null>(null);
  protected readonly capacitySaved = signal(false);

  // Stages (HU-006): the saved timeline and the stage being configured.
  protected readonly savedStages = signal<EventStageDto[]>([]);
  protected readonly stagesLoading = signal(true);
  protected readonly stagesLoadError = signal<string | null>(null);
  protected readonly selected = signal<StageType | null>(null);
  protected readonly draft = signal<StageDraft>(emptyDraft());
  protected readonly stageSaving = signal(false);
  protected readonly stageError = signal<string | null>(null);
  protected readonly stageNotice = signal<string | null>(null);

  /** The current instant, to tell which stages are running; it moves forward every minute. */
  private readonly now = signal(Date.now());

  private readonly savedByType = computed(
    () => new Map(this.savedStages().map((stage) => [stage.type, stage])),
  );
  /** The saved stage being configured, `null` when it is not in the timeline yet. */
  protected readonly selectedSaved = computed(() => {
    const type = this.selected();
    return type ? (this.savedByType().get(type) ?? null) : null;
  });
  /** The conflicts of the timeline, counting the dates typed in the form for a saved stage. */
  private readonly conflicts = computed(() =>
    timelineConflicts(this.savedStages(), this.selected(), this.draft()),
  );
  protected readonly timeline = computed(() =>
    sortStages(this.savedStages()).map((stage, index) => ({
      stage,
      order: index + 1,
      conflict: this.conflicts().has(stage.type),
      kind: this.kindOf(stage.type, stage),
    })),
  );
  /** What is shown under the timeline for each conflict. */
  protected readonly conflictList = computed(() =>
    [...this.conflicts()].map(([type, conflict]) => ({ type, conflict })),
  );
  protected readonly validation = computed(() => {
    const type = this.selected();
    return type ? validateDraft(type, this.draft(), this.savedStages()) : null;
  });
  protected readonly hasIssues = computed(() => {
    const check = this.validation();
    return !!check && Object.keys(check.issues).length > 0;
  });
  protected readonly duration = computed(() => {
    const range = draftRange(this.draft());
    return range ? formatDuration(range.startDate, range.endDate) : null;
  });
  /** The dates of the stage as they are saved, to say what stays in force while the form has errors. */
  protected readonly savedSummary = computed(() => {
    const saved = this.selectedSaved();
    return saved?.startDate && saved.endDate
      ? `${formatStageDate(saved.startDate, false)} → ${formatStageDate(saved.endDate, false)}`
      : null;
  });

  constructor() {
    this.load();
    this.loadStages();
    // Stage states depend on the clock, so they are refreshed while the page stays open.
    const tick = setInterval(() => this.now.set(Date.now()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(tick));
  }

  /** Whether the stage is in the timeline (saved). */
  protected added(type: StageType): boolean {
    return this.savedByType().has(type);
  }

  /** The way a stage of the timeline is drawn: its state right now, or a conflict. */
  protected kindOf(type: StageType, stage: EventStageDto) {
    return STAGE_KINDS[this.conflicts().has(type) ? 'Conflict' : stageStatusAt(stage, this.now())];
  }

  /** Opens a stage of the list in the form on the right, with its saved dates if it has them. */
  protected select(type: StageType): void {
    this.selected.set(type);
    this.draft.set(draftFromStage(this.savedByType().get(type) ?? null));
    this.stageError.set(null);
    this.stageNotice.set(null);
  }

  protected setDraft(field: DraftField, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.stageNotice.set(null);
    this.draft.update((draft) => ({ ...draft, [field]: value }));
  }

  /** Saves the stage being configured: it goes into the timeline, or its dates change. */
  protected saveStage(): void {
    const type = this.selected();
    const range = draftRange(this.draft());
    if (!type || !range || !this.validation()?.valid) {
      return;
    }
    this.stageSaving.set(true);
    this.stageError.set(null);
    this.stageNotice.set(null);
    this.events.scheduleStage(this.eventId, type, range).subscribe({
      next: () => {
        this.stageSaving.set(false);
        this.stageNotice.set(`«${STAGE_LABELS[type]}» quedó en la línea de tiempo.`);
        this.loadStages();
        this.load();
      },
      error: (error: unknown) => {
        this.stageSaving.set(false);
        this.stageError.set(apiErrorMessage(error));
      },
    });
  }

  /** Takes the stage being configured out of the timeline (it keeps no dates). */
  protected removeStage(): void {
    const type = this.selected();
    if (!type || !this.selectedSaved()) {
      return;
    }
    this.stageSaving.set(true);
    this.stageError.set(null);
    this.stageNotice.set(null);
    this.events.removeStage(this.eventId, type).subscribe({
      next: () => {
        this.stageSaving.set(false);
        this.draft.set(emptyDraft());
        this.stageNotice.set(`«${STAGE_LABELS[type]}» salió de la línea de tiempo.`);
        this.loadStages();
        this.load();
      },
      error: (error: unknown) => {
        this.stageSaving.set(false);
        this.stageError.set(apiErrorMessage(error));
      },
    });
  }

  protected runAction(): void {
    const action = this.confirming();
    if (!action) {
      return;
    }
    this.acting.set(true);
    this.actionError.set(null);
    const request =
      action === 'publish' ? this.events.publish(this.eventId) : this.events.close(this.eventId);
    request.subscribe({
      next: () => {
        this.acting.set(false);
        this.confirming.set(null);
        this.notice.set(ACTION_NOTICES[action]);
        this.load();
      },
      error: (error: unknown) => {
        this.acting.set(false);
        this.confirming.set(null);
        this.actionError.set(apiErrorMessage(error));
      },
    });
  }

  protected saveCapacity(): void {
    if (this.capacityForm.invalid) {
      this.capacityForm.markAllAsTouched();
      return;
    }
    this.capacitySaving.set(true);
    this.capacityError.set(null);
    this.capacitySaved.set(false);
    const { capacity } = this.capacityForm.getRawValue();
    this.events.setCapacity(this.eventId, capacity).subscribe({
      next: () => {
        this.capacitySaving.set(false);
        this.capacitySaved.set(true);
        this.load();
      },
      error: (error: unknown) => {
        this.capacitySaving.set(false);
        this.capacityError.set(apiErrorMessage(error));
      },
    });
  }

  /**
   * The stages saved in the backend. The first time, the one in progress opens in the form; after
   * saving or removing one, the form shows what the backend has now and keeps its notice.
   */
  private loadStages(): void {
    this.events.stages(this.eventId).subscribe({
      next: (stages) => {
        this.savedStages.set(stages);
        this.stagesLoadError.set(null);
        this.stagesLoading.set(false);
        const current = this.selected();
        if (current) {
          this.draft.set(draftFromStage(stages.find((stage) => stage.type === current) ?? null));
        } else {
          const open = stages.find((stage) => stageStatusAt(stage, this.now()) === 'Open');
          if (open) {
            this.select(open.type);
          }
        }
      },
      error: (error: unknown) => {
        this.stagesLoadError.set(apiErrorMessage(error));
        this.stagesLoading.set(false);
      },
    });
  }

  private load(): void {
    this.events.list().subscribe({
      next: (events) => {
        const event = events.find((item) => item.id === this.eventId) ?? null;
        this.event.set(event);
        this.loadError.set(event ? null : 'No encontramos la feria.');
        if (event) {
          this.capacityForm.setValue({ capacity: event.capacity });
        }
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }
}
