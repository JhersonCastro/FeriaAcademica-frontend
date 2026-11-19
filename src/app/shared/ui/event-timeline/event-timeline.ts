import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { EventStageDto, EventsService, StageStatus } from '../../../core/events/events.service';
import {
  currentStage,
  formatStageDate,
  sortStages,
  stageStatusAt,
} from '../../../core/events/stage-plan';
import { STAGE_DESCRIPTIONS, STAGE_LABELS } from '../../../core/models/labels';

type TimelineState =
  { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; stages: EventStageDto[] };

/** How a stage is told apart by where it is in its schedule. */
const STATUS_VIEW: Record<StageStatus, { label: string; chip: string; node: string }> = {
  Closed: { label: 'Finalizada', chip: 'chip--neutral', node: 'node--done' },
  Open: { label: 'En curso', chip: 'chip--now', node: 'node--open' },
  Scheduled: { label: 'Pendiente', chip: 'chip--info', node: 'node--pending' },
};

/**
 * Read-only timeline of a fair for the people taking part in it: which stage it is in, what comes
 * next and when each one starts and ends. Any signed-in user can read the stages.
 */
@Component({
  selector: 'app-event-timeline',
  templateUrl: './event-timeline.html',
  styleUrl: './event-timeline.css',
})
export class EventTimeline {
  readonly eventId = input.required<string>();
  readonly eventName = input<string>('');

  private readonly api = inject(EventsService);

  protected readonly stageLabels = STAGE_LABELS;
  protected readonly stageDescriptions = STAGE_DESCRIPTIONS;
  protected readonly formatDate = formatStageDate;

  /** The current instant, to tell which stages are running; it moves forward every minute. */
  private readonly now = signal(Date.now());

  protected readonly state = toSignal(
    toObservable(this.eventId).pipe(
      switchMap((id) =>
        this.api.stages(id).pipe(
          map((stages): TimelineState => ({ kind: 'ready', stages })),
          catchError(() => of<TimelineState>({ kind: 'error' })),
          startWith<TimelineState>({ kind: 'loading' }),
        ),
      ),
    ),
    { initialValue: { kind: 'loading' } as TimelineState },
  );

  private readonly stages = computed(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.stages : [];
  });

  /** The stages in the order they happen: the backend's sequence when it sends it, else by date. */
  protected readonly items = computed(() => {
    const stages = this.stages();
    const ordered = stages.every((stage) => stage.order !== undefined)
      ? [...stages].sort((a, b) => a.order! - b.order!)
      : sortStages(stages);
    const now = this.now();
    return ordered.map((stage, index) => {
      const status = stageStatusAt(stage, now);
      return { stage, number: stage.order ?? index + 1, status, view: STATUS_VIEW[status] };
    });
  });

  /** What the header says: the stage running now, the next one, or that everything ended. */
  protected readonly summary = computed(() => {
    const current = currentStage(this.stages(), this.now());
    if (!current) {
      return null;
    }
    if (current.kind === 'finished') {
      return { label: 'Etapas finalizadas', chip: 'chip--neutral' };
    }
    const name = STAGE_LABELS[current.type!];
    return current.kind === 'current'
      ? { label: `Ahora: ${name}`, chip: 'chip--now' }
      : { label: `Próxima: ${name}`, chip: 'chip--info' };
  });

  /** When works can be sent: the reception stage, said as what the person can do about it. */
  protected readonly receptionLine = computed(() => {
    const reception = this.stages().find((stage) => stage.type === 'Reception');
    if (!reception?.startDate || !reception.endDate) {
      return null;
    }
    const start = formatStageDate(reception.startDate);
    const end = formatStageDate(reception.endDate);
    switch (stageStatusAt(reception, this.now())) {
      case 'Open':
        return `Puedes subir tus trabajos hasta el ${end}.`;
      case 'Closed':
        return `La recepción de trabajos cerró el ${end}.`;
      default:
        return `La recepción de trabajos abre el ${start} y cierra el ${end}.`;
    }
  });

  constructor() {
    // Stage states depend on the clock, so they are refreshed while the page stays open.
    const tick = setInterval(() => this.now.set(Date.now()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(tick));
  }
}
