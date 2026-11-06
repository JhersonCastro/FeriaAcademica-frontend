/**
 * `GET /api/events/{eventId}/report` (HU-032): the report the administrator saved, as HTML.
 * The PDF (`GET …/report/pdf`) is that same HTML. 404 while nothing has been saved.
 */
export interface SavedEventReportDto {
  eventId: string;
  eventName: string;
  html: string;
  updatedAt: string;
}

/** The attendance figures the report prints (from `GET /api/events/{id}/attendance/summary`). */
export interface ReportFigures {
  registered: number;
  entered: number;
  pending: number;
}

/** The works figures of `GET /api/events/{id}/report/summary`, counted when asked for. */
export interface WorkFigures {
  /** Sum of the other figures: works that were submitted at least once. */
  worksReceived: number;
  worksApproved: number;
  worksRejected: number;
  worksInReview: number;
  worksReturnedForChanges: number;
  worksWithdrawn: number;
}

/** `GET /api/events/{id}/report/summary` (super admin). */
export interface EventSummaryDto extends WorkFigures {
  eventId: string;
  eventName: string;
  eventStatus: string;
  registered: number;
  attended: number;
  generatedAt: string;
}
