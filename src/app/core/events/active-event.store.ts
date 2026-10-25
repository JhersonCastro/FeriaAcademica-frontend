import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { EventRole, EventRoleAssignment } from '../models/user';

export interface UserEvent {
  eventId: string;
  eventName: string;
  roles: EventRole[];
}

const STORAGE_KEY = 'feria.activeEventId';

export function groupRolesByEvent(assignments: readonly EventRoleAssignment[]): UserEvent[] {
  const byEvent = new Map<string, UserEvent>();
  for (const { eventId, eventName, role } of assignments) {
    const id = String(eventId);
    const event = byEvent.get(id) ?? { eventId: id, eventName, roles: [] };
    event.roles.push(role);
    byEvent.set(id, event);
  }
  return [...byEvent.values()];
}

/** The event ("feria activa") the signed-in user is currently working on. */
@Injectable({ providedIn: 'root' })
export class ActiveEventStore {
  private readonly auth = inject(AuthService);
  private readonly selectedId = signal<string | null>(readStoredId());

  readonly events = computed(() => groupRolesByEvent(this.auth.user()?.eventRoles ?? []));

  readonly activeEvent = computed<UserEvent | null>(() => {
    const events = this.events();
    return events.find((event) => event.eventId === this.selectedId()) ?? events[0] ?? null;
  });

  select(eventId: string): void {
    this.selectedId.set(eventId);
    try {
      localStorage.setItem(STORAGE_KEY, eventId);
    } catch {
      // Storage unavailable (private mode): the choice just isn't remembered.
    }
  }
}

function readStoredId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
