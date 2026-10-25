import { Signal, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { EventsService } from './events.service';

/**
 * Name of an event for headings. Taken from the user's roles when possible; otherwise (a super
 * admin with no role in it) looked up in the events list. Call it in an injection context.
 */
export function injectEventName(eventId: string): Signal<string> {
  const fromRoles = inject(AuthService)
    .user()
    ?.eventRoles.find((assignment) => String(assignment.eventId) === eventId)?.eventName;
  const name = signal(fromRoles ?? 'Feria');

  if (!fromRoles) {
    inject(EventsService)
      .list()
      .subscribe({
        next: (events) => {
          const event = events.find((candidate) => candidate.id === eventId);
          if (event) {
            name.set(event.name);
          }
        },
        // A heading without the event name is acceptable; the page shows its own errors.
        error: () => {},
      });
  }
  return name.asReadonly();
}
