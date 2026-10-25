export type RegistrationStatus = 'Registered' | 'Cancelled';

export interface RegistrationDto {
  id: string;
  eventId: string;
  /** Exactly what the QR must encode (64 hex characters) and what the scanner sends back. */
  qrToken: string;
  status: RegistrationStatus;
  /** First check-in, or `null` while the person has not entered. */
  enteredAt: string | null;
}

export type ScanOutcome = 'Valid' | 'AlreadyEntered' | 'Invalid';

export interface ScanResultDto {
  outcome: ScanOutcome;
  message: string;
  attendeeName: string | null;
  /** Time of the first check-in (also for `AlreadyEntered`). */
  enteredAt: string | null;
}

export interface AttendanceSummaryDto {
  eventId: string;
  registered: number;
  entered: number;
  pending: number;
  lastEntryAt: string | null;
}
