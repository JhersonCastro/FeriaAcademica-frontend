import { CertificateDto } from '../models/certificate';
import {
  attendanceRate,
  buildReportHtml,
  certificateKey,
  escapeHtml,
  pdfFileName,
  reportNotes,
  sortCertificates,
} from './report-rules';

describe('attendanceRate (HU-031)', () => {
  it('rounds the share of registered people who checked in', () => {
    expect(attendanceRate({ registered: 120, entered: 87 })).toBe(73);
  });

  it('is 0 when nobody registered', () => {
    expect(attendanceRate({ registered: 0, entered: 0 })).toBe(0);
  });
});

describe('buildReportHtml and reportNotes (HU-031, HU-032)', () => {
  const content = {
    eventName: 'FIET 2026',
    generatedAt: new Date('2026-11-05T15:00:00Z'),
    figures: { registered: 184, entered: 131, pending: 53 },
    notes: 'La asistencia fue alta.\nSobre todo en la tarde.\n\nSe recomienda ampliar el aforo.',
  };

  it('prints the event, the attendance figures and the rate', () => {
    const html = buildReportHtml(content);
    expect(html).toContain('FIET 2026');
    expect(html).toContain('>184<');
    expect(html).toContain('>131<');
    expect(html).toContain('>53<');
    expect(html).toContain('71 %');
  });

  it('reads back the notes exactly as they were written', () => {
    expect(reportNotes(buildReportHtml(content))).toBe(content.notes);
  });

  it('keeps an empty report readable and gives back no notes', () => {
    const html = buildReportHtml({ ...content, notes: '  ' });
    expect(html).toContain('Sin observaciones.');
    expect(reportNotes(html)).toBe('');
  });

  it('never turns what the administrator types into markup', () => {
    const html = buildReportHtml({
      ...content,
      eventName: 'Feria <b>2026</b>',
      notes: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>2026');
    expect(reportNotes(html)).toBe('<img src=x onerror=alert(1)>');
  });

  it('shows the whole text of a report saved some other way', () => {
    expect(reportNotes('<h1>Informe</h1><p>Texto libre</p>')).toBe('Informe\n\nTexto libre');
  });

  it('escapes the five HTML special characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('sortCertificates (HU-061)', () => {
  const cert = (
    eventName: string,
    available: boolean,
    type: CertificateDto['type'] = 'Attendance',
  ): CertificateDto => ({
    eventId: eventName,
    eventName,
    type,
    workId: type === 'Participation' ? 'w1' : null,
    workTitle: type === 'Participation' ? 'Robot seguidor' : null,
    available,
    code: null,
  });

  it('lists the available ones first, then by event name', () => {
    const sorted = sortCertificates([
      cert('Feria de Emprendimiento 2026', false),
      cert('FIET 2026', true),
      cert('Expo Ingeniería 2025', true),
    ]);
    expect(sorted.map((c) => c.eventName)).toEqual([
      'Expo Ingeniería 2025',
      'FIET 2026',
      'Feria de Emprendimiento 2026',
    ]);
  });

  it('puts attendance before participation within the same event', () => {
    const sorted = sortCertificates([
      cert('FIET 2026', true, 'Participation'),
      cert('FIET 2026', true, 'Attendance'),
    ]);
    expect(sorted.map((c) => c.type)).toEqual(['Attendance', 'Participation']);
  });
});

describe('certificateKey (HU-061)', () => {
  it('tells apart the two certificates of the same event', () => {
    expect(certificateKey({ eventId: 'e1', type: 'Attendance' })).not.toBe(
      certificateKey({ eventId: 'e1', type: 'Participation' }),
    );
  });
});

describe('pdfFileName (HU-032)', () => {
  it('builds a safe file name without accents or spaces', () => {
    expect(pdfFileName('informe', 'FIET 2026')).toBe('informe-fiet-2026.pdf');
    expect(pdfFileName('certificado', 'Participación', 'Feria Académica · Popayán')).toBe(
      'certificado-participacion-feria-academica-popayan.pdf',
    );
  });
});
