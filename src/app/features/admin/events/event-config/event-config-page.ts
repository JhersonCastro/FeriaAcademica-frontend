import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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
  StageRow,
  fillDates,
  initialRows,
  moveRow,
  toggleRow,
  planChanges,
  planErrors,
  planWarnings,
} from '../../../../core/events/stage-plan';
import { STAGE_LABELS, STAGE_TYPES, eventStatusLabel } from '../../../../core/models/labels';
import { Observable, concat, finalize, last, of } from 'rxjs';

type EventAction = 'publish' | 'close';

const STAGE_STATUS: Record<StageStatus, { label: string; chip: string }> = {
  Scheduled: { label: 'Programada', chip: 'chip--neutral' },
  Open: { label: 'En curso', chip: 'chip--success' },
  Closed: { label: 'Terminada', chip: 'chip--info' },
};

const ACTION_NOTICES: Record<EventAction, string> = {
  publish: 'La feria quedó publicada: ya acepta inscripciones.',
  close: 'La feria quedó cerrada: se habilitan los certificados y se detienen las inscripciones.',
};

/** Super admin: publish or close a fair, set its seats and schedule its stages. */
@Component({
  selector: 'app-event-config-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './event-config-page.html',
  styleUrl: './event-config-page.css',
  host: { class: 'page-content' },
})
export class EventConfigPage {
  private readonly events = inject(EventsService);
  private readonly eventId = inject(ActivatedRoute).snapshot.paramMap.get('eventId') ?? '';
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly stageLabels = STAGE_LABELS;
  protected readonly stageStatus = STAGE_STATUS;
  protected readonly statusChips = EVENT_STATUS_CHIPS;
  protected readonly statusLabel = eventStatusLabel;
  protected readonly seats = seatsLabel;

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

  // Stages (T-13, T-15): the saved timeline and the checklist to plan it.
  protected readonly savedStages = signal<EventStageDto[]>([]);
  protected readonly stagesLoading = signal(true);
  protected readonly stagesLoadError = signal<string | null>(null);
  protected readonly rows = signal<StageRow[]>(initialRows([], STAGE_TYPES));
  protected readonly autoForm = this.fb.group({
    firstStart: [''],
    durationDays: this.fb.control<number | null>(5, [Validators.min(0)]),
    gapDays: this.fb.control<number | null>(0, [Validators.min(0)]),
  });
  protected readonly autoError = signal<string | null>(null);
  protected readonly planSubmitted = signal(false);
  protected readonly planSaving = signal(false);
  protected readonly planError = signal<string | null>(null);
  protected readonly planSaved = signal(false);
  protected readonly selectedCount = computed(
    () => this.rows().filter((row) => row.selected).length,
  );
  protected readonly errors = computed(() => planErrors(this.rows()));
  protected readonly warnings = computed(() => planWarnings(this.rows()));
  /** Unmarking a saved Reception stage takes away the submission deadline of the works. */
  protected readonly removingReception = computed(
    () =>
      this.savedStages().some((stage) => stage.type === 'Reception') &&
      !this.rows().some((row) => row.type === 'Reception' && row.selected),
  );
  protected readonly pendingChanges = computed(() => {
    const changes = planChanges(this.savedStages(), this.rows());
    return changes.schedule.length + changes.remove.length;
  });

  constructor() {
    this.load();
    this.loadStages();
  }

  /** The position of a marked stage in the plan (1, 2, …), or `null` when it is not marked. */
  protected orderOf(type: StageType): number | null {
    const selected = this.rows().filter((row) => row.selected);
    const index = selected.findIndex((row) => row.type === type);
    return index < 0 ? null : index + 1;
  }

  protected toggle(type: StageType, event: Event): void {
    const selected = (event.target as HTMLInputElement).checked;
    this.planSaved.set(false);
    this.rows.update((rows) => toggleRow(rows, type, selected, STAGE_TYPES));
  }

  protected setDate(type: StageType, field: 'start' | 'end', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.planSaved.set(false);
    this.rows.update((rows) =>
      rows.map((row) => (row.type === type ? { ...row, [field]: value } : row)),
    );
  }

  protected move(type: StageType, step: -1 | 1): void {
    this.planSaved.set(false);
    this.rows.update((rows) => moveRow(rows, type, step, STAGE_TYPES));
  }

  /** Fills the dates of the marked stages from the first start, the duration and the interval. */
  protected calculate(): void {
    this.autoError.set(null);
    const { firstStart, durationDays, gapDays } = this.autoForm.getRawValue();
    if (!this.selectedCount()) {
      this.autoError.set('Marca primero las etapas que tendrá la feria.');
      return;
    }
    if (!durationDays || durationDays <= 0) {
      this.autoError.set('La duración de cada etapa debe ser de al menos 1 día.');
      return;
    }
    const filled = fillDates(this.rows(), {
      firstStart,
      durationDays,
      gapDays: gapDays ?? 0,
    });
    if (!filled) {
      this.autoError.set('Indica cuándo empieza la primera etapa.');
      return;
    }
    this.planSaved.set(false);
    this.rows.set(filled);
  }

  /** Goes back to the saved timeline, forgetting what was changed in the checklist. */
  protected resetPlan(): void {
    this.planSubmitted.set(false);
    this.planError.set(null);
    this.rows.set(initialRows(this.savedStages(), STAGE_TYPES));
  }

  /**
   * Saves the plan: schedules the new or changed stages (PUT) and then removes the ones that were
   * unmarked (DELETE), one after the other so the backend always keeps an active stage.
   */
  protected savePlan(): void {
    this.planSubmitted.set(true);
    this.planError.set(null);
    this.planSaved.set(false);
    if (this.errors().length) {
      return;
    }
    const { schedule, remove } = planChanges(this.savedStages(), this.rows());
    if (!schedule.length && !remove.length) {
      this.planSaved.set(true);
      return;
    }
    const calls: Observable<void>[] = [
      ...schedule.map(({ type, schedule: dates }) =>
        this.events.scheduleStage(this.eventId, type, dates),
      ),
      ...remove.map((type) => this.events.removeStage(this.eventId, type)),
    ];
    this.planSaving.set(true);
    concat(...calls, of(undefined))
      .pipe(
        last(),
        finalize(() => {
          this.planSaving.set(false);
          // Whatever happened, show what the backend has now.
          this.loadStages(false);
          this.load();
        }),
      )
      .subscribe({
        next: () => {
          this.planSubmitted.set(false);
          this.planSaved.set(true);
        },
        error: (error: unknown) => this.planError.set(apiErrorMessage(error)),
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

  /** T-13: the stages saved in the backend. `resetRows` also puts them back in the checklist. */
  private loadStages(resetRows = true): void {
    this.events.stages(this.eventId).subscribe({
      next: (stages) => {
        this.savedStages.set(stages);
        this.stagesLoadError.set(null);
        this.stagesLoading.set(false);
        if (resetRows || this.planSaved()) {
          this.rows.set(initialRows(stages, STAGE_TYPES));
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
