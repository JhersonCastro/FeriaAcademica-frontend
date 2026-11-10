import { EventStatus, EventSummary } from './events.service';

export const EVENT_STATUS_CHIPS: Record<EventStatus, string> = {
  Configuration: 'chip--neutral',
  Published: 'chip--success',
  InProgress: 'chip--success',
  Closed: 'chip--info',
  Archived: 'chip--neutral',
  Cancelled: 'chip--danger',
};

/** Only an event still in configuration can be published. */
export function canPublish(status: EventStatus): boolean {
  return status === 'Configuration';
}

/** Only a published or ongoing event can be closed. */
export function canClose(status: EventStatus): boolean {
  return status === 'Published' || status === 'InProgress';
}

/** Stages stop being editable once the event is closed, archived or cancelled. */
export function canScheduleStages(status: EventStatus): boolean {
  return status === 'Configuration' || status === 'Published' || status === 'InProgress';
}

export interface InstitutionChoice {
  id: string;
  /** The fairs it already has, since the backend cannot name an institution yet. */
  label: string;
}

/**
 * `POST /api/events` needs an institution id and the backend has no endpoint to list them, so
 * the only ones known are those that already have a fair. Replace this with the real list once
 * `GET /api/institutions` exists.
 */
export function institutionChoices(
  events: readonly Pick<EventSummary, 'institutionId' | 'name'>[],
): InstitutionChoice[] {
  const namesByInstitution = new Map<string, string[]>();
  for (const event of events) {
    const names = namesByInstitution.get(event.institutionId) ?? [];
    names.push(event.name);
    namesByInstitution.set(event.institutionId, names);
  }
  return [...namesByInstitution].map(([id, names]) => ({
    id,
    label:
      names.length > 2
        ? `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`
        : names.join(', '),
  }));
}

/**
 * Converts the value of a `datetime-local` input (local time, no zone) to an ISO instant, or
 * `null` when it is empty or not a date.
 */
export function localDateTimeToIso(value: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
