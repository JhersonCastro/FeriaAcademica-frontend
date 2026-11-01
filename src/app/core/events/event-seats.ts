import { EventSummary } from './events.service';

type Seats = Pick<EventSummary, 'capacity' | 'availableSeats'>;

/** HU-041: an event with a capacity and no seats left does not accept registrations. */
export function isEventFull(event: Seats | null): boolean {
  return event?.capacity != null && (event.availableSeats ?? 0) <= 0;
}

/** "23 de 200", or "Sin límite" when the event has no capacity. */
export function seatsLabel(event: Seats | null): string {
  if (!event || event.capacity == null) {
    return 'Sin límite';
  }
  return `${Math.max(0, event.availableSeats ?? 0)} de ${event.capacity}`;
}
