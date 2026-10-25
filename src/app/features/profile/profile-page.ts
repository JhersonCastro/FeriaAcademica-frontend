import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { switchMap } from 'rxjs';
import { apiErrorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { groupRolesByEvent } from '../../core/events/active-event.store';
import { UsersService } from '../../core/users/users.service';
import {
  buildPersonalDataForm,
  personalDataFromUser,
  toPersonalDataRequest,
} from '../../shared/forms/personal-data-form';
import { PersonalDataFields } from '../../shared/ui/personal-data-fields/personal-data-fields';
import { RoleLabelPipe } from '../../shared/ui/role-label.pipe';
import { StatusChip } from '../../shared/ui/status-chip/status-chip';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, DatePipe, PersonalDataFields, RoleLabelPipe, StatusChip],
  templateUrl: './profile-page.html',
  host: { class: 'page-content' },
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);

  protected readonly user = this.auth.user;
  protected readonly events = computed(() => groupRolesByEvent(this.user()?.eventRoles ?? []));
  protected readonly form = buildPersonalDataForm(inject(NonNullableFormBuilder));

  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    const user = this.user();
    if (user) {
      this.form.setValue(personalDataFromUser(user));
    }
  }

  protected save(): void {
    this.submitted.set(true);
    this.saved.set(false);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.users
      .updateMyProfile(toPersonalDataRequest(this.form))
      // The profile shown everywhere comes from /me, so read it again after saving.
      .pipe(switchMap(() => this.auth.refreshUser()))
      .subscribe({
        next: (user) => {
          this.form.setValue(personalDataFromUser(user));
          this.form.markAsPristine();
          this.submitted.set(false);
          this.saving.set(false);
          this.saved.set(true);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error));
        },
      });
  }
}
