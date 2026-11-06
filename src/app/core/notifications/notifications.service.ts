import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationDto } from '../models/notification';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/notifications`;

  /** The signed-in user's notifications, newest first as the backend returns them. */
  list(unreadOnly = false): Observable<NotificationDto[]> {
    const params = new HttpParams().set('unreadOnly', unreadOnly);
    return this.http.get<NotificationDto[]>(this.baseUrl, { params });
  }

  markAsRead(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${encodeURIComponent(id)}/read`, null);
  }
}
