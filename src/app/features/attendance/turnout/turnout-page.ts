import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, filter, merge, switchMap, timer } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AttendanceService } from '../../../core/attendance/attendance.service';
import { injectEventName } from '../../../core/events/event-name';
import { AttendanceSummaryDto, EventRegistrationDto } from '../../../core/models/attendance';
import { RealtimeService } from '../../../core/realtime/realtime.service';

export const TURNOUT_POLL_MS = 4000;

type TurnoutTab = 'summary' | 'entered';

/** Live turnout of an event: follows the attendance in real time while the page is open. */
@Component({
  selector: 'app-turnout-page',
  imports: [DatePipe, DecimalPipe, PercentPipe, RouterLink],
  templateUrl: './turnout-page.html',
  styleUrl: './turnout-page.css',
  host: { class: 'page-content' },
})
export class TurnoutPage {
  private readonly attendance = inject(AttendanceService);
  private readonly realtime = inject(RealtimeService);
  protected readonly eventId = inject(ActivatedRoute).snapshot.paramMap.get('eventId') ?? '';
  protected readonly eventName = injectEventName(this.eventId);
  protected readonly pollSeconds = TURNOUT_POLL_MS / 1000;

  /** Whether the real-time stream is connected; if not, the page polls. */
  protected readonly live = signal(false);
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
    // Each check-in is pushed over a stream; while it is not connected the page asks every few
    // seconds instead. `reload` makes both requests run again once the stream (re)connects, to
    // pick up whatever happened meanwhile. switchMap drops a slow request when the next one
    // arrives, and takeUntilDestroyed closes everything when the user leaves the page.
    const reload = new Subject<void>();
    const ticks = timer(0, TURNOUT_POLL_MS).pipe(filter(() => !this.live()));

    // The list is only fetched while its tab is open.
    merge(ticks, reload, toObservable(this.tab))
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

    merge(ticks, reload)
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
      .subscribe((summary) => this.showSummary(summary));

    this.realtime
      .watch(`/api/events/${encodeURIComponent(this.eventId)}/attendance/stream`, [
        'summary',
        'entered',
      ])
      .pipe(takeUntilDestroyed())
      .subscribe((message) => {
        if (message.kind !== 'event') {
          this.live.set(message.kind === 'open');
          if (message.kind === 'open') {
            reload.next();
          }
        } else if (message.name === 'summary') {
          this.showSummary(message.data as AttendanceSummaryDto);
        } else {
          this.addEntered(message.data as EventRegistrationDto);
        }
      });
  }

  private showSummary(summary: AttendanceSummaryDto): void {
    this.summary.set(summary);
    this.updatedAt.set(new Date());
    this.errorMessage.set(null);
  }

  /** Someone just checked in: they go into the list without asking for all of it again. */
  private addEntered(row: EventRegistrationDto): void {
    this.registrations.update((rows) =>
      rows ? [...rows.filter((r) => r.registrationId !== row.registrationId), row] : rows,
    );
  }
}
