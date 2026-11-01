import { CertificateDto } from '../models/certificate';
import { attendanceRate, pdfFileName, sortCertificates, workShares } from './report-rules';

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
    id: string,
    available: boolean,
    issuedAt: string | null,
    eventName = 'FIET 2026',
  ): CertificateDto => ({
    id,
    eventId: 'e1',
    eventName,
    kind: 'Attendance',
    available,
    issuedAt,
    verificationCode: available ? `CODE-${id}` : null,
  });

  it('lists the available ones first, newest first', () => {
    const sorted = sortCertificates([
      cert('pending', false, null),
      cert('old', true, '2026-05-01T00:00:00Z'),
      cert('new', true, '2026-11-01T00:00:00Z'),
    ]);
    expect(sorted.map((c) => c.id)).toEqual(['new', 'old', 'pending']);
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
