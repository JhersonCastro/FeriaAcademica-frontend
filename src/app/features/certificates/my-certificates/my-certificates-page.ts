import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { CertificateDto } from '../../../core/models/certificate';
import {
  CERTIFICATE_CONDITION,
  CERTIFICATE_KIND_LABELS,
  pdfFileName,
  saveFile,
  sortCertificates,
} from '../../../core/reports/report-rules';
import { CertificatesService } from '../../../core/reports/reports.service';

/**
 * HU-061: the signed-in person downloads only their own certificates, and only once the
 * condition is met (attended or participated); otherwise the row says what is missing.
 */
@Component({
  selector: 'app-my-certificates-page',
  imports: [DatePipe],
  templateUrl: './my-certificates-page.html',
  host: { class: 'page-content' },
})
export class MyCertificatesPage {
  private readonly certificatesApi = inject(CertificatesService);

  protected readonly user = inject(AuthService).user;
  protected readonly today = new Date();
  protected readonly kindLabels = CERTIFICATE_KIND_LABELS;
  protected readonly conditions = CERTIFICATE_CONDITION;

  protected readonly certificates = signal<CertificateDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly downloadingId = signal<string | null>(null);
  protected readonly downloadError = signal<string | null>(null);

  constructor() {
    this.certificatesApi.mine().subscribe({
      next: (certificates) => {
        this.certificates.set(sortCertificates(certificates));
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected download(certificate: CertificateDto): void {
    this.downloadingId.set(certificate.id);
    this.downloadError.set(null);
    this.certificatesApi.pdf(certificate.id).subscribe({
      next: (pdf) => {
        this.downloadingId.set(null);
        saveFile(
          pdf,
          pdfFileName('certificado', this.kindLabels[certificate.kind], certificate.eventName),
        );
      },
      error: () => {
        this.downloadingId.set(null);
        this.downloadError.set(
          'No pudimos descargar el certificado. Si el problema sigue, escribe a la organización de la feria.',
        );
      },
    });
  }
}
