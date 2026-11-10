import { EventStatus } from '../events/events.service';

/**
 * How a question is answered: a number on a scale (e.g. 1 to 5), yes or no, or a written
 * answer.
 */
export type QuestionType = 'Scale' | 'YesNo' | 'Text';

/** One evaluation question of a fair. `scaleMin`/`scaleMax` only matter for `Scale`. */
export interface EvaluationQuestionDto {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  scaleMin: number | null;
  scaleMax: number | null;
}

/** `GET /api/events/{eventId}/evaluation` (HU-023): the fair's questions, possibly none. */
export interface EventEvaluationDto {
  eventId: string;
  eventName: string;
  eventStatus: EventStatus;
  /** False once the fair is closed and somebody already answered. */
  canEdit: boolean;
  answersCount: number;
  updatedAt: string | null;
  questions: EvaluationQuestionDto[];
}

/** `PUT /api/events/{eventId}/evaluation`: the whole list, in order. `id: null` = new question. */
export interface SaveEvaluationQuestion {
  id: string | null;
  type: QuestionType;
  text: string;
  scaleMin: number | null;
  scaleMax: number | null;
}

/** A work the signed-in person can evaluate. */
export interface EvaluableWorkDto {
  workId: string;
  title: string;
  summary: string | null;
  answered: boolean;
}

/** `GET /api/evaluations/pending`: closed fairs the person attended that have questions. */
export interface PendingEvaluationDto {
  eventId: string;
  eventName: string;
  questionsCount: number;
  works: EvaluableWorkDto[];
}

/**
 * One answer. `Scale`: `value` on the question's scale. `YesNo`: `value` 1 (yes) or 0 (no).
 * `Text`: `text`, with `value` null.
 */
export interface EvaluationAnswer {
  questionId: string;
  value: number | null;
  text: string | null;
}

/** `GET /api/events/{eventId}/evaluation/works/{workId}/answers/me`. */
export interface MyWorkAnswersDto {
  eventId: string;
  eventName: string;
  workId: string;
  workTitle: string;
  workSummary: string | null;
  questions: EvaluationQuestionDto[];
  answers: EvaluationAnswer[];
  answeredAt: string | null;
}
