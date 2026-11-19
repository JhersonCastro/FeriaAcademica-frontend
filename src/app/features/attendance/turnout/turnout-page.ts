import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, filter, merge, switchMap, timer } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AttendanceService } from '../../../core/attendance/attendance.service';
import { injectEventName } from '../../../core/events/event-name';
import { AttendanceSummaryDto, EventRegistrationDto } from '../../../core/models/attendance';

export const TURNOUT_POLL_MS = 4000;

type TurnoutTab = 'summary' | 'entered';

/** Live turnout of an event: polls the attendance summary while the page is open. */
@Component({
  selector: 'app-turnout-page',
  imports: [DatePipe, DecimalPipe, PercentPipe, RouterLink],
  templateUrl: './turnout-page.html',
  styleUrl: './turnout-page.css',
  host: { class: 'page-content' },
})
export class TurnoutPage {
  private readonly attendance = inject(AttendanceService);
  protected readonly eventId = inject(ActivatedRoute).snapshot.paramMap.get('eventId') ?? '';
  protected readonly eventName = injectEventName(this.eventId);
  protected readonly pollSeconds = TURNOUT_POLL_MS / 1000;

  protected readonly summary = signal<AttendanceSummaryDto | null>(null);
  protected readonly updatedAt = signal<Date | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly ratio = computed(() => {
    const summary = this.summary();
    return summary && summary.registered > 0 ? summary.entered / summary.registered : 0;
  });

  /** "Resumen" shows the figures; "Ingresados" lists who already checked in. */
  protected readonly tab = signal<TurnoutTab>('summary');
  private readonly registrations = signal<EventRegistrationDto[] | null>(null);
  protected readonly listError = signal<string | null>(null);

  /** Who already entered, the latest first; cancelled registrations do not count. */
  protected readonly entered = computed(() => {
    const rows = this.registrations();
    if (!rows) {
      return null;
    }
    return rows
      .filter((row) => row.status === 'Registered' && row.enteredAt)
      .sort((a, b) => Date.parse(b.enteredAt!) - Date.parse(a.enteredAt!));
  });

  constructor() {
    // The list is only fetched while its tab is open: on opening it and then on every tick.
    merge(timer(0, TURNOUT_POLL_MS), toObservable(this.tab))
      .pipe(
        filter(() => this.tab() === 'entered'),
        switchMap(() =>
          this.attendance.registrations(this.eventId).pipe(
            catchError((error: unknown) => {
              this.listError.set(apiErrorMessage(error));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((rows) => {
        this.registrations.set(rows);
        this.listError.set(null);
      });

    // switchMap drops a slow request when the next tick arrives; takeUntilDestroyed stops
    // polling when the user leaves the page. Failures keep the last figures on screen.
    timer(0, TURNOUT_POLL_MS)
      .pipe(
        switchMap(() =>
          this.attendance.summary(this.eventId).pipe(
            catchError((error: unknown) => {
              this.errorMessage.set(apiErrorMessage(error));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((summary) => {
        this.summary.set(summary);
        this.updatedAt.set(new Date());
        this.errorMessage.set(null);
      });
  }
}
