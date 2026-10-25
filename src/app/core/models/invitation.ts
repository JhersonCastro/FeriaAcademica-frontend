/** Roles a teacher can invite to. */
export type InvitationRole = 'Participant' | 'Attendee';

// The backend may add more terminal states; anything other than `Pending` cannot be accepted.
export type InvitationStatus = 'Pending' | 'Accepted' | 'Expired' | (string & {});

export interface InvitationDetails {
  eventId: string;
  eventName: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  expiresAt: string;
  hasAccount: boolean;
}

export interface AcceptInvitationRequest {
  fullName: string;
  password: string;
}

export interface CreateInvitationRequest {
  email: string;
  role: InvitationRole;
}
