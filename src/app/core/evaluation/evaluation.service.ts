import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EvaluationAnswer,
  EventEvaluationDto,
  MyWorkAnswersDto,
  PendingEvaluationDto,
  SaveEvaluationQuestion,
} from '../models/evaluation';

/**
 * HU-023: the evaluation questions a fair defines (optional, editable until people answer) and
 * the answers of those who attended, per work, once the fair is closed.
 */
@Injectable({ providedIn: 'root' })
export class EvaluationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api`;

  /** Super admin, coordinator or teacher of the fair. A fair without questions answers `[]`. */
  get(eventId: string): Observable<EventEvaluationDto> {
    return this.http.get<EventEvaluationDto>(this.evaluationUrl(eventId));
  }

  /** Replaces the whole list; the array order is the question order. */
  save(eventId: string, questions: SaveEvaluationQuestion[]): Observable<void> {
    return this.http.put<void>(this.evaluationUrl(eventId), { questions });
  }

  pending(): Observable<PendingEvaluationDto[]> {
    return this.http.get<PendingEvaluationDto[]>(`${this.apiUrl}/evaluations/pending`);
  }

  myAnswers(eventId: string, workId: string): Observable<MyWorkAnswersDto> {
    return this.http.get<MyWorkAnswersDto>(this.answersUrl(eventId, workId));
  }

  /** Replaces the person's previous answers for that work. */
  saveAnswers(eventId: string, workId: string, answers: EvaluationAnswer[]): Observable<void> {
    return this.http.put<void>(this.answersUrl(eventId, workId), { answers });
  }

  private evaluationUrl(eventId: string): string {
    return `${this.apiUrl}/events/${encodeURIComponent(eventId)}/evaluation`;
  }

  private answersUrl(eventId: string, workId: string): string {
    return `${this.evaluationUrl(eventId)}/works/${encodeURIComponent(workId)}/answers/me`;
  }
}
