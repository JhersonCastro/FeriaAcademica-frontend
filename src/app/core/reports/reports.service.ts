import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CertificateDto } from '../models/certificate';
import { EventReportDto } from '../models/report';

/** HU-031 and HU-032: the consolidated event report, on screen and as a PDF. */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/events`;

  report(eventId: string): Observable<EventReportDto> {
    return this.http.get<EventReportDto>(`${this.reportUrl(eventId)}`);
  }

  /** Same figures as `report`, rendered by the backend as `application/pdf`. */
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

  /** 400 when the condition is not met: the backend checks it again, not only the screen. */
  pdf(certificateId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${encodeURIComponent(certificateId)}/pdf`, {
      responseType: 'blob',
    });
  }
}
