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
  /** Seats for registrations; `null` means unlimited. */
  capacity: number | null;
  /** Registrations that were not cancelled. */
  registered: number;
  /** `null` when the event has no capacity. */
  availableSeats: number | null;
}

export type StageType =
  | 'Configuration'
  | 'Call'
  | 'Nomination'
  | 'Reception'
  | 'Admission'
  | 'Registration'
  | 'Evaluation'
  | 'Results'
  | 'Publication';

export interface StageSchedule {
  /** ISO 8601 instants. */
  startDate: string;
  endDate: string;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/events`;

  list(): Observable<EventSummary[]> {
    return this.http.get<EventSummary[]>(this.baseUrl);
  }

  /** Super admin: opens a configured event to registrations. Needs at least one active stage. */
  publish(eventId: string): Observable<void> {
    return this.http.post<void>(`${this.eventUrl(eventId)}/publish`, null);
  }

  /** Super admin: ends the event; certificates become available and registrations stop. */
  close(eventId: string): Observable<void> {
    return this.http.post<void>(`${this.eventUrl(eventId)}/close`, null);
  }

  /** Super admin: `null` removes the limit; it cannot go below the people already registered. */
  setCapacity(eventId: string, capacity: number | null): Observable<void> {
    return this.http.put<void>(`${this.eventUrl(eventId)}/capacity`, { capacity });
  }

  /** Super admin: the end of the Reception stage is the submission deadline of the works. */
  scheduleStage(eventId: string, type: StageType, schedule: StageSchedule): Observable<void> {
    return this.http.put<void>(`${this.eventUrl(eventId)}/stages/${type}`, schedule);
  }

  private eventUrl(eventId: string): string {
    return `${this.baseUrl}/${encodeURIComponent(eventId)}`;
  }
}
