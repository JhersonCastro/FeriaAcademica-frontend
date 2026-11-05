import { CertificateDto } from '../models/certificate';
import {
  attendanceRate,
  certificateKey,
  pdfFileName,
  sortCertificates,
  workShares,
} from './report-rules';

describe('attendanceRate (HU-031)', () => {
  it('rounds the share of registered people who checked in', () => {
    expect(attendanceRate({ registered: 120, attended: 87 })).toBe(73);
  });

  it('is 0 when nobody registered', () => {
    expect(attendanceRate({ registered: 0, attended: 0 })).toBe(0);
  });
});

describe('workShares', () => {
  it('splits the received works by outcome', () => {
    const shares = workShares({
      worksReceived: 40,
      worksApproved: 20,
      worksRejected: 10,
      worksInProgress: 10,
    });
    expect(shares).toEqual({ approved: 50, rejected: 25, inProgress: 25 });
  });

  it('is empty when no work was received', () => {
    expect(
      workShares({ worksReceived: 0, worksApproved: 0, worksRejected: 0, worksInProgress: 0 }),
    ).toEqual({
      approved: 0,
      rejected: 0,
      inProgress: 0,
    });
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
