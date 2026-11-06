import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { describeNotification, notificationLink } from '../../core/notifications/notification-rules';
import { NotificationsStore } from '../../core/notifications/notifications.store';

/** HU-022: the notification centre; new ones arrive without reloading the page. */
@Component({
  selector: 'app-notifications-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.css',
  host: { class: 'page-content' },
})
export class NotificationsPage {
  protected readonly store = inject(NotificationsStore);
  protected readonly user = inject(AuthService).user;
  protected readonly today = new Date();

  protected readonly items = computed(() =>
    this.store.notifications().map((notification) => ({
      notification,
      view: describeNotification(notification),
      link: notificationLink(notification),
    })),
  );

  constructor() {
    this.store.refresh();
  }
}
