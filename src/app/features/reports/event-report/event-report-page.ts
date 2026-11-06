import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, catchError, forkJoin, map, of, throwError } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AttendanceService } from '../../../core/attendance/attendance.service';
import { AuthService } from '../../../core/auth/auth.service';
import { EventSummary, EventsService } from '../../../core/events/events.service';
import { ReportFigures, SavedEventReportDto, WorkFigures } from '../../../core/models/report';
import {
  WORK_FIGURE_ROWS,
  attendanceRate,
  buildReportHtml,
  pdfFileName,
  reportNotes,
  saveFile,
  sameWorkFigures,
} from '../../../core/reports/report-rules';
import { ReportsService } from '../../../core/reports/reports.service';

type ViewState = 'loading' | 'no-events' | 'ready' | 'error';

/**
 * HU-031: the event report with the attendance figures computed now, plus the administrator's
 * observations. Saving stores it in the backend; HU-032: the PDF is exactly what was saved.
 * The works figures come from `report/summary`; if that call fails the report keeps working with
 * the attendance figures only.
 */
@Component({
  selector: 'app-event-report-page',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './event-report-page.html',
  styleUrl: './event-report-page.css',
  host: { class: 'page-content' },
})
export class EventReportPage {
  private readonly reports = inject(ReportsService);
  private readonly attendance = inject(AttendanceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly user = inject(AuthService).user;
  protected readonly today = new Date();

  protected readonly events = signal<EventSummary[]>([]);
  protected readonly selectedEventId = signal<string | null>(null);
  protected readonly selectedEvent = computed(
    () => this.events().find((event) => event.id === this.selectedEventId()) ?? null,
  );

  protected readonly state = signal<ViewState>('loading');
  protected readonly figures = signal<ReportFigures | null>(null);
  protected readonly works = signal<WorkFigures | null>(null);
  protected readonly workRows = WORK_FIGURE_ROWS;
  protected readonly figuresAt = signal<Date | null>(null);
  protected readonly lastEntryAt = signal<string | null>(null);
  protected readonly saved = signal<SavedEventReportDto | null>(null);
  protected readonly notes = signal('');
  private readonly savedNotes = signal('');

  protected readonly refreshing = signal(false);
  protected readonly saving = signal(false);
  protected readonly downloading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly savedMessage = signal<string | null>(null);

  protected readonly rate = computed(() => {
    const figures = this.figures();
    return figures ? attendanceRate(figures) : 0;
  });
  /** New figures after "Actualizar cifras" that the saved report does not have yet. */
  private readonly figuresChanged = signal(false);
  /** Unsaved changes: the PDF is the saved version, so they must be saved first. */
  protected readonly dirty = computed(
    () => !this.saved() || this.figuresChanged() || this.notes() !== this.savedNotes(),
  );

  private loading?: Subscription;

  constructor() {
    inject(EventsService)
      .list()
      .subscribe({
        next: (events) => {
          this.events.set(events);
          const fromUrl = this.route.snapshot.queryParamMap.get('event');
          const eventId = events.some((event) => event.id === fromUrl) ? fromUrl : events[0]?.id;
          if (eventId) {
            this.select(eventId);
          } else {
            this.state.set('no-events');
          }
        },
        error: (error: unknown) => {
          this.errorMessage.set(apiErrorMessage(error));
          this.state.set('error');
        },
      });
  }

  protected onEventChange(event: Event): void {
    this.select((event.target as HTMLSelectElement).value);
  }

  protected onNotesInput(event: Event): void {
    this.notes.set((event.target as HTMLTextAreaElement).value);
    this.savedMessage.set(null);
  }

  /** Reads the figures again: they are computed when they are requested (HU-031 criterion 3). */
  protected refresh(): void {
    const eventId = this.selectedEventId();
    if (!eventId) {
      return;
    }
    this.refreshing.set(true);
    this.actionError.set(null);
    forkJoin({
      summary: this.attendance.summary(eventId),
      works: this.worksFigures(eventId),
    }).subscribe({
      next: ({ summary, works }) => {
        const before = this.figures();
        if (
          before &&
          (before.registered !== summary.registered ||
            before.entered !== summary.entered ||
            before.pending !== summary.pending ||
            !sameWorkFigures(this.works(), works))
        ) {
          this.figuresChanged.set(true);
          this.savedMessage.set(null);
        }
        this.setFigures(summary);
        this.works.set(works);
        this.refreshing.set(false);
      },
      error: (error: unknown) => {
        this.refreshing.set(false);
        this.actionError.set(apiErrorMessage(error));
      },
    });
  }

  /** Builds the report from the figures on screen and the notes, and stores it. */
  protected save(): void {
    const event = this.selectedEvent();
    const figures = this.figures();
    if (!event || !figures) {
      return;
    }
    const html = buildReportHtml({
      eventName: event.name,
      generatedAt: this.figuresAt() ?? new Date(),
      figures,
      works: this.works(),
      notes: this.notes(),
    });
    this.saving.set(true);
    this.actionError.set(null);
    this.savedMessage.set(null);
    this.reports.save(event.id, html).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set({
          eventId: event.id,
          eventName: event.name,
          html,
          updatedAt: new Date().toISOString(),
        });
        this.savedNotes.set(this.notes());
        this.figuresChanged.set(false);
        this.savedMessage.set('Informe guardado. El PDF ya tiene estas cifras y observaciones.');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.actionError.set(apiErrorMessage(error));
      },
    });
  }

  protected downloadPdf(): void {
    const event = this.selectedEvent();
    if (!event || !this.saved()) {
      return;
    }
    this.downloading.set(true);
    this.actionError.set(null);
    this.reports.reportPdf(event.id).subscribe({
      next: (pdf) => {
        this.downloading.set(false);
        saveFile(pdf, pdfFileName('informe', event.name));
      },
      error: () => {
        this.downloading.set(false);
        this.actionError.set('No pudimos generar el PDF. Intenta de nuevo en un momento.');
      },
    });
  }

  private select(eventId: string): void {
    this.selectedEventId.set(eventId);
    if (this.route.snapshot.queryParamMap.get('event') !== eventId) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { event: eventId },
        replaceUrl: true,
      });
    }

    this.state.set('loading');
    this.figures.set(null);
    this.works.set(null);
    this.saved.set(null);
    this.notes.set('');
    this.savedNotes.set('');
    this.figuresChanged.set(false);
    this.errorMessage.set(null);
    this.actionError.set(null);
    this.savedMessage.set(null);
    this.loading?.unsubscribe();
    this.loading = forkJoin({
      summary: this.attendance.summary(eventId),
      works: this.worksFigures(eventId),
      // No report saved yet answers 404: that is an empty report, not an error.
      report: this.reports
        .report(eventId)
        .pipe(
          catchError((error: unknown) =>
            error instanceof HttpErrorResponse && error.status === 404
              ? of(null)
              : throwError(() => error),
          ),
        ),
    }).subscribe({
      next: ({ summary, works, report }) => {
        this.setFigures(summary);
        this.works.set(works);
        this.saved.set(report);
        const notes = report ? reportNotes(report.html) : '';
        this.notes.set(notes);
        this.savedNotes.set(notes);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.state.set('error');
      },
    });
  }

  /** `null` when the backend cannot provide them: the page still works with attendance only. */
  private worksFigures(eventId: string): Observable<WorkFigures | null> {
    return this.reports.summary(eventId).pipe(
      map((summary) => ({
        worksReceived: summary.worksReceived,
        worksApproved: summary.worksApproved,
        worksRejected: summary.worksRejected,
        worksInReview: summary.worksInReview,
        worksReturnedForChanges: summary.worksReturnedForChanges,
        worksWithdrawn: summary.worksWithdrawn,
      })),
      catchError(() => of(null)),
    );
  }

  private setFigures(summary: ReportFigures & { lastEntryAt: string | null }): void {
    this.figures.set({
      registered: summary.registered,
      entered: summary.entered,
      pending: summary.pending,
    });
    this.lastEntryAt.set(summary.lastEntryAt);
    this.figuresAt.set(new Date());
  }
}
