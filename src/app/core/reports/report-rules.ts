import { CertificateDto, CertificateKind } from '../models/certificate';
import { ReportFigures } from '../models/report';

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
export function attendanceRate(figures: Pick<ReportFigures, 'registered' | 'entered'>): number {
  return figures.registered > 0 ? Math.round((figures.entered / figures.registered) * 100) : 0;
}

/** Text that is safe to place inside HTML. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ReportContent {
  eventName: string;
  generatedAt: Date;
  figures: ReportFigures;
  /** What the administrator wrote; blank lines separate paragraphs. */
  notes: string;
}

const NUMBER = new Intl.NumberFormat('es-CO');
const DATE_TIME = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' });
const CELL = 'padding:6px 8px;border-bottom:1px solid #d9dee7;';

/**
 * HU-031/HU-032: the report the backend stores and turns into the PDF. Built only from escaped
 * text, so nothing the administrator types can become markup. The notes go inside
 * `data-notes` so `reportNotes` can read them back into the text box.
 */
export function buildReportHtml(content: ReportContent): string {
  const { figures } = content;
  const rows: [string, string][] = [
    ['Inscritos', NUMBER.format(figures.registered)],
    ['Asistentes registrados con QR', NUMBER.format(figures.entered)],
    ['Inscritos que no ingresaron', NUMBER.format(figures.pending)],
    ['Porcentaje de asistencia', `${attendanceRate(figures)} %`],
  ];
  const paragraphs = content.notes
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 8px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`);

  return [
    '<div style="font-family:Arial,sans-serif;color:#0f2041;font-size:12px;">',
    '<h1 style="font-size:22px;margin:0 0 4px;">Informe del evento</h1>',
    `<p style="font-size:15px;margin:0 0 2px;"><b>${escapeHtml(content.eventName)}</b></p>`,
    `<p style="color:#5b6478;margin:0 0 18px;">Cifras calculadas el ${escapeHtml(DATE_TIME.format(content.generatedAt))}</p>`,
    '<h2 style="font-size:15px;margin:0 0 6px;">Inscripciones y asistencia</h2>',
    '<table style="border-collapse:collapse;width:100%;margin:0 0 18px;">',
    `<tr><th style="${CELL}text-align:left;">Indicador</th><th style="${CELL}text-align:right;">Valor</th></tr>`,
    ...rows.map(
      ([label, value]) =>
        `<tr><td style="${CELL}">${label}</td><td style="${CELL}text-align:right;">${value}</td></tr>`,
    ),
    '</table>',
    '<h2 style="font-size:15px;margin:0 0 6px;">Observaciones</h2>',
    '<div data-notes="true">',
    paragraphs.length ? paragraphs.join('') : '<p data-empty="true">Sin observaciones.</p>',
    '</div>',
    '</div>',
  ].join('');
}

/**
 * The administrator's notes inside a saved report, as plain text for the text box. A report
 * saved some other way has no `data-notes` block: then its whole text is returned.
 */
export function reportNotes(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const block = doc.querySelector('[data-notes]');
  if (!block) {
    const parts = [...doc.body.querySelectorAll('h1, h2, h3, h4, p, li')]
      .map((el) => (el.textContent ?? '').trim())
      .filter(Boolean);
    return parts.length ? parts.join('\n\n') : (doc.body.textContent ?? '').trim();
  }
  return [...block.querySelectorAll('p:not([data-empty])')]
    .map((p) => {
      p.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
      return (p.textContent ?? '').trim();
    })
    .filter(Boolean)
    .join('\n\n');
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
