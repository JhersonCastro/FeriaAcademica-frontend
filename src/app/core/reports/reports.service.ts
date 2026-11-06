import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CertificateDto, CertificateKind } from '../models/certificate';
import { EventSummaryDto, SavedEventReportDto } from '../models/report';

/** HU-031 and HU-032: the event report the administrator saves, and its PDF. Super admin only. */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/events`;

  /** 404 while no report has been saved for the event. */
  report(eventId: string): Observable<SavedEventReportDto> {
    return this.http.get<SavedEventReportDto>(this.reportUrl(eventId));
  }

  /** Creates the report or replaces it. */
  save(eventId: string, html: string): Observable<void> {
    return this.http.put<void>(this.reportUrl(eventId), { html });
  }

  /** The event's consolidated figures, calculated when asked for. */
  summary(eventId: string): Observable<EventSummaryDto> {
    return this.http.get<EventSummaryDto>(`${this.reportUrl(eventId)}/summary`);
  }

  /** The saved report rendered by the backend as `application/pdf`. */
  reportPdf(eventId: string): Observable<Blob> {
    return this.http.get(`${this.reportUrl(eventId)}/pdf`, { responseType: 'blob' });
  }

  private reportUrl(eventId: string): string {
    return `${this.baseUrl}/${encodeURIComponent(eventId)}/report`;
  }
}

/** HU-061: the signed-in person's certificates and their PDF. */
@Injectable({ providedIn: 'root' })
export class CertificatesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/certificates`;

  mine(): Observable<CertificateDto[]> {
    return this.http.get<CertificateDto[]>(`${this.baseUrl}/mine`);
  }

  /**
   * The certificate of one type for one event. The backend checks the condition again (event
   * finished, attended or final version delivered) and issues the code on the first download.
   */
  pdf(eventId: string, type: CertificateKind): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/events/${encodeURIComponent(eventId)}/${encodeURIComponent(type)}/pdf`,
      { responseType: 'blob' },
    );
  }
}
