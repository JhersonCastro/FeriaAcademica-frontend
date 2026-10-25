import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toDataURL } from 'qrcode';
import { Subscription } from 'rxjs';
import { API_MESSAGES, apiErrorMessage, isApiMessage } from '../../../core/api/api-error';
import { AttendanceService } from '../../../core/attendance/attendance.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ActiveEventStore } from '../../../core/events/active-event.store';
import {
  EventSummary,
  EventsService,
  OPEN_EVENT_STATUSES,
} from '../../../core/events/events.service';
import { RegistrationDto } from '../../../core/models/attendance';

type ViewState = 'loading' | 'no-events' | 'not-registered' | 'registered' | 'error';

/** Rendered at twice the displayed size so it stays sharp on high-density phone screens. */
const QR_PIXELS = 480;

@Component({
  selector: 'app-my-qr-page',
  imports: [DatePipe],
  templateUrl: './my-qr-page.html',
  styleUrl: './my-qr-page.css',
  host: { class: 'page-content' },
})
export class MyQrPage {
  private readonly attendance = inject(AttendanceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly activeEvents = inject(ActiveEventStore);

  protected readonly user = inject(AuthService).user;
  protected readonly today = new Date();

  /** Only events that accept registrations (published or in progress). */
  protected readonly events = signal<EventSummary[]>([]);
  protected readonly selectedEventId = signal<string | null>(null);
  protected readonly selectedEvent = computed(
    () => this.events().find((event) => event.id === this.selectedEventId()) ?? null,
  );

  protected readonly state = signal<ViewState>('loading');
  protected readonly registration = signal<RegistrationDto | null>(null);
  protected readonly qrImage = signal<string | null>(null);
  protected readonly registering = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly downloadName = computed(
    () => `qr-${slug(this.selectedEvent()?.name ?? 'feria')}.png`,
  );

  private loading?: Subscription;

  constructor() {
    inject(EventsService)
      .list()
      .subscribe({
        next: (all) => {
          const open = all.filter((event) => OPEN_EVENT_STATUSES.includes(event.status));
          this.events.set(open);
          const preferred = [
            this.route.snapshot.queryParamMap.get('event'),
            this.activeEvents.activeEvent()?.eventId,
          ].find((id) => open.some((event) => event.id === id));
          const eventId = preferred ?? open[0]?.id;
          if (eventId) {
            this.select(eventId);
          } else {
            this.state.set('no-events');
          }
        },
        error: (error: unknown) => this.fail(error),
      });
  }

  protected onEventChange(event: Event): void {
    this.select((event.target as HTMLSelectElement).value);
  }

  protected register(): void {
    const eventId = this.selectedEventId();
    if (!eventId) {
      return;
    }
    this.registering.set(true);
    this.errorMessage.set(null);
    this.attendance.register(eventId).subscribe({
      next: (registration) => {
        this.registering.set(false);
        void this.show(registration);
      },
      error: (error: unknown) => {
        this.registering.set(false);
        this.errorMessage.set(apiErrorMessage(error));
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
    this.registration.set(null);
    this.qrImage.set(null);
    this.errorMessage.set(null);
    this.loading?.unsubscribe();
    this.loading = this.attendance.myRegistration(eventId).subscribe({
      next: (registration) => void this.show(registration),
      error: (error: unknown) => {
        if (isApiMessage(error, API_MESSAGES.notRegistered)) {
          this.state.set('not-registered');
        } else {
          this.fail(error);
        }
      },
    });
  }

  private async show(registration: RegistrationDto): Promise<void> {
    // The QR encodes the token exactly as received: that text is what the scanner sends back.
    const image = await toDataURL(registration.qrToken, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: QR_PIXELS,
      color: { dark: '#0f2041', light: '#ffffff' },
    });
    this.registration.set(registration);
    this.qrImage.set(image);
    this.state.set('registered');
  }

  private fail(error: unknown): void {
    this.state.set('error');
    this.errorMessage.set(apiErrorMessage(error));
  }
}

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
