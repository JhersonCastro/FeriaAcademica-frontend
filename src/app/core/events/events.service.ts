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
  /** End of the Reception stage: no work can be created, attached or submitted after it. */
  submissionDeadline: string | null;
}

/** `GET /api/events/{id}/participations/me`: what a new work is created under. */
export interface ParticipationDto {
  id: string;
  eventId: string;
  /** The professor whose invitation made the person a participant, if there was one. */
  invitedBy: string | null;
}

/** A person with the Teacher role in an event: the author picks the reviewer from them. */
export interface ProfessorDto {
  id: string;
  fullName: string;
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

/** `POST /api/events` (super admin): the event is born in configuration. */
export interface CreateEventRequest {
  institutionId: string;
  name: string;
  /** `null` leaves the seats unlimited. */
  capacity: number | null;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/events`;

  list(): Observable<EventSummary[]> {
    return this.http.get<EventSummary[]>(this.baseUrl);
  }

  /** Super admin: creates an event in configuration; the backend answers with its id. */
  create(request: CreateEventRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.baseUrl, request);
  }

  /** 404 when the signed-in person has no participation in the event. */
  myParticipation(eventId: string): Observable<ParticipationDto> {
    return this.http.get<ParticipationDto>(`${this.eventUrl(eventId)}/participations/me`);
  }

  professors(eventId: string): Observable<ProfessorDto[]> {
    return this.http.get<ProfessorDto[]>(`${this.eventUrl(eventId)}/professors`);
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
