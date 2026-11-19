import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { forkJoin } from 'rxjs';
import { apiErrorMessage } from '../api/api-error';
import { AuthService } from '../auth/auth.service';
import { NotificationDto } from '../models/notification';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from './notifications.service';

/** How often the signed-in area asks for new notifications while the live stream is down. */
export const NOTIFICATIONS_POLL_MS = 30_000;

/**
 * The signed-in user's notifications. While there is a session the backend pushes each new one
 * over a stream (SSE); if the stream is not connected the list is refreshed on an interval
 * instead. A notification that was not there before shows up as `incoming` so the shell can
 * announce it without a page reload.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly api = inject(NotificationsService);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);
  private readonly live = signal(false);

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
      const timer = setInterval(() => {
        if (!this.live()) {
          this.refresh();
        }
      }, NOTIFICATIONS_POLL_MS);
      const stream = this.realtime
        .watch('/api/notifications/stream', ['notification'])
        .subscribe((message) => {
          if (message.kind === 'event') {
            this.receive(message.data as NotificationDto);
            return;
          }
          this.live.set(message.kind === 'open');
          if (message.kind === 'open') {
            // Whatever arrived while the stream was not connected.
            this.refresh();
          }
        });
      onCleanup(() => {
        clearInterval(timer);
        stream.unsubscribe();
        this.live.set(false);
      });
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

  /** A notification pushed by the backend; one already known (or malformed) is ignored. */
  private receive(notification: NotificationDto): void {
    if (!notification?.id || this.notifications().some((n) => n.id === notification.id)) {
      return;
    }
    this.notifications.update((list) => [notification, ...list]);
    if (this.loaded() && !notification.isRead) {
      this.incoming.set(notification);
    }
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
