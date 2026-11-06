import { EventStatus } from './events.service';

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
