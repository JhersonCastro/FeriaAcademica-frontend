import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { forkJoin } from 'rxjs';
import { apiErrorMessage } from '../api/api-error';
import { AuthService } from '../auth/auth.service';
import { NotificationDto } from '../models/notification';
import { NotificationsService } from './notifications.service';

/** How often the signed-in area asks the backend for new notifications. */
export const NOTIFICATIONS_POLL_MS = 30_000;

/**
 * The signed-in user's notifications. The backend has no push channel, so while there is a
 * session the list is refreshed on an interval; a notification that was not there before shows
 * up as `incoming` so the shell can announce it without a page reload.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly api = inject(NotificationsService);
  private readonly auth = inject(AuthService);

  readonly notifications = signal<NotificationDto[]>([]);
  readonly loaded = signal(false);
  readonly errorMessage = signal<string | null>(null);
  /** The newest notification that arrived while the user was already signed in. */
  readonly incoming = signal<NotificationDto | null>(null);

  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.isRead).length);

  constructor() {
    effect((onCleanup) => {
      if (!this.auth.user()) {
        this.notifications.set([]);
        this.loaded.set(false);
        this.incoming.set(null);
        return;
      }
      untracked(() => this.refresh());
      const timer = setInterval(() => this.refresh(), NOTIFICATIONS_POLL_MS);
      onCleanup(() => clearInterval(timer));
    });
  }

  refresh(): void {
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }
    this.api.list().subscribe({
      next: (notifications) => {
        const known = new Set(this.notifications().map((n) => n.id));
        const arrived = this.loaded()
          ? notifications.find((n) => !n.isRead && !known.has(n.id))
          : undefined;
        this.notifications.set(notifications);
        this.loaded.set(true);
        this.errorMessage.set(null);
        if (arrived) {
          this.incoming.set(arrived);
        }
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.loaded.set(true);
      },
    });
  }

  markAsRead(id: string): void {
    this.setRead([id]);
    this.api.markAsRead(id).subscribe({ error: () => this.refreshNow() });
  }

  markAllAsRead(): void {
    const ids = this.notifications()
      .filter((n) => !n.isRead)
      .map((n) => n.id);
    if (!ids.length) {
      return;
    }
    this.setRead(ids);
    forkJoin(ids.map((id) => this.api.markAsRead(id))).subscribe({
      error: () => this.refreshNow(),
    });
  }

  dismissIncoming(): void {
    this.incoming.set(null);
  }

  private setRead(ids: readonly string[]): void {
    this.notifications.update((list) =>
      list.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)),
    );
  }

  /** Reloads even when the tab is in the background (used to undo an optimistic update). */
  private refreshNow(): void {
    this.api.list().subscribe({ next: (list) => this.notifications.set(list) });
  }
}
