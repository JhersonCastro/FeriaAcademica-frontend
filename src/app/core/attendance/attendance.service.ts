import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AttendanceSummaryDto, RegistrationDto, ScanResultDto } from '../models/attendance';

/** Event registration with a personal QR, and QR check-in at the door. */
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/events`;

  /** Registers the signed-in user. Idempotent: calling it again returns the same QR. */
  register(eventId: string): Observable<RegistrationDto> {
    return this.http.post<RegistrationDto>(`${this.eventUrl(eventId)}/registrations`, null);
  }

  /** 400 "You are not registered for this event." when there is no registration yet. */
  myRegistration(eventId: string): Observable<RegistrationDto> {
    return this.http.get<RegistrationDto>(`${this.eventUrl(eventId)}/registrations/me`);
  }

  /** Always 200 with Valid, AlreadyEntered or Invalid; resending the same QR never duplicates. */
  scan(eventId: string, qrToken: string): Observable<ScanResultDto> {
    return this.http.post<ScanResultDto>(`${this.eventUrl(eventId)}/attendance/scan`, {
      qrToken,
    });
  }

  summary(eventId: string): Observable<AttendanceSummaryDto> {
    return this.http.get<AttendanceSummaryDto>(`${this.eventUrl(eventId)}/attendance/summary`);
  }

  private eventUrl(eventId: string): string {
    return `${this.baseUrl}/${encodeURIComponent(eventId)}`;
  }
}
