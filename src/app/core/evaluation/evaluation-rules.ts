import {
  EvaluationAnswer,
  EvaluationQuestionDto,
  QuestionType,
  SaveEvaluationQuestion,
} from '../models/evaluation';

export const MAX_QUESTIONS = 20;
export const MAX_QUESTION_LENGTH = 300;
export const MAX_TEXT_ANSWER_LENGTH = 1000;
export const DEFAULT_SCALE = { min: 1, max: 5 } as const;

export const QUESTION_TYPES: readonly QuestionType[] = ['Scale', 'YesNo', 'Text'];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  Scale: 'Escala',
  YesNo: 'Sí / No',
  Text: 'Respuesta escrita',
};

export const QUESTION_TYPE_HINTS: Record<QuestionType, string> = {
  Scale: 'Se responde con un número, por ejemplo de 1 a 5.',
  YesNo: 'Se responde con Sí o No.',
  Text: `Se responde escribiendo, hasta ${MAX_TEXT_ANSWER_LENGTH} caracteres.`,
};

/** `YesNo` answers travel as numbers. */
export const YES = 1;
export const NO = 0;

/** The lowest value a scale can start at, and the highest it can reach. */
export const SCALE_MIN_OPTIONS: readonly number[] = [0, 1];
export const SCALE_MAX_OPTIONS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Starting points for a fair without questions; the teacher edits or removes them. */
export const SUGGESTED_QUESTIONS: readonly { type: QuestionType; text: string }[] = [
  { type: 'Scale', text: '¿Qué tan clara fue la presentación del trabajo?' },
  { type: 'Scale', text: '¿Qué tanto dominio del tema demostraron los autores?' },
  { type: 'YesNo', text: '¿Recomendarías este trabajo para representar a la facultad?' },
  { type: 'Text', text: '¿Qué le mejorarías al trabajo?' },
];

/** A question being edited. `key` identifies it in the list even before it has an id. */
export interface QuestionDraft {
  key: string;
  id: string | null;
  type: QuestionType;
  text: string;
  /** Kept while the type is not `Scale`, so switching back does not lose it. */
  scaleMin: number;
  scaleMax: number;
}

let nextKey = 0;

export function newDraft(text = '', type: QuestionType = 'Scale'): QuestionDraft {
  nextKey += 1;
  return {
    key: `q${nextKey}`,
    id: null,
    type,
    text,
    scaleMin: DEFAULT_SCALE.min,
    scaleMax: DEFAULT_SCALE.max,
  };
}

export function draftsFrom(questions: readonly EvaluationQuestionDto[]): QuestionDraft[] {
  return sortByOrder(questions).map((question) => ({
    key: question.id,
    id: question.id,
    type: question.type,
    text: question.text,
    scaleMin: question.scaleMin ?? DEFAULT_SCALE.min,
    scaleMax: question.scaleMax ?? DEFAULT_SCALE.max,
  }));
}

/** Why a question cannot be saved, in Spanish; `null` when it is fine. */
export function questionError(draft: QuestionDraft): string | null {
  const text = draft.text.trim();
  if (!text) {
    return 'Escribe la pregunta.';
  }
  if (text.length > MAX_QUESTION_LENGTH) {
    return `La pregunta puede tener hasta ${MAX_QUESTION_LENGTH} caracteres.`;
  }
  if (
    draft.type === 'Scale' &&
    (!Number.isInteger(draft.scaleMin) ||
      !Number.isInteger(draft.scaleMax) ||
      draft.scaleMax <= draft.scaleMin)
  ) {
    return 'El valor más alto de la escala debe ser mayor que el más bajo.';
  }
  return null;
}

/** Only `Scale` questions send their scale. */
export function toSaveRequest(drafts: readonly QuestionDraft[]): SaveEvaluationQuestion[] {
  return drafts.map((draft) => ({
    id: draft.id,
    type: draft.type,
    text: draft.text.trim(),
    scaleMin: draft.type === 'Scale' ? draft.scaleMin : null,
    scaleMax: draft.type === 'Scale' ? draft.scaleMax : null,
  }));
}

/** True when the list on screen differs from what is saved (order included). */
export function questionsChanged(
  drafts: readonly QuestionDraft[],
  saved: readonly EvaluationQuestionDto[],
): boolean {
  const current = toSaveRequest(drafts);
  const stored = toSaveRequest(draftsFrom(saved));
  return JSON.stringify(current) !== JSON.stringify(stored);
}

/** A copy of the list with the item at `index` moved one place up (-1) or down (+1). */
export function moveItem<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return [...items];
  }
  const copy = [...items];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

/** Every value a person can pick, e.g. 1, 2, 3, 4, 5. */
export function scaleValues(min: number | null, max: number | null): number[] {
  return min !== null && max !== null && max > min
    ? Array.from({ length: max - min + 1 }, (_, i) => min + i)
    : [];
}

export function sortByOrder<T extends { order: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

/** Picked numbers (`Scale`, `YesNo`) by question id; blank questions are not in the map. */
export type AnswerValues = Record<string, number | undefined>;
/** Written answers (`Text`) by question id. */
export type AnswerTexts = Record<string, string | undefined>;

/** Only the answered questions, in question order. A blank written answer counts as none. */
export function toAnswers(
  questions: readonly EvaluationQuestionDto[],
  values: AnswerValues,
  texts: AnswerTexts,
): EvaluationAnswer[] {
  const answers: EvaluationAnswer[] = [];
  for (const question of sortByOrder(questions)) {
    if (question.type === 'Text') {
      const text = texts[question.id]?.trim();
      if (text) {
        answers.push({ questionId: question.id, value: null, text });
      }
    } else if (values[question.id] !== undefined) {
      answers.push({ questionId: question.id, value: values[question.id] as number, text: null });
    }
  }
  return answers;
}

/** "3 de 8": how many works of a fair the person already evaluated. */
export function evaluatedCount(works: readonly { answered: boolean }[]): number {
  return works.filter((work) => work.answered).length;
}

/** The first work after `workId` (wrapping around) that still has no answers. */
export function nextPendingWork<T extends { workId: string; answered: boolean }>(
  works: readonly T[],
  workId: string,
): T | null {
  const start = works.findIndex((work) => work.workId === workId);
  for (let step = 1; step <= works.length; step++) {
    const work = works[(start + step) % works.length];
    if (!work.answered && work.workId !== workId) {
      return work;
    }
  }
  return null;
}
