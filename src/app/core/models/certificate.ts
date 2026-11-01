/** HU-060: one certificate kind per role. */
export type CertificateKind = 'Participation' | 'Attendance' | 'Recognition';

/**
 * `GET /api/certificates/mine` (HU-061). Proposed contract, pending the backend. The list also
 * includes certificates the person cannot download yet, so the screen can say why.
 */
export interface CertificateDto {
  id: string;
  eventId: string;
  eventName: string;
  kind: CertificateKind;
  /** `true` only when the condition is met (attended, or the work was approved). */
  available: boolean;
  /** Set when `available` is true. */
  issuedAt: string | null;
  /** Short code printed on the PDF to verify it. */
  verificationCode: string | null;
}
