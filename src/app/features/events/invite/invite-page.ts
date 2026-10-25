import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { InvitationsService } from '../../../core/invitations/invitations.service';
import { InvitationRole } from '../../../core/models/invitation';
import { EVENT_ROLE_LABELS, INVITATION_ROLES } from '../../../core/models/labels';

const INVITATION_VALIDITY_DAYS = 7;

interface SentInvitation {
  email: string;
  role: InvitationRole;
  createdAt: Date;
  expiresAt: Date;
}

/** Only reachable with the Teacher role in `:eventId` (see `eventRoleGuard`). */
@Component({
  selector: 'app-invite-page',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './invite-page.html',
  host: { class: 'page-content' },
})
export class InvitePage {
  private readonly auth = inject(AuthService);
  private readonly invitations = inject(InvitationsService);
  private readonly eventId = inject(ActivatedRoute).snapshot.paramMap.get('eventId') ?? '';

  protected readonly roles = INVITATION_ROLES;
  protected readonly roleLabels = EVENT_ROLE_LABELS;
  protected readonly user = this.auth.user;
  protected readonly today = new Date();
  protected readonly eventName = computed(
    () =>
      this.user()?.eventRoles.find((assignment) => String(assignment.eventId) === this.eventId)
        ?.eventName ?? 'Feria',
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    role: ['Participant' as InvitationRole, Validators.required],
  });

  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly lastSent = signal<SentInvitation | null>(null);

  protected showEmailError(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || this.submitted());
  }

  protected send(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      return;
    }

    const email = this.form.getRawValue().email.trim();
    const role = this.form.getRawValue().role;
    this.sending.set(true);
    this.errorMessage.set(null);
    this.invitations.create(this.eventId, { email, role }).subscribe({
      next: () => {
        const createdAt = new Date();
        const expiresAt = new Date(createdAt);
        expiresAt.setDate(expiresAt.getDate() + INVITATION_VALIDITY_DAYS);
        this.lastSent.set({ email, role, createdAt, expiresAt });
        this.form.reset({ email: '', role });
        this.submitted.set(false);
        this.sending.set(false);
      },
      error: (error: unknown) => {
        this.sending.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }
}
