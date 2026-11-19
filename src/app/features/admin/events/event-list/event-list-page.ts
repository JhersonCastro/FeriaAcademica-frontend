import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { EVENT_STATUS_CHIPS } from '../../../../core/events/event-rules';
import { seatsLabel } from '../../../../core/events/event-seats';
import { EventSummary, EventsService } from '../../../../core/events/events.service';
import { CurrentStage, currentStage } from '../../../../core/events/stage-plan';
import { STAGE_LABELS, eventStatusLabel } from '../../../../core/models/labels';

/** Super admin: every fair with its state and seats; each one opens its configuration. */
@Component({
  selector: 'app-event-list-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './event-list-page.html',
  host: { class: 'page-content' },
})
export class EventListPage {
  protected readonly statusChips = EVENT_STATUS_CHIPS;
  protected readonly statusLabel = eventStatusLabel;
  protected readonly seats = seatsLabel;
  protected readonly stageLabels = STAGE_LABELS;

  protected readonly events = signal<EventSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  /**
   * The stage of each fair by id. The list endpoint carries no stages, so they are asked one fair at
   * a time; a fair whose stages fail to load is left out and shows "—".
   */
  protected readonly stages = signal<Record<string, CurrentStage | null>>({});

  constructor() {
    const api = inject(EventsService);
    api.list().subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
        this.loadStages(api, events);
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  private loadStages(api: EventsService, events: readonly EventSummary[]): void {
    for (const event of events) {
      api.stages(event.id).subscribe({
        next: (stages) =>
          this.stages.update((all) => ({ ...all, [event.id]: currentStage(stages, Date.now()) })),
      });
    }
  }
}
