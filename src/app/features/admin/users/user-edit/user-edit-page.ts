import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserDto } from '../../../../core/models/user';
import { UsersService } from '../../../../core/users/users.service';
import {
  buildPersonalDataForm,
  personalDataFromUser,
  toPersonalDataRequest,
} from '../../../../shared/forms/personal-data-form';
import { PersonalDataFields } from '../../../../shared/ui/personal-data-fields/personal-data-fields';

@Component({
  selector: 'app-user-edit-page',
  imports: [ReactiveFormsModule, RouterLink, PersonalDataFields],
  templateUrl: './user-edit-page.html',
  host: { class: 'page-content' },
})
export class UserEditPage {
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly userId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    personal: buildPersonalDataForm(this.fb),
  });

  protected readonly user = signal<UserDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.users.get(this.userId).subscribe({
      next: (user) => {
        this.form.setValue({ email: user.email, personal: personalDataFromUser(user) });
        this.user.set(user);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected showEmailError(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || this.submitted());
  }

  protected save(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.users
      .update(this.userId, {
        email: this.form.getRawValue().email.trim(),
        ...toPersonalDataRequest(this.form.controls.personal),
      })
      .subscribe({
        next: () => {
          if (this.auth.user()?.id === this.userId) {
            this.auth.refreshUser().subscribe();
          }
          void this.router.navigate(['/admin/users', this.userId], {
            queryParams: { notice: 'updated' },
          });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error));
        },
      });
  }
}
