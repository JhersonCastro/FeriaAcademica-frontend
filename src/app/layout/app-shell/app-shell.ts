import { Component, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ActiveEventStore } from '../../core/events/active-event.store';
import { EVENT_ROLE_LABELS, roleLabel } from '../../core/models/labels';
import { EventRole } from '../../core/models/user';
import { describeNotification } from '../../core/notifications/notification-rules';
import { NotificationsStore } from '../../core/notifications/notifications.store';

/** How long the "new notification" notice stays on screen. */
const TOAST_MS = 8000;

/** Signed-in area: institutional sidebar, top bar with the user menu, and the page content. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
  host: {
    '(document:keydown.escape)': 'closeMenus()',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class AppShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly activeEvents = inject(ActiveEventStore);

  private readonly notifications = inject(NotificationsStore);

  protected readonly user = this.auth.user;
  protected readonly isSuperAdmin = this.auth.isSuperAdmin;
  protected readonly unreadCount = this.notifications.unreadCount;
  protected readonly incoming = this.notifications.incoming;
  protected readonly arrivedView = describeNotification;
  protected readonly navOpen = signal(false);
  protected readonly userMenuOpen = signal(false);

  protected readonly initials = computed(() =>
    (this.user()?.fullName ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );

  /** Roles held in the active event, e.g. "Profesor + Jurado" (as in the design's top bar). */
  protected readonly roleSummary = computed(() => {
    const roles = (this.activeEvents.activeEvent()?.roles ?? []).map(
      (role) => EVENT_ROLE_LABELS[role],
    );
    return (this.isSuperAdmin() ? [roleLabel('SuperAdmin'), ...roles] : roles).join(' + ');
  });

  protected readonly inviteLink = computed(() => {
    const event = this.activeEvents.activeEvent();
    return event?.roles.includes('Teacher')
      ? ['/events', event.eventId, 'invitations', 'new']
      : null;
  });

  /** HU-023: the active event's evaluation questions, for its coordinators and teachers. */
  protected readonly evaluationLink = computed(() => {
    const event = this.activeEvents.activeEvent();
    return event && this.auth.canManageEvaluation(event.eventId)
      ? ['/events', event.eventId, 'evaluation']
      : null;
  });

  /** Check-in and turnout links for the active event, when the user is staff there. */
  protected readonly attendanceLinks = computed(() => {
    const event = this.activeEvents.activeEvent();
    if (!event || !this.auth.canTakeAttendance(event.eventId)) {
      return null;
    }
    const base = ['/events', event.eventId, 'attendance'];
    return { scan: [...base, 'scan'], turnout: base };
  });

  /** Works are not tied to the active event: show the links when the role exists in any event. */
  protected hasRole(role: EventRole): boolean {
    return this.auth.hasRoleInAnyEvent(role);
  }

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMenus());

    effect((onCleanup) => {
      if (this.incoming()) {
        const timer = setTimeout(() => this.dismissIncoming(), TOAST_MS);
        onCleanup(() => clearTimeout(timer));
      }
    });
  }

  protected dismissIncoming(): void {
    this.notifications.dismissIncoming();
  }

  protected selectEvent(event: Event): void {
    this.activeEvents.select((event.target as HTMLSelectElement).value);
  }

  protected logout(): void {
    const goToLogin = () => void this.router.navigateByUrl('/login');
    this.auth.logout().subscribe({ complete: goToLogin, error: goToLogin });
  }

  protected closeMenus(): void {
    this.navOpen.set(false);
    this.userMenuOpen.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    const menu = this.host.nativeElement.querySelector('.user-menu');
    if (this.userMenuOpen() && menu && !menu.contains(event.target as Node)) {
      this.userMenuOpen.set(false);
    }
  }
}
