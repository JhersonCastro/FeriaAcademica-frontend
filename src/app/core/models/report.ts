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
