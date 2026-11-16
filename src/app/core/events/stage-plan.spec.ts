import { STAGE_TYPES } from '../models/labels';
import { EventStageDto } from './events.service';
import {
  StageRow,
  fillDates,
  initialRows,
  isoToLocalInput,
  moveRow,
  toggleRow,
  planChanges,
  planErrors,
  planWarnings,
  toLocalInput,
} from './stage-plan';

/** An ISO instant for a local date and time, so the tests do not depend on the time zone. */
const iso = (local: string) => new Date(local).toISOString();

const row = (type: StageRow['type'], start = '', end = '', selected = true): StageRow => ({
  type,
  selected,
  start,
  end,
});

describe('stage plan (T-15)', () => {
  it('formats a date for a datetime-local input and back from the API', () => {
    expect(toLocalInput(new Date(2026, 10, 20, 8, 5))).toBe('2026-11-20T08:05');
    expect(isoToLocalInput(iso('2026-11-20T08:05'))).toBe('2026-11-20T08:05');
    expect(isoToLocalInput(null)).toBe('');
    expect(isoToLocalInput('no es fecha')).toBe('');
  });

  it('starts with the saved stages marked and in date order, then the rest unmarked', () => {
    const saved: EventStageDto[] = [
      {
        type: 'Reception',
        status: 'Scheduled',
        startDate: iso('2026-11-20T08:00'),
        endDate: iso('2026-11-27T17:00'),
      },
      {
        type: 'Evaluation',
        status: 'Scheduled',
        startDate: iso('2026-11-28T08:00'),
        endDate: iso('2026-11-30T17:00'),
      },
    ];
    const rows = initialRows(saved, STAGE_TYPES);

    expect(rows.map((r) => r.type).slice(0, 3)).toEqual([
      'Reception',
      'Evaluation',
      'Configuration',
    ]);
    expect(rows.length).toBe(STAGE_TYPES.length);
    expect(rows[0]).toEqual(row('Reception', '2026-11-20T08:00', '2026-11-27T17:00'));
    expect(rows.filter((r) => r.selected).length).toBe(2);
    // A stage that is not marked shows no date: the inputs no longer bring the current time.
    expect(rows[2]).toEqual(row('Configuration', '', '', false));
  });

  it('moves a marked stage up or down among the marked ones and ignores moves past the edges', () => {
    const rows = [row('Call'), row('Reception'), row('Evaluation'), row('Results', '', '', false)];
    expect(moveRow(rows, 'Reception', -1, STAGE_TYPES).map((r) => r.type)).toEqual([
      'Reception',
      'Call',
      'Evaluation',
      'Results',
    ]);
    expect(moveRow(rows, 'Evaluation', 1, STAGE_TYPES).map((r) => r.type)).toEqual([
      'Call',
      'Reception',
      'Evaluation',
      'Results',
    ]);
    expect(moveRow(rows, 'Call', -1, STAGE_TYPES).map((r) => r.type)).toEqual([
      'Call',
      'Reception',
      'Evaluation',
      'Results',
    ]);
  });

  it('puts a newly marked stage after the marked ones and an unmarked one back in its place', () => {
    const rows = initialRows([], STAGE_TYPES);
    const marked = toggleRow(
      toggleRow(rows, 'Evaluation', true, STAGE_TYPES),
      'Call',
      true,
      STAGE_TYPES,
    );
    expect(marked.slice(0, 3).map((r) => [r.type, r.selected])).toEqual([
      ['Evaluation', true],
      ['Call', true],
      ['Configuration', false],
    ]);
    const unmarked = toggleRow(marked, 'Evaluation', false, STAGE_TYPES);
    expect(unmarked.map((r) => r.type)).toEqual([
      'Call',
      ...STAGE_TYPES.filter((t) => t !== 'Call'),
    ]);
  });

  it('fills the dates of the marked stages in order, with the duration and the interval', () => {
    const rows = [
      row('Call'),
      row('Nomination', '', '', false),
      row('Reception'),
      row('Evaluation'),
    ];
    const filled = fillDates(rows, { firstStart: '2026-11-20T08:00', durationDays: 5, gapDays: 2 });

    expect(filled).toEqual([
      row('Call', '2026-11-20T08:00', '2026-11-25T08:00'),
      row('Nomination', '', '', false),
      row('Reception', '2026-11-27T08:00', '2026-12-02T08:00'),
      row('Evaluation', '2026-12-04T08:00', '2026-12-09T08:00'),
    ]);
  });

  it('does not fill anything without a valid first start', () => {
    expect(fillDates([row('Call')], { firstStart: '', durationDays: 5, gapDays: 0 })).toBeNull();
  });

  it('asks for at least one stage and for valid dates', () => {
    expect(planErrors([row('Call', '', '', false)])).toEqual(['Marca al menos una etapa.']);
    expect(planErrors([row('Call', '2026-11-20T08:00', '')])).toEqual([
      'Indica el inicio y el fin de Convocatoria.',
    ]);
    expect(planErrors([row('Reception', '2026-11-20T08:00', '2026-11-19T08:00')])).toEqual([
      'Recepción de trabajos debe terminar después de empezar.',
    ]);
    expect(planErrors([row('Call', '2026-11-20T08:00', '2026-11-21T08:00')])).toEqual([]);
  });

  it('warns, without blocking, when a stage starts before the previous one ends', () => {
    const rows = [
      row('Call', '2026-11-20T08:00', '2026-11-25T08:00'),
      row('Reception', '2026-11-24T08:00', '2026-11-30T08:00'),
    ];
    expect(planWarnings(rows)).toEqual([
      'Recepción de trabajos empieza antes de que termine Convocatoria.',
    ]);
    expect(planErrors(rows)).toEqual([]);
  });

  it('sends only new or changed stages and removes the unmarked saved ones', () => {
    const saved: EventStageDto[] = [
      {
        type: 'Call',
        status: 'Scheduled',
        startDate: iso('2026-11-20T08:00'),
        endDate: iso('2026-11-25T08:00'),
      },
      {
        type: 'Reception',
        status: 'Scheduled',
        startDate: iso('2026-11-26T08:00'),
        endDate: iso('2026-11-30T08:00'),
      },
      {
        type: 'Results',
        status: 'Scheduled',
        startDate: iso('2026-12-10T08:00'),
        endDate: iso('2026-12-11T08:00'),
      },
    ];
    const rows = [
      row('Call', '2026-11-20T08:00', '2026-11-25T08:00'), // unchanged
      row('Reception', '2026-11-26T08:00', '2026-12-01T08:00'), // new end
      row('Evaluation', '2026-12-02T08:00', '2026-12-05T08:00'), // new stage
      row('Results', '2026-12-10T08:00', '2026-12-11T08:00', false), // unmarked
    ];

    expect(planChanges(saved, rows)).toEqual({
      schedule: [
        {
          type: 'Reception',
          schedule: { startDate: iso('2026-11-26T08:00'), endDate: iso('2026-12-01T08:00') },
        },
        {
          type: 'Evaluation',
          schedule: { startDate: iso('2026-12-02T08:00'), endDate: iso('2026-12-05T08:00') },
        },
      ],
      remove: ['Results'],
    });
  });
});
