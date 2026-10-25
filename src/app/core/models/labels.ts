import { InvitationRole } from './invitation';
import { EventRole, UserRoleFilter, UserStatus } from './user';

export const EVENT_ROLES: readonly EventRole[] = [
  'Coordinator',
  'Teacher',
  'Jury',
  'Participant',
  'Attendee',
];

export const EVENT_ROLE_LABELS: Record<EventRole, string> = {
  Coordinator: 'Coordinador',
  Teacher: 'Profesor',
  Jury: 'Jurado',
  Participant: 'Estudiante participante',
  Attendee: 'Invitado',
};

export const INVITATION_ROLES: readonly InvitationRole[] = ['Participant', 'Attendee'];

export const USER_STATUSES: readonly UserStatus[] = ['Pending', 'Active', 'Inactive'];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  Pending: 'Pendiente',
  Active: 'Activa',
  Inactive: 'Inactiva',
};

export const ROLE_FILTERS: readonly UserRoleFilter[] = ['SuperAdmin', ...EVENT_ROLES];

const SUPER_ADMIN_LABEL = 'Súper admin';

/** Spanish label for a global or event role name as returned by the API. */
export function roleLabel(role: string): string {
  if (role === 'SuperAdmin') {
    return SUPER_ADMIN_LABEL;
  }
  return EVENT_ROLE_LABELS[role as EventRole] ?? role;
}

export function userStatusLabel(status: string): string {
  return USER_STATUS_LABELS[status as UserStatus] ?? status;
}

const EVENT_STATUS_LABELS: Record<string, string> = {
  Configuration: 'En configuración',
  Published: 'Publicada',
  InProgress: 'En curso',
  Closed: 'Cerrada',
  Archived: 'Archivada',
  Cancelled: 'Cancelada',
};

export function eventStatusLabel(status: string): string {
  return EVENT_STATUS_LABELS[status] ?? status;
}
