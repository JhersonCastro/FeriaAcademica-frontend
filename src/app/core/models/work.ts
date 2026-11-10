export type WorkStatus =
  | 'Draft'
  | 'Submitted'
  | 'InReview'
  | 'Admitted'
  | 'Evaluated'
  | 'RejectedDefinitively'
  | 'Cancelled';

/** Result stored for each review attempt (`WorkReviewDto.result`, `MyWorkDto.lastReviewResult`). */
export type ReviewResult = 'Admitted' | 'Rejected' | 'DefinitiveRejection';

/** What the reviewer chooses (`POST /api/reviews/{workId}/decision`). */
export type ReviewDecision = 'Approved' | 'ApprovedWithChanges' | 'Rejected';

export type ArtifactTypeName = 'Document' | 'Poster' | 'Presentation' | 'Video' | 'Code' | 'Other';

/**
 * The backend binds `ArtifactType` as a number (no string converter on that request), in the
 * order of the C# enum.
 */
export const ARTIFACT_TYPE_CODES: Record<ArtifactTypeName, number> = {
  Document: 0,
  Poster: 1,
  Presentation: 2,
  Video: 3,
  Code: 4,
  Other: 5,
};

/** `GET /api/works/mine`: one of the signed-in participant's works. */
export interface MyWorkDto {
  id: string;
  eventId: string;
  eventName: string;
  title: string;
  status: WorkStatus;
  currentAttempt: number;
  rejectionCount: number;
  maxRejections: number;
  submittedAt: string | null;
  submissionDeadline: string | null;
  lastReviewResult: ReviewResult | null;
  lastReviewObservations: string | null;
}

/** Every version of every artifact; the highest version of each type is the current one. */
export interface WorkArtifactDto {
  id: string;
  type: ArtifactTypeName;
  version: number;
  fileUrl: string | null;
  linkUrl: string | null;
  uploadedAt: string;
  /** Marks the definitive document of an approved work. Only `GET /api/works/{id}` sends it. */
  isFinal?: boolean;
}

/** The reviewer's decision and feedback on one attempt. */
export interface WorkReviewDto {
  attempt: number;
  result: ReviewResult;
  observations: string | null;
  resolvedAt: string | null;
}

/** `GET /api/works/{id}`: only the author can read it. */
export interface WorkDto {
  id: string;
  participationId: string;
  eventId: string;
  eventName: string;
  professorId: string;
  title: string;
  summary: string | null;
  status: WorkStatus;
  currentAttempt: number;
  rejectionCount: number;
  maxRejections: number;
  submittedAt: string | null;
  submissionDeadline: string | null;
  closure: string | null;
  closureReason: string | null;
  closedAt: string | null;
  artifacts: WorkArtifactDto[];
  reviews: WorkReviewDto[];
}

/** `GET /api/reviews/assigned`: works waiting for the signed-in reviewer (Submitted or InReview). */
export interface AssignedWorkDto {
  id: string;
  eventId: string;
  eventName: string;
  title: string;
  summary: string | null;
  status: WorkStatus;
  currentAttempt: number;
  rejectionCount: number;
  maxRejections: number;
  enqueuedAt: string | null;
  /** Latest version of each artifact type. */
  artifacts: WorkArtifactDto[];
}

export interface AddLinkArtifactRequest {
  type: ArtifactTypeName;
  linkUrl: string;
}

export interface AddedArtifact {
  id: string;
  version: number;
}

/** `POST /api/works` (HU-010): the work is created as a draft under the author's participation. */
export interface CreateWorkRequest {
  participationId: string;
  /** The reviewer, picked among the professors of the event. */
  professorId: string;
  title: string;
  summary: string | null;
}

/** Progress of a file upload: `percent` while it goes, then the artifact the backend created. */
export type UploadProgress =
  | { kind: 'progress'; percent: number }
  | { kind: 'done'; artifact: AddedArtifact };
