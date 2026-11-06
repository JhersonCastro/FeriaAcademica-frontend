import { canClose, canPublish, canScheduleStages, localDateTimeToIso } from './event-rules';

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
