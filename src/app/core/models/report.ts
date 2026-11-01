/**
 * `GET /api/events/{eventId}/report` (HU-031). Proposed contract, pending the backend: every
 * count is computed when the request arrives, so the report always reflects the current data.
 */
export interface EventReportDto {
  eventId: string;
  eventName: string;
  /** When the backend computed the figures (UTC). */
  generatedAt: string;
  /** Works submitted at least once (drafts never sent and cancelled works are left out). */
  worksReceived: number;
  /** Admitted or evaluated. */
  worksApproved: number;
  /** Rejected definitively. */
  worksRejected: number;
  /** Still in the review cycle: submitted, in review, or back in draft for corrections. */
  worksInProgress: number;
  /** Registrations that were not cancelled. */
  registered: number;
  /** Registrations with a QR check-in. */
  attended: number;
}
