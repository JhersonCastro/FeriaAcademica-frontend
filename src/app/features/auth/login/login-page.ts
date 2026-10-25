import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { safeReturnUrl } from '../../../core/auth/return-url';
import { PasswordInput } from '../../../shared/ui/password-input/password-input';

interface Notice {
  tone: 'info' | 'success';
  text: string;
}

/** Messages other screens can ask the login page to show (`?notice=` or `?reason=`). */
const NOTICES: Record<string, Notice> = {
  'session-expired': { tone: 'info', text: 'Tu sesión terminó. Inicia sesión de nuevo para continuar.' },
  'password-set': {
    tone: 'success',
    text: 'Tu contraseña quedó guardada y tu cuenta está activa. Ya puedes iniciar sesión.',
  },
  'password-reset': {
    tone: 'success',
    text: 'Tu contraseña se restableció. Ya puedes iniciar sesión.',
  },
  'invitation-accepted': {
    tone: 'success',
    text: 'Creaste tu cuenta y aceptaste la invitación. Inicia sesión para continuar.',
  },
};

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, PasswordInput],
  templateUrl: './login-page.html',
  host: { class: 'auth-page' },
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly queryParams = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: [this.queryParams.get('email') ?? '', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false],
  });

  protected readonly notice: Notice | null =
    NOTICES[this.queryParams.get('notice') ?? this.queryParams.get('reason') ?? ''] ?? null;
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected showError(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { email, password, remember } = this.form.getRawValue();
    this.auth.login({ email: email.trim(), password, remember }).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl(safeReturnUrl(this.queryParams.get('returnUrl')));
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }
}
