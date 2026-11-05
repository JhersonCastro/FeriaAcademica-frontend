import { CertificateDto, CertificateKind } from '../models/certificate';
import { EventReportDto } from '../models/report';

export const CERTIFICATE_KIND_LABELS: Record<CertificateKind, string> = {
  Participation: 'Participación',
  Attendance: 'Asistencia',
};

/** Why a certificate the person already qualifies for cannot be downloaded yet (HU-061). */
export const CERTIFICATE_PENDING = 'Disponible cuando la organización cierre la feria.';

/** One row per event and type: the backend never returns two of the same. */
export function certificateKey(certificate: Pick<CertificateDto, 'eventId' | 'type'>): string {
  return `${certificate.eventId}:${certificate.type}`;
}

/** Whole percentage of registered people who checked in; 0 when nobody registered. */
export function attendanceRate(report: Pick<EventReportDto, 'registered' | 'attended'>): number {
  return report.registered > 0 ? Math.round((report.attended / report.registered) * 100) : 0;
}

/** Share of received works with each outcome, for the bar under the totals. */
export function workShares(
  report: Pick<
    EventReportDto,
    'worksReceived' | 'worksApproved' | 'worksRejected' | 'worksInProgress'
  >,
): { approved: number; rejected: number; inProgress: number } {
  const total = report.worksReceived;
  if (total <= 0) {
    return { approved: 0, rejected: 0, inProgress: 0 };
  }
  const pct = (value: number) => (value / total) * 100;
  return {
    approved: pct(report.worksApproved),
    rejected: pct(report.worksRejected),
    inProgress: pct(report.worksInProgress),
  };
}

/** Available certificates first; within each group by event name, attendance before participation. */
export function sortCertificates(certificates: readonly CertificateDto[]): CertificateDto[] {
  return [...certificates].sort((a, b) => {
    if (a.available !== b.available) {
      return a.available ? -1 : 1;
    }
    return a.eventName.localeCompare(b.eventName, 'es') || a.type.localeCompare(b.type);
  });
}

/** `informe-fiet-2026.pdf`, `certificado-asistencia-fiet-2026.pdf`. */
export function pdfFileName(...parts: string[]): string {
  return `${parts.map(slug).filter(Boolean).join('-')}.pdf`;
}

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Hands a downloaded file to the browser with the given name. */
export function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
