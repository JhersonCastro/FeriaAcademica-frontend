import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { CertificateDto } from '../../../core/models/certificate';
import {
  CERTIFICATE_KIND_LABELS,
  CERTIFICATE_PENDING,
  certificateKey,
  pdfFileName,
  saveFile,
  sortCertificates,
} from '../../../core/reports/report-rules';
import { CertificatesService } from '../../../core/reports/reports.service';

/**
 * HU-061: the signed-in person sees only their own certificates and downloads them once the
 * event has finished; before that the row says so.
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
  protected readonly pendingText = CERTIFICATE_PENDING;
  protected readonly key = certificateKey;

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
    this.downloadingId.set(certificateKey(certificate));
    this.downloadError.set(null);
    this.certificatesApi.pdf(certificate.eventId, certificate.type).subscribe({
      next: (pdf) => {
        this.downloadingId.set(null);
        saveFile(
          pdf,
          pdfFileName('certificado', this.kindLabels[certificate.type], certificate.eventName),
        );
        // The first download issues the code: read the list again so the row shows it.
        if (!certificate.code) {
          this.certificatesApi.mine().subscribe({
            next: (certificates) => this.certificates.set(sortCertificates(certificates)),
          });
        }
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
