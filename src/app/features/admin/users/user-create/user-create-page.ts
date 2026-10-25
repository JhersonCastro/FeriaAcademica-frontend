import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { UsersService } from '../../../../core/users/users.service';
import {
  FULL_NAME_MAX_LENGTH,
  emptyToNull,
  phoneValidator,
} from '../../../../shared/forms/profile-validators';

@Component({
  selector: 'app-user-create-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './user-create-page.html',
  host: { class: 'page-content' },
})
export class UserCreatePage {
  private readonly users = inject(UsersService);
  private readonly router = inject(Router);

  protected readonly fullNameMaxLength = FULL_NAME_MAX_LENGTH;
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.required, Validators.maxLength(FULL_NAME_MAX_LENGTH)]],
    phoneNumber: ['', phoneValidator],
  });

  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected showError(name: 'email' | 'fullName' | 'phoneNumber'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      return;
    }

    const { email, fullName, phoneNumber } = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);
    this.users
      .create({
        email: email.trim(),
        fullName: fullName.trim(),
        phoneNumber: emptyToNull(phoneNumber),
      })
      .subscribe({
        next: ({ id }) => {
          void this.router.navigate(['/admin/users', id], { queryParams: { notice: 'created' } });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error));
        },
      });
  }
}
