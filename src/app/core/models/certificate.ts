/**
 * HU-060: the certificate types the backend issues today. Recognition is for the coordinators,
 * teachers and jury of the event.
 */
export type CertificateKind = 'Attendance' | 'Participation' | 'Recognition';

/**
 * `GET /api/certificates/mine` (HU-061). One row per certificate the person qualifies for:
 * attendance when they checked in with the QR, participation when their work has its final
 * version. A certificate can be downloaded once the event has finished (`available`).
 */
export interface CertificateDto {
  eventId: string;
  eventName: string;
  type: CertificateKind;
  /** Only for participation certificates. */
  workId: string | null;
  workTitle: string | null;
  /** `true` once the event is closed or archived. */
  available: boolean;
  /** Printed on the PDF to verify it; set after the first download. */
  code: string | null;
}
