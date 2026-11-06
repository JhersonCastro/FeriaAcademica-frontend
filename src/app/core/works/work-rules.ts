import {
  ArtifactTypeName,
  ReviewDecision,
  ReviewResult,
  WorkArtifactDto,
  WorkReviewDto,
  WorkStatus,
} from '../models/work';

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  Draft: 'Borrador',
  Submitted: 'Enviado',
  InReview: 'En revisión',
  Admitted: 'Aprobado',
  Evaluated: 'Evaluado',
  RejectedDefinitively: 'Rechazado',
  Cancelled: 'Cancelado',
};

export const WORK_STATUS_CHIPS: Record<WorkStatus, string> = {
  Draft: 'chip--neutral',
  Submitted: 'chip--info',
  InReview: 'chip--warning',
  Admitted: 'chip--success',
  Evaluated: 'chip--success',
  RejectedDefinitively: 'chip--danger',
  Cancelled: 'chip--neutral',
};

export const REVIEW_RESULT_LABELS: Record<ReviewResult, string> = {
  Admitted: 'Aprobado',
  Rejected: 'Aprobado con cambios',
  DefinitiveRejection: 'Rechazado',
};

export const REVIEW_RESULT_CHIPS: Record<ReviewResult, string> = {
  Admitted: 'chip--success',
  Rejected: 'chip--warning',
  DefinitiveRejection: 'chip--danger',
};

export const REVIEW_DECISIONS: readonly ReviewDecision[] = [
  'Approved',
  'ApprovedWithChanges',
  'Rejected',
];

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  Approved: 'Aprobado',
  ApprovedWithChanges: 'Aprobado con cambios',
  Rejected: 'Rechazado',
};

export const REVIEW_DECISION_HINTS: Record<ReviewDecision, string> = {
  Approved: 'El trabajo queda admitido en la feria. La retroalimentación es opcional.',
  ApprovedWithChanges:
    'El trabajo vuelve a Borrador para que el participante lo corrija y lo reenvíe.',
  Rejected: 'El trabajo se cierra en esta feria. Explica el motivo al participante.',
};

export const ARTIFACT_TYPES: readonly ArtifactTypeName[] = [
  'Document',
  'Poster',
  'Presentation',
  'Video',
  'Code',
  'Other',
];

export const ARTIFACT_TYPE_LABELS: Record<ArtifactTypeName, string> = {
  Document: 'Documento',
  Poster: 'Póster',
  Presentation: 'Presentación',
  Video: 'Video',
  Code: 'Código',
  Other: 'Otro',
};

export interface ArtifactRow extends WorkArtifactDto {
  /** The highest version of its type: the one reviewers see. */
  current: boolean;
}

/** All versions, grouped by type and newest first, marking the current one of each type. */
export function artifactRows(artifacts: readonly WorkArtifactDto[]): ArtifactRow[] {
  const latest = new Map<ArtifactTypeName, number>();
  for (const artifact of artifacts) {
    latest.set(artifact.type, Math.max(latest.get(artifact.type) ?? 0, artifact.version));
  }
  return [...artifacts]
    .sort(
      (a, b) =>
        ARTIFACT_TYPES.indexOf(a.type) - ARTIFACT_TYPES.indexOf(b.type) || b.version - a.version,
    )
    .map((artifact) => ({ ...artifact, current: latest.get(artifact.type) === artifact.version }));
}

/** Most recent review first (the backend lists them by attempt). */
export function reviewsNewestFirst(reviews: readonly WorkReviewDto[]): WorkReviewDto[] {
  return [...reviews].sort((a, b) => b.attempt - a.attempt);
}

export function isDeadlinePassed(deadline: string | null, now: Date = new Date()): boolean {
  return deadline !== null && now.getTime() > new Date(deadline).getTime();
}

/**
 * The author can upload a new version while the work is a draft, or take a submitted work that
 * nobody opened yet back to draft. Both only until the submission deadline (backend rule).
 */
export function canReplace(
  status: WorkStatus,
  deadline: string | null,
  now: Date = new Date(),
): boolean {
  return (status === 'Draft' || status === 'Submitted') && !isDeadlinePassed(deadline, now);
}

/** Message for the decision form, or `null` when it can be sent (mirrors `Work.Decide`). */
export function decisionError(decision: ReviewDecision | null, feedback: string): string | null {
  if (!decision) {
    return 'Selecciona una decisión.';
  }
  if (decision !== 'Approved' && !feedback.trim()) {
    return 'Debes escribir la retroalimentación antes de guardar esta decisión.';
  }
  return null;
}

/** What the backend accepts as an uploaded artifact (`ArtifactFileRules`): a PDF up to 10 MB. */
export const MAX_FILE_MB = 10;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

/** Message for a file that cannot be uploaded, or `null` when it can (mirrors the backend). */
export function fileError(file: { name: string; size: number }): string | null {
  if (!file.name.trim().toLowerCase().endsWith('.pdf')) {
    return 'Solo se aceptan archivos PDF.';
  }
  if (file.size === 0) {
    return 'El archivo está vacío.';
  }
  if (file.size > MAX_FILE_BYTES) {
    return `El archivo supera el tamaño máximo de ${MAX_FILE_MB} MB.`;
  }
  return null;
}

/** "2,4 MB" / "340 KB": the size shown next to a chosen file. */
export function fileSizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Same check the backend applies to artifact links: an absolute http or https URL. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
