import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { API_MESSAGES, apiErrorMessage, isApiMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { passwordPolicyValidator, passwordsMatchValidator } from '../../../shared/forms/password-policy';
import { PasswordInput } from '../../../shared/ui/password-input/password-input';
import { PasswordStrength } from '../../../shared/ui/password-strength/password-strength';

/** `set`: first password of an account created by the super admin. `reset`: recovery. */
export type PasswordLinkMode = 'set' | 'reset';

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, PasswordInput, PasswordStrength],
  templateUrl: './reset-password-page.html',
  host: { class: 'auth-page' },
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snapshot = inject(ActivatedRoute).snapshot;

  // queryParamMap values are already URL-decoded and must be sent back exactly as received.
  private readonly userId = this.snapshot.queryParamMap.get('userId');
  private readonly token = this.snapshot.queryParamMap.get('token');

  protected readonly mode: PasswordLinkMode = this.snapshot.data['mode'] === 'set' ? 'set' : 'reset';

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      password: ['', [Validators.required, passwordPolicyValidator]],
      confirmation: ['', Validators.required],
    },
    { validators: passwordsMatchValidator('password', 'confirmation') },
  );

  protected readonly password = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });
  protected readonly linkInvalid = signal(!this.userId || !this.token);
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected showPasswordError(): boolean {
    const control = this.form.controls.password;
    return control.invalid && (control.touched || this.submitted());
  }

  protected showConfirmationError(): boolean {
    const control = this.form.controls.confirmation;
    const mismatch = this.form.hasError('passwordMismatch');
    return (control.invalid || mismatch) && (control.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || !this.userId || !this.token) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.auth
      .resetPassword({
        userId: this.userId,
        token: this.token,
        newPassword: this.form.getRawValue().password,
      })
      .subscribe({
        next: () => {
          void this.router.navigate(['/login'], {
            queryParams: { notice: this.mode === 'set' ? 'password-set' : 'password-reset' },
          });
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          if (isApiMessage(error, API_MESSAGES.invalidLink)) {
            this.linkInvalid.set(true);
          } else {
            this.errorMessage.set(apiErrorMessage(error));
          }
        },
      });
  }
}
