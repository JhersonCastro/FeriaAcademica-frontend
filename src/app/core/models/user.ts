export type EventRole = 'Coordinator' | 'Teacher' | 'Jury' | 'Participant' | 'Attendee';

export type UserStatus = 'Pending' | 'Active' | 'Inactive';

/** Role filter accepted by `GET /api/users`: the global super admin or any event role. */
export type UserRoleFilter = 'SuperAdmin' | EventRole;

export interface EventRoleAssignment {
  eventId: string;
  eventName: string;
  role: EventRole;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  /** `yyyy-MM-dd` */
  birthDate: string | null;
  guardianName: string | null;
  guardianEmail: string | null;
  isSuperAdmin: boolean;
  status: UserStatus;
  createdAt: string;
  eventRoles: EventRoleAssignment[];
}

export interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  status: UserStatus;
  roles: string[];
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UserListQuery {
  search: string;
  role: UserRoleFilter | '';
  status: UserStatus | '';
  page: number;
  pageSize: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember: boolean;
}

export interface ResetPasswordRequest {
  userId: string;
  token: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber: string | null;
  birthDate: string | null;
  guardianName: string | null;
  guardianEmail: string | null;
}

export interface UpdateUserRequest extends UpdateProfileRequest {
  email: string;
}

export interface CreateUserRequest {
  email: string;
  fullName: string;
  phoneNumber: string | null;
}

export interface AssignEventRoleRequest {
  userId: string;
  role: EventRole;
}

export interface CreatedResource {
  id: string;
}
