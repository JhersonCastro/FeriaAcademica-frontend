import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { EventSummary, EventsService } from '../../../core/events/events.service';
import { EventReportDto } from '../../../core/models/report';
import {
  attendanceRate,
  pdfFileName,
  saveFile,
  workShares,
} from '../../../core/reports/report-rules';
import { ReportsService } from '../../../core/reports/reports.service';

type ViewState = 'loading' | 'no-events' | 'ready' | 'error';

/**
 * HU-031: consolidated report of one event (works received, approved and rejected; registered
 * and attended), computed when it is requested. HU-032: the same report as a PDF.
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
  protected readonly report = signal<EventReportDto | null>(null);
  protected readonly generating = signal(false);
  protected readonly downloading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly downloadError = signal<string | null>(null);

  protected readonly rate = computed(() => {
    const report = this.report();
    return report ? attendanceRate(report) : 0;
  });
  protected readonly shares = computed(() => {
    const report = this.report();
    return report ? workShares(report) : { approved: 0, rejected: 0, inProgress: 0 };
  });

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

  /** Asks the backend again: the figures are computed at request time (HU-031 criterion 3). */
  protected generate(): void {
    const eventId = this.selectedEventId();
    if (!eventId) {
      return;
    }
    this.generating.set(true);
    this.errorMessage.set(null);
    this.loading?.unsubscribe();
    this.loading = this.reports.report(eventId).subscribe({
      next: (report) => {
        this.report.set(report);
        this.generating.set(false);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        this.generating.set(false);
        this.report.set(null);
        this.errorMessage.set(apiErrorMessage(error));
        this.state.set('error');
      },
    });
  }

  protected downloadPdf(): void {
    const report = this.report();
    if (!report) {
      return;
    }
    this.downloading.set(true);
    this.downloadError.set(null);
    this.reports.reportPdf(report.eventId).subscribe({
      next: (pdf) => {
        this.downloading.set(false);
        saveFile(pdf, pdfFileName('informe', report.eventName));
      },
      error: () => {
        this.downloading.set(false);
        this.downloadError.set('No pudimos generar el PDF. Intenta de nuevo en un momento.');
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
    this.report.set(null);
    this.generate();
  }
}
