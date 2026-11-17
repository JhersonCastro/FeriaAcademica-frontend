import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** `GET /api/institutions`: an organization that hosts fairs, such as a university. */
export interface InstitutionDto {
  id: string;
  name: string;
  /** Up to 30 characters; `null` when it has none. */
  acronym: string | null;
  /** A deactivated institution cannot get new fairs; the ones it already has are kept. */
  isActive: boolean;
  /** Fairs created in the institution, whatever their status. */
  eventCount: number;
}

/** `POST /api/institutions` and `PUT /api/institutions/{id}` (super admin). */
export interface InstitutionRequest {
  /** Required, at most 200 characters, unique (case-insensitive). */
  name: string;
  /** Optional, at most 30 characters. */
  acronym: string | null;
}

@Injectable({ providedIn: 'root' })
export class InstitutionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/institutions`;

  /** Super admin: every institution, active or not, ordered by name. */
  list(): Observable<InstitutionDto[]> {
    return this.http.get<InstitutionDto[]>(this.baseUrl);
  }

  /** Super admin: the backend answers 201 with the id of the new (active) institution. */
  create(request: InstitutionRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.baseUrl, request);
  }

  update(id: string, request: InstitutionRequest): Observable<void> {
    return this.http.put<void>(this.institutionUrl(id), request);
  }

  activate(id: string): Observable<void> {
    return this.http.post<void>(`${this.institutionUrl(id)}/activate`, null);
  }

  deactivate(id: string): Observable<void> {
    return this.http.post<void>(`${this.institutionUrl(id)}/deactivate`, null);
  }

  private institutionUrl(id: string): string {
    return `${this.baseUrl}/${encodeURIComponent(id)}`;
  }
}
