import { isEventFull, seatsLabel } from './event-seats';

describe('event seats (HU-041)', () => {
  it('shows the seats left out of the capacity', () => {
    expect(seatsLabel({ capacity: 200, availableSeats: 23 })).toBe('23 de 200');
    expect(isEventFull({ capacity: 200, availableSeats: 23 })).toBe(false);
  });

  it('is full when no seats are left', () => {
    expect(seatsLabel({ capacity: 120, availableSeats: 0 })).toBe('0 de 120');
    expect(isEventFull({ capacity: 120, availableSeats: 0 })).toBe(true);
  });

  it('never shows negative seats', () => {
    expect(seatsLabel({ capacity: 10, availableSeats: -2 })).toBe('0 de 10');
  });

  it('has no limit when the event has no capacity', () => {
    expect(seatsLabel({ capacity: null, availableSeats: null })).toBe('Sin límite');
    expect(isEventFull({ capacity: null, availableSeats: null })).toBe(false);
    expect(isEventFull(null)).toBe(false);
  });
});
