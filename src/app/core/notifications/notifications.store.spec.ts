import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NotificationDto } from '../models/notification';
import { Observable } from 'rxjs';
import { RealtimeMessage, RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from './notifications.service';
import { NOTIFICATIONS_POLL_MS, NotificationsStore } from './notifications.store';

function notification(id: string, isRead = false): NotificationDto {
  return { id, eventId: null, type: 'WorkReviewed', message: 'm', isRead, createdAt: '2026-11-20' };
}

describe('NotificationsStore', () => {
  let list: ReturnType<typeof vi.fn>;
  let push: (message: RealtimeMessage) => void;
  let store: NotificationsStore;

  beforeEach(() => {
    vi.useFakeTimers();
    list = vi.fn(() => of([notification('n1')]));
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { user: signal({ id: 'u1' }) } },
        { provide: NotificationsService, useValue: { list } },
        {
          provide: RealtimeService,
          useValue: {
            watch: () =>
              new Observable<RealtimeMessage>((subscriber) => {
                push = (message) => subscriber.next(message);
              }),
          },
        },
      ],
    });
    store = TestBed.inject(NotificationsStore);
    TestBed.tick();
  });

  afterEach(() => vi.useRealTimers());

  it('loads the list when there is a session', () => {
    expect(store.notifications().map((n) => n.id)).toEqual(['n1']);
    expect(store.loaded()).toBe(true);
  });

  it('puts a pushed notification first and announces it', () => {
    push({ kind: 'event', name: 'notification', data: notification('n2') });

    expect(store.notifications().map((n) => n.id)).toEqual(['n2', 'n1']);
    expect(store.incoming()?.id).toBe('n2');
    expect(store.unreadCount()).toBe(2);
  });

  it('ignores a pushed notification it already has', () => {
    push({ kind: 'event', name: 'notification', data: notification('n1') });

    expect(store.notifications()).toHaveLength(1);
    expect(store.incoming()).toBeNull();
  });

  it('polls only while the stream is not connected', () => {
    list.mockClear();
    vi.advanceTimersByTime(NOTIFICATIONS_POLL_MS);
    expect(list).toHaveBeenCalledTimes(1);

    push({ kind: 'open' });
    expect(list).toHaveBeenCalledTimes(2); // catches up on what it missed
    vi.advanceTimersByTime(NOTIFICATIONS_POLL_MS * 3);
    expect(list).toHaveBeenCalledTimes(2);

    push({ kind: 'down' });
    vi.advanceTimersByTime(NOTIFICATIONS_POLL_MS);
    expect(list).toHaveBeenCalledTimes(3);
  });
});
