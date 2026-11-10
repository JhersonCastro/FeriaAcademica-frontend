import { EvaluationQuestionDto, QuestionType } from '../models/evaluation';
import {
  MAX_QUESTION_LENGTH,
  draftsFrom,
  moveItem,
  newDraft,
  nextPendingWork,
  questionError,
  questionsChanged,
  scaleValues,
  toAnswers,
  toSaveRequest,
} from './evaluation-rules';

const question = (
  id: string,
  order: number,
  text = `Pregunta ${id}`,
  type: QuestionType = 'Scale',
): EvaluationQuestionDto => ({
  id,
  order,
  type,
  text,
  scaleMin: type === 'Scale' ? 1 : null,
  scaleMax: type === 'Scale' ? 5 : null,
});

describe('questions of the fair (HU-023)', () => {
  it('starts a new question empty, on a 1 to 5 scale and without id', () => {
    const draft = newDraft();
    expect(draft).toEqual(
      expect.objectContaining({ id: null, text: '', scaleMin: 1, scaleMax: 5 }),
    );
  });

  it('gives every new question its own key', () => {
    expect(newDraft().key).not.toBe(newDraft().key);
  });

  it('keeps the saved order when editing', () => {
    const drafts = draftsFrom([question('b', 2), question('a', 1)]);
    expect(drafts.map((d) => d.id)).toEqual(['a', 'b']);
  });

  it('asks for the text of the question', () => {
    expect(questionError({ ...newDraft(), text: '   ' })).toBe('Escribe la pregunta.');
  });

  it('limits the length of the question', () => {
    const text = 'x'.repeat(MAX_QUESTION_LENGTH + 1);
    expect(questionError({ ...newDraft(), text })).toContain(`${MAX_QUESTION_LENGTH}`);
  });

  it('needs the top of the scale above the bottom', () => {
    expect(questionError({ ...newDraft('¿Clara?'), scaleMin: 1, scaleMax: 1 })).toContain('escala');
    expect(questionError({ ...newDraft('¿Clara?'), scaleMin: 0, scaleMax: 10 })).toBeNull();
  });

  it('sends the questions trimmed, new ones with id null', () => {
    const request = toSaveRequest([{ ...newDraft('  ¿Clara?  '), scaleMax: 4 }]);
    expect(request).toEqual([
      { id: null, type: 'Scale', text: '¿Clara?', scaleMin: 1, scaleMax: 4 },
    ]);
  });

  it('sends no scale for yes/no and written questions', () => {
    const request = toSaveRequest([
      newDraft('¿La recomiendas?', 'YesNo'),
      newDraft('¿Qué mejorarías?', 'Text'),
    ]);
    expect(request.map((q) => [q.type, q.scaleMin, q.scaleMax])).toEqual([
      ['YesNo', null, null],
      ['Text', null, null],
    ]);
  });

  it('does not check the scale of a question that is not a scale', () => {
    expect(
      questionError({ ...newDraft('¿Qué mejorarías?', 'Text'), scaleMin: 5, scaleMax: 1 }),
    ).toBeNull();
  });

  it('keeps the scale when switching to yes/no and back', () => {
    const saved = [question('a', 1)];
    const draft = { ...draftsFrom(saved)[0], scaleMax: 10 };
    const back = { ...draft, type: 'YesNo' as const };
    expect(toSaveRequest([{ ...back, type: 'Scale' }])[0].scaleMax).toBe(10);
  });

  it('reads a saved yes/no question with the default scale for later', () => {
    const [draft] = draftsFrom([question('a', 1, '¿Sí?', 'YesNo')]);
    expect(draft).toEqual(expect.objectContaining({ type: 'YesNo', scaleMin: 1, scaleMax: 5 }));
  });

  it('notices changes in text, scale, order, and added or removed questions', () => {
    const saved = [question('a', 1), question('b', 2)];
    const drafts = draftsFrom(saved);
    expect(questionsChanged(drafts, saved)).toBe(false);
    expect(questionsChanged([{ ...drafts[0], text: 'Otra' }, drafts[1]], saved)).toBe(true);
    expect(questionsChanged([{ ...drafts[0], scaleMax: 10 }, drafts[1]], saved)).toBe(true);
    expect(questionsChanged([drafts[1], drafts[0]], saved)).toBe(true);
    expect(questionsChanged([drafts[0]], saved)).toBe(true);
    expect(questionsChanged([...drafts, newDraft('Nueva')], saved)).toBe(true);
    expect(questionsChanged([{ ...drafts[0], type: 'Text' }, drafts[1]], saved)).toBe(true);
  });

  it('does not count spaces around the text as a change', () => {
    const saved = [question('a', 1, '¿Clara?')];
    expect(questionsChanged([{ ...draftsFrom(saved)[0], text: '¿Clara? ' }], saved)).toBe(false);
  });

  it('moves a question up or down and ignores moves past the ends', () => {
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });

  it('lists every value of the scale', () => {
    expect(scaleValues(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(scaleValues(0, 2)).toEqual([0, 1, 2]);
    expect(scaleValues(3, 3)).toEqual([]);
  });
});

describe('answers of a work (HU-023)', () => {
  const questions = [
    question('q2', 2),
    question('q1', 1),
    question('q3', 3, '¿La recomiendas?', 'YesNo'),
    question('q4', 4, '¿Qué mejorarías?', 'Text'),
  ];

  it('sends only the answered questions, in question order', () => {
    const answers = toAnswers(questions, { q3: 1, q1: 5 }, {});
    expect(answers).toEqual([
      { questionId: 'q1', value: 5, text: null },
      { questionId: 'q3', value: 1, text: null },
    ]);
  });

  it('keeps a 0 answer (a "No" too) and drops a cleared one', () => {
    const answers = toAnswers(questions, { q1: 0, q2: undefined, q3: 0 }, {});
    expect(answers.map((a) => [a.questionId, a.value])).toEqual([
      ['q1', 0],
      ['q3', 0],
    ]);
  });

  it('sends a written answer trimmed, with no value', () => {
    expect(toAnswers(questions, {}, { q4: '  Más pruebas de campo  ' })).toEqual([
      { questionId: 'q4', value: null, text: 'Más pruebas de campo' },
    ]);
  });

  it('does not count a blank written answer', () => {
    expect(toAnswers(questions, {}, { q4: '   ' })).toEqual([]);
  });

  it('ignores text typed for a question that is not written', () => {
    expect(toAnswers(questions, {}, { q1: 'texto' })).toEqual([]);
  });
});

describe('nextPendingWork (HU-023)', () => {
  const works = [
    { workId: 'w1', answered: true },
    { workId: 'w2', answered: false },
    { workId: 'w3', answered: true },
    { workId: 'w4', answered: false },
  ];

  it('suggests the next work without answers after the current one', () => {
    expect(nextPendingWork(works, 'w2')?.workId).toBe('w4');
  });

  it('wraps around to the start of the list', () => {
    expect(nextPendingWork(works, 'w4')?.workId).toBe('w2');
  });

  it('is null when everything else is answered', () => {
    expect(nextPendingWork([{ workId: 'w1', answered: false }], 'w1')).toBeNull();
  });
});
