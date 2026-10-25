import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EventStatus =
  | 'Configuration'
  | 'Published'
  | 'InProgress'
  | 'Closed'
  | 'Archived'
  | 'Cancelled';

/** Only these accept registrations and attendance. */
export const OPEN_EVENT_STATUSES: readonly EventStatus[] = ['Published', 'InProgress'];

export interface EventSummary {
  id: string;
  institutionId: string;
  name: string;
  status: EventStatus;
  startDate: string | null;
  endDate: string | null;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/events`;

  list(): Observable<EventSummary[]> {
    return this.http.get<EventSummary[]>(this.baseUrl);
  }
}
