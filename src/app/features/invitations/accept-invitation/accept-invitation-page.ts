import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { ActiveEventStore } from '../../../core/events/active-event.store';
import { InvitationsService } from '../../../core/invitations/invitations.service';
import { InvitationDetails } from '../../../core/models/invitation';
import { EVENT_ROLE_LABELS } from '../../../core/models/labels';
import { passwordPolicyValidator, passwordsMatchValidator } from '../../../shared/forms/password-policy';
import { FULL_NAME_MAX_LENGTH } from '../../../shared/forms/profile-validators';
import { PasswordInput } from '../../../shared/ui/password-input/password-input';
import { PasswordStrength } from '../../../shared/ui/password-strength/password-strength';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; invitation: InvitationDetails };

@Component({
  selector: 'app-accept-invitation-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, PasswordInput, PasswordStrength],
  templateUrl: './accept-invitation-page.html',
  host: { class: 'auth-page' },
})
export class AcceptInvitationPage {
  private readonly auth = inject(AuthService);
  private readonly invitations = inject(InvitationsService);
  private readonly activeEvents = inject(ActiveEventStore);
  private readonly router = inject(Router);
  private readonly snapshot = inject(ActivatedRoute).snapshot;
  private readonly token = this.snapshot.paramMap.get('token') ?? '';

  protected readonly fullNameMaxLength = FULL_NAME_MAX_LENGTH;
  protected readonly state = signal<LoadState>({ kind: 'loading' });
  protected readonly user = this.auth.user;

  protected readonly invitation = computed(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.invitation : null;
  });

  protected readonly loadError = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.message : null;
  });

  protected readonly roleLabel = computed(() => {
    const invitation = this.invitation();
    return invitation ? EVENT_ROLE_LABELS[invitation.role] : '';
  });

  protected readonly signedInAsInvitee = computed(() => {
    const invitation = this.invitation();
    const user = this.user();
    return !!invitation && !!user && sameEmail(user.email, invitation.email);
  });

  /** Login comes back here with `accept=1` so the invitation is accepted right away. */
  protected readonly loginQueryParams = computed(() => ({
    email: this.invitation()?.email ?? null,
    returnUrl: `/invitations/${encodeURIComponent(this.token)}?accept=1`,
  }));

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(FULL_NAME_MAX_LENGTH)]],
      password: ['', [Validators.required, passwordPolicyValidator]],
      confirmation: ['', Validators.required],
    },
    { validators: passwordsMatchValidator('password', 'confirmation') },
  );

  protected readonly password = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });
  protected readonly submitted = signal(false);
  protected readonly accepting = signal(false);
  protected readonly accepted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.invitations.get(this.token).subscribe({
      next: (invitation) => {
        this.state.set({ kind: 'ready', invitation });
        if (this.snapshot.queryParamMap.get('accept') === '1' && this.canAcceptWithSession()) {
          this.acceptWithSession();
        }
      },
      error: (error: unknown) => {
        const notFound =
          error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400);
        this.state.set(
          notFound ? { kind: 'not-found' } : { kind: 'error', message: apiErrorMessage(error) },
        );
      },
    });
  }

  protected showError(name: 'fullName' | 'password' | 'confirmation'): boolean {
    const control = this.form.controls[name];
    const mismatch = name === 'confirmation' && this.form.hasError('passwordMismatch');
    return (control.invalid || mismatch) && (control.touched || this.submitted());
  }

  /** New account: the invitation creates it, but does not sign in. */
  protected createAccount(): void {
    this.submitted.set(true);
    const invitation = this.invitation();
    if (this.form.invalid || !invitation) {
      return;
    }

    const { fullName, password } = this.form.getRawValue();
    this.accepting.set(true);
    this.errorMessage.set(null);
    this.invitations.accept(this.token, { fullName: fullName.trim(), password }).subscribe({
      next: () => {
        // Login redirects away when a session is open, so another person's session must end first.
        const goToLogin = () =>
          void this.router.navigate(['/login'], {
            queryParams: { notice: 'invitation-accepted', email: invitation.email },
          });
        if (this.user()) {
          this.auth.logout().subscribe({ complete: goToLogin, error: goToLogin });
        } else {
          goToLogin();
        }
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  /** Existing account: the open session identifies who accepts. */
  protected acceptWithSession(): void {
    const invitation = this.invitation();
    if (!invitation) {
      return;
    }

    this.accepting.set(true);
    this.errorMessage.set(null);
    this.invitations.accept(this.token).subscribe({
      next: () => {
        this.accepting.set(false);
        this.accepted.set(true);
        this.auth.refreshUser().subscribe(() => this.activeEvents.select(String(invitation.eventId)));
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  protected switchAccount(): void {
    const goToLogin = () =>
      void this.router.navigate(['/login'], { queryParams: this.loginQueryParams() });
    this.auth.logout().subscribe({ complete: goToLogin, error: goToLogin });
  }

  private canAcceptWithSession(): boolean {
    const invitation = this.invitation();
    return !!invitation && invitation.status === 'Pending' && invitation.hasAccount && this.signedInAsInvitee();
  }

  private fail(error: unknown): void {
    this.accepting.set(false);
    this.errorMessage.set(apiErrorMessage(error));
  }
}

function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
