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
  localDateTimeToIso,
} from '../../../../core/events/event-rules';
import { seatsLabel } from '../../../../core/events/event-seats';
import { EventSummary, EventsService, StageType } from '../../../../core/events/events.service';
import { STAGE_LABELS, STAGE_TYPES, eventStatusLabel } from '../../../../core/models/labels';

type EventAction = 'publish' | 'close';

interface ScheduledStage {
  type: StageType;
  start: string;
  end: string;
}

const ACTION_NOTICES: Record<EventAction, string> = {
  publish: 'La feria quedó publicada: ya acepta inscripciones.',
  close: 'La feria quedó cerrada: se habilitan los certificados y se detienen las inscripciones.',
};

/** Super admin: publish or close a fair, set its seats and schedule its stages. */
@Component({
  selector: 'app-event-config-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './event-config-page.html',
  host: { class: 'page-content' },
})
export class EventConfigPage {
  private readonly events = inject(EventsService);
  private readonly eventId = inject(ActivatedRoute).snapshot.paramMap.get('eventId') ?? '';
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly stageTypes = STAGE_TYPES;
  protected readonly stageLabels = STAGE_LABELS;
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

  // Stages. The API does not list a fair's stages, so only what is scheduled here is shown.
  protected readonly stageForm = this.fb.group({
    type: this.fb.control<StageType>('Reception'),
    start: ['', Validators.required],
    end: ['', Validators.required],
  });
  protected readonly stageSubmitted = signal(false);
  protected readonly stageSaving = signal(false);
  protected readonly stageError = signal<string | null>(null);
  protected readonly scheduled = signal<ScheduledStage[]>([]);

  constructor() {
    this.load();
  }

  protected showStageError(control: 'start' | 'end'): boolean {
    const field = this.stageForm.controls[control];
    return field.invalid && (field.touched || this.stageSubmitted());
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

  protected scheduleStage(): void {
    this.stageSubmitted.set(true);
    this.stageError.set(null);
    if (this.stageForm.invalid) {
      this.stageForm.markAllAsTouched();
      return;
    }
    const { type, start, end } = this.stageForm.getRawValue();
    const startDate = localDateTimeToIso(start);
    const endDate = localDateTimeToIso(end);
    if (!startDate || !endDate) {
      this.stageError.set('Indica fechas válidas para el inicio y el fin.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      this.stageError.set('La etapa debe terminar después de empezar.');
      return;
    }

    this.stageSaving.set(true);
    this.events.scheduleStage(this.eventId, type, { startDate, endDate }).subscribe({
      next: () => {
        this.stageSaving.set(false);
        this.scheduled.update((list) => [
          ...list.filter((stage) => stage.type !== type),
          { type, start: startDate, end: endDate },
        ]);
        this.stageSubmitted.set(false);
        this.stageForm.patchValue({ start: '', end: '' });
        this.stageForm.markAsUntouched();
      },
      error: (error: unknown) => {
        this.stageSaving.set(false);
        this.stageError.set(apiErrorMessage(error));
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
