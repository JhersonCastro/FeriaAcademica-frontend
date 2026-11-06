import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { EVENT_STATUS_CHIPS } from '../../../../core/events/event-rules';
import { seatsLabel } from '../../../../core/events/event-seats';
import { EventSummary, EventsService } from '../../../../core/events/events.service';
import { eventStatusLabel } from '../../../../core/models/labels';

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

  protected readonly events = signal<EventSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    inject(EventsService)
      .list()
      .subscribe({
        next: (events) => {
          this.events.set(events);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(apiErrorMessage(error));
          this.loading.set(false);
        },
      });
  }
}
