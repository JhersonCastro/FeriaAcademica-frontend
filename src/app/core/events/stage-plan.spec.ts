import { EventStageDto } from './events.service';
import {
  currentStage,
  draftFromStage,
  draftRange,
  emptyDraft,
  findConflicts,
  formatDuration,
  formatStageDate,
  formatStageDateNumeric,
  isoToZone,
  orderConflictText,
  sortStages,
  stageStatusAt,
  timelineConflicts,
  validateDraft,
  withDraft,
  zoneToIso,
} from './stage-plan';

/** An ISO instant for a date and time in Colombia (UTC−5), so the tests do not depend on the browser's zone. */
const bogota = (date: string, time: string) => new Date(`${date}T${time}:00-05:00`).toISOString();

const stage = (
  type: EventStageDto['type'],
  start: [string, string] | null,
  end: [string, string] | null,
): EventStageDto => ({
  type,
  status: 'Scheduled',
  startDate: start ? bogota(...start) : null,
  endDate: end ? bogota(...end) : null,
});

const timeline = [
  stage('Reception', ['2026-11-01', '08:00'], ['2026-11-20', '23:59']),
  stage('Evaluation', ['2026-11-21', '08:00'], ['2026-12-05', '17:00']),
];

describe('stage timeline (HU-006)', () => {
  it('converts between the inputs and ISO instants in Colombia time', () => {
    expect(zoneToIso('2026-11-20', '23:59')).toBe('2026-11-21T04:59:00.000Z');
    expect(isoToZone('2026-11-21T04:59:00.000Z')).toEqual({ date: '2026-11-20', time: '23:59' });
    expect(zoneToIso('', '08:00')).toBeNull();
    expect(zoneToIso('2026-11-20', '')).toBeNull();
  });

  it('fills the inputs from a saved stage and reads them back', () => {
    const draft = draftFromStage(timeline[0]);
    expect(draft).toEqual({
      startDate: '2026-11-01',
      startTime: '08:00',
      endDate: '2026-11-20',
      endTime: '23:59',
    });
    expect(draftRange(draft)).toEqual({
      startDate: timeline[0].startDate,
      endDate: timeline[0].endDate,
    });
    expect(draftFromStage(null)).toEqual(emptyDraft());
    expect(draftFromStage(stage('Call', null, null))).toEqual(emptyDraft());
  });

  it('writes dates the way the design does', () => {
    expect(formatStageDate(bogota('2026-10-01', '08:00'))).toBe('1 oct 2026 · 8:00 a. m.');
    expect(formatStageDate(bogota('2026-11-20', '23:59'), false)).toBe('20 nov · 11:59 p. m.');
    expect(formatStageDate(bogota('2026-12-10', '12:00'))).toBe('10 dic 2026 · 12:00 p. m.');
    expect(formatStageDateNumeric(bogota('2026-11-20', '23:59'))).toBe('20/11/2026 · 11:59 p. m.');
  });

  it('writes the duration of a stage', () => {
    const start = bogota('2026-11-01', '08:00');
    expect(formatDuration(start, bogota('2026-11-20', '23:59'))).toBe('19 días y 15 h 59 min');
    expect(formatDuration(start, bogota('2026-11-02', '08:00'))).toBe('1 día');
    expect(formatDuration(start, bogota('2026-11-01', '10:30'))).toBe('2 h 30 min');
    expect(formatDuration(start, start)).toBeNull();
  });

  it('orders the stages by their start, the ones without dates last', () => {
    const sorted = sortStages([
      stage('Results', ['2026-12-10', '09:00'], ['2026-12-10', '12:00']),
      stage('Call', null, null),
      stage('Configuration', ['2026-10-01', '08:00'], ['2026-10-14', '18:00']),
    ]);
    expect(sorted.map((item) => item.type)).toEqual(['Configuration', 'Results', 'Call']);
  });

  describe('validation', () => {
    it('accepts a stage that starts after the previous one ends', () => {
      const draft = draftFromStage(timeline[1]);
      expect(validateDraft('Evaluation', draft, timeline)).toMatchObject({
        valid: true,
        complete: true,
        issues: {},
        conflict: null,
      });
    });

    it('does not accept a start before the previous stage ends', () => {
      const draft = { ...draftFromStage(timeline[1]), startDate: '2026-11-15' };
      const result = validateDraft('Evaluation', draft, timeline);
      expect(result.valid).toBe(false);
      expect(result.issues.startDate).toBe(
        'Empieza antes de que termine «Recepción de trabajos» (20/11/2026 · 11:59 p. m.). ' +
          'Evaluación debe empezar después de Recepción de trabajos.',
      );
      expect(result.conflict?.previous).toBe('Reception');
    });

    it('does not accept an end after the start of the stage that comes next', () => {
      const registration = {
        startDate: '2026-03-10',
        startTime: '17:06',
        endDate: '2027-03-11',
        endTime: '18:09',
      };
      const result = validateDraft('Registration', registration, timeline);
      expect(result.valid).toBe(false);
      expect(result.issues.endDate).toBe(
        'Termina después de que empiece «Evaluación» (21/11/2026 · 8:00 a. m.). ' +
          'Inscripciones debe terminar antes de que empiece Evaluación.',
      );

      const sameDay = {
        ...registration,
        startDate: '2026-11-20',
        endDate: '2026-11-21',
        endTime: '09:00',
      };
      expect(validateDraft('Registration', sameDay, timeline).issues.endTime).toBe(
        'Termina después de que empiece «Evaluación» (21/11/2026 · 8:00 a. m.). ' +
          'Inscripciones debe terminar antes de que empiece Evaluación.',
      );

      const fits = {
        startDate: '2026-11-21',
        startTime: '00:00',
        endDate: '2026-11-21',
        endTime: '08:00',
      };
      expect(validateDraft('Registration', fits, timeline).valid).toBe(true);
    });

    it('does not accept an end that is not after the start', () => {
      const draft = {
        startDate: '2026-11-21',
        startTime: '08:00',
        endDate: '2026-11-21',
        endTime: '07:00',
      };
      expect(validateDraft('Evaluation', draft, timeline).issues.endTime).toBe(
        'El fin debe ser posterior al inicio (21/11/2026 · 8:00 a. m.).',
      );
      expect(
        validateDraft('Evaluation', { ...draft, endDate: '2026-11-20' }, timeline).issues.endDate,
      ).toBe('El fin debe ser posterior al inicio (21/11/2026 · 8:00 a. m.).');
    });

    it('only keeps an incomplete stage from saving, without a message', () => {
      const result = validateDraft('Call', { ...emptyDraft(), startDate: '2026-10-15' }, timeline);
      expect(result).toMatchObject({ complete: false, valid: false, issues: {} });
    });

    it('compares with the saved stage of the usual order, not with the stage itself', () => {
      const draft = draftFromStage(timeline[0]);
      expect(validateDraft('Reception', draft, timeline).valid).toBe(true);
    });
  });

  it('finds the stages that start before the previous one ends', () => {
    expect(findConflicts(timeline).size).toBe(0);

    const overlapping = [
      timeline[0],
      stage('Evaluation', ['2026-11-15', '08:00'], ['2026-12-05', '17:00']),
    ];
    const conflicts = findConflicts(overlapping);
    expect([...conflicts.keys()]).toEqual(['Evaluation']);
    expect(conflicts.get('Evaluation')?.previous).toBe('Reception');
  });

  it('applies the draft of the stage being edited to the timeline', () => {
    const draft = {
      startDate: '2026-11-15',
      startTime: '08:00',
      endDate: '2026-12-05',
      endTime: '17:00',
    };
    expect(findConflicts(withDraft(timeline, 'Evaluation', draft)).has('Evaluation')).toBe(true);

    const added = withDraft(timeline, 'Results', {
      startDate: '2026-12-10',
      startTime: '09:00',
      endDate: '2026-12-10',
      endTime: '12:00',
    });
    expect(added.map((item) => item.type)).toEqual(['Reception', 'Evaluation', 'Results']);
    expect(withDraft(timeline, 'Evaluation', emptyDraft())).toEqual(timeline);
  });

  it('explains an order that is wrong with the dates that break it', () => {
    const conflicts = findConflicts([
      stage('Registration', ['2027-03-10', '17:06'], ['2027-03-11', '18:09']),
      stage('Evaluation', ['2026-11-30', '15:28'], ['2027-01-05', '18:30']),
    ]);
    expect(orderConflictText('Evaluation', conflicts.get('Evaluation')!)).toBe(
      'Evaluación debe empezar después de que termine Inscripciones. ' +
        'Hoy Evaluación empieza el 30 nov 2026 · 3:28 p. m. e Inscripciones termina el 11 mar 2027 · 6:09 p. m.',
    );

    const other = findConflicts([
      stage('Reception', ['2026-11-01', '08:00'], ['2026-11-20', '23:59']),
      stage('Evaluation', ['2026-11-15', '08:00'], ['2026-12-05', '17:00']),
    ]);
    expect(orderConflictText('Evaluation', other.get('Evaluation')!)).toContain(
      'Evaluación empieza el 15 nov 2026 · 8:00 a. m. y Recepción de trabajos termina el 20 nov 2026 · 11:59 p. m.',
    );
  });

  it('shows the problems of a stage that is not saved only in the form', () => {
    const draft = {
      startDate: '2026-11-15',
      startTime: '08:00',
      endDate: '2026-12-31',
      endTime: '17:00',
    };
    // Registration is not in the timeline: it does not make Evaluation look wrong.
    expect(timelineConflicts(timeline, 'Registration', draft).size).toBe(0);
    // Evaluation is saved: its draft does count.
    expect(timelineConflicts(timeline, 'Evaluation', draft).has('Evaluation')).toBe(true);
    // Nothing is being edited.
    expect(timelineConflicts(timeline, null, emptyDraft()).size).toBe(0);
  });

  it('tells the state of a stage from the current time', () => {
    const call = stage('Call', ['2026-05-10', '08:00'], ['2026-05-20', '18:00']);
    const at = (date: string, time: string) => new Date(bogota(date, time)).getTime();

    expect(stageStatusAt(call, at('2026-05-09', '23:59'))).toBe('Scheduled');
    expect(stageStatusAt(call, at('2026-05-10', '08:00'))).toBe('Open');
    expect(stageStatusAt(call, at('2026-05-15', '12:00'))).toBe('Open');
    expect(stageStatusAt(call, at('2026-05-20', '18:00'))).toBe('Closed');
    expect(stageStatusAt(call, at('2026-06-01', '09:00'))).toBe('Closed');
  });

  it('names the stage a fair is in, the next one, or that all ended', () => {
    const stages = [
      stage('Call', ['2026-05-01', '08:00'], ['2026-05-10', '18:00']),
      stage('Reception', ['2026-05-11', '08:00'], ['2026-05-20', '18:00']),
      stage('Evaluation', ['2026-06-01', '08:00'], ['2026-06-10', '18:00']),
    ];
    const at = (date: string, time: string) => new Date(bogota(date, time)).getTime();

    expect(currentStage(stages, at('2026-05-15', '12:00'))).toEqual({
      kind: 'current',
      type: 'Reception',
    });
    // Between two stages nothing runs: the next one is named.
    expect(currentStage(stages, at('2026-05-25', '12:00'))).toEqual({
      kind: 'next',
      type: 'Evaluation',
    });
    expect(currentStage(stages, at('2026-04-01', '12:00'))).toEqual({ kind: 'next', type: 'Call' });
    expect(currentStage(stages, at('2026-07-01', '12:00'))).toEqual({
      kind: 'finished',
      type: null,
    });
  });

  it('has no current stage while the timeline has no dated stages', () => {
    expect(currentStage([], Date.now())).toBeNull();
    expect(currentStage([stage('Call', null, null)], Date.now())).toBeNull();
  });

  it('keeps the backend state when the stage has no dates or the backend already moved it', () => {
    const now = Date.now();
    expect(stageStatusAt(stage('Call', null, null), now)).toBe('Scheduled');
    expect(stageStatusAt({ ...stage('Call', null, null), status: 'Open' }, now)).toBe('Open');
    const dated = stage('Call', ['2020-01-01', '08:00'], ['2020-01-02', '08:00']);
    expect(stageStatusAt({ ...dated, status: 'Open' }, now)).toBe('Open');
  });
});
