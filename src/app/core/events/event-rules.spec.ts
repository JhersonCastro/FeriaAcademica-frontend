import {
  canClose,
  canPublish,
  canScheduleStages,
  institutionChoices,
  localDateTimeToIso,
} from './event-rules';

describe('event rules', () => {
  it('publishes only an event that is still in configuration', () => {
    expect(canPublish('Configuration')).toBe(true);
    expect(canPublish('Published')).toBe(false);
    expect(canPublish('Closed')).toBe(false);
  });

  it('closes only a published or ongoing event', () => {
    expect(canClose('Published')).toBe(true);
    expect(canClose('InProgress')).toBe(true);
    expect(canClose('Configuration')).toBe(false);
    expect(canClose('Closed')).toBe(false);
  });

  it('stops scheduling stages once the event is over', () => {
    expect(canScheduleStages('Configuration')).toBe(true);
    expect(canScheduleStages('Published')).toBe(true);
    expect(canScheduleStages('Closed')).toBe(false);
    expect(canScheduleStages('Cancelled')).toBe(false);
  });

  it('turns a datetime-local value into an ISO instant', () => {
    const iso = localDateTimeToIso('2026-11-20T08:30');
    expect(iso).toBe(new Date(2026, 10, 20, 8, 30).toISOString());
  });

  it('returns null for an empty or invalid date', () => {
    expect(localDateTimeToIso('')).toBeNull();
    expect(localDateTimeToIso('not a date')).toBeNull();
  });
});

describe('institutionChoices', () => {
  const fair = (institutionId: string, name: string) => ({ institutionId, name });

  it('lists each institution once, labelled with its fairs', () => {
    const choices = institutionChoices([
      fair('i1', 'FIET 2026'),
      fair('i2', 'Feria Empresarial'),
      fair('i1', 'FIET 2025'),
    ]);
    expect(choices).toEqual([
      { id: 'i1', label: 'FIET 2026, FIET 2025' },
      { id: 'i2', label: 'Feria Empresarial' },
    ]);
  });

  it('shortens the label from the third fair on', () => {
    const choices = institutionChoices([fair('i1', 'A'), fair('i1', 'B'), fair('i1', 'C')]);
    expect(choices).toEqual([{ id: 'i1', label: 'A, B y 1 más' }]);
  });

  it('is empty when there are no fairs', () => {
    expect(institutionChoices([])).toEqual([]);
  });
});
