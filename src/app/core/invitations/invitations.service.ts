import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AcceptInvitationRequest,
  CreateInvitationRequest,
  InvitationDetails,
} from '../models/invitation';
import { CreatedResource } from '../models/user';

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api`;

  get(token: string): Observable<InvitationDetails> {
    return this.http.get<InvitationDetails>(
      `${this.baseUrl}/invitations/${encodeURIComponent(token)}`,
    );
  }

  /** New account: send name and password. Existing account: send nothing, the session identifies it. */
  accept(token: string, request: AcceptInvitationRequest | null = null): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/invitations/${encodeURIComponent(token)}/accept`,
      request ?? {},
    );
  }

  create(eventId: string, request: CreateInvitationRequest): Observable<CreatedResource> {
    return this.http.post<CreatedResource>(
      `${this.baseUrl}/events/${encodeURIComponent(eventId)}/invitations`,
      request,
    );
  }
}
