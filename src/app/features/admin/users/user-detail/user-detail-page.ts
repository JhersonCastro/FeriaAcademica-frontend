import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { AuthService } from '../../../../core/auth/auth.service';
import { groupRolesByEvent } from '../../../../core/events/active-event.store';
import { EventsService } from '../../../../core/events/events.service';
import { EVENT_ROLES } from '../../../../core/models/labels';
import { EventRole, UserDto, UserStatus } from '../../../../core/models/user';
import { UsersService } from '../../../../core/users/users.service';
import { RoleLabelPipe } from '../../../../shared/ui/role-label.pipe';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';

const PAGE_NOTICES: Record<string, string> = {
  created:
    'Usuario creado. La cuenta queda pendiente hasta que la persona defina su contraseña con el enlace que le enviamos por correo.',
  updated: 'Los datos del usuario se guardaron.',
};

const STATUS_NOTICES: Record<UserStatus, string> = {
  Active: 'La cuenta quedó activa.',
  Pending:
    'La cuenta se reactivó y quedó pendiente: la persona aún debe definir su contraseña.',
  Inactive:
    'La cuenta quedó desactivada. Sus sesiones abiertas se cerrarán en menos de un minuto.',
};

@Component({
  selector: 'app-user-detail-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, RoleLabelPipe, StatusChip],
  templateUrl: './user-detail-page.html',
  host: { class: 'page-content' },
})
export class UserDetailPage {
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly snapshot = inject(ActivatedRoute).snapshot;
  private readonly userId = this.snapshot.paramMap.get('id') ?? '';

  protected readonly eventRoleOptions = EVENT_ROLES;
  protected readonly user = signal<UserDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly notice = signal<string | null>(
    PAGE_NOTICES[this.snapshot.queryParamMap.get('notice') ?? ''] ?? null,
  );
  protected readonly actionError = signal<string | null>(null);
  protected readonly confirmingDeactivation = signal(false);
  protected readonly changingStatus = signal(false);

  protected readonly isSelf = computed(() => this.auth.user()?.id === this.user()?.id);
  protected readonly events = computed(() => groupRolesByEvent(this.user()?.eventRoles ?? []));

  protected readonly eventsUnavailable = signal(false);
  /** Every event, to choose where the role is assigned. */
  protected readonly allEvents = toSignal(
    inject(EventsService)
      .list()
      .pipe(
        catchError(() => {
          this.eventsUnavailable.set(true);
          return of([]);
        }),
      ),
    { initialValue: [] },
  );

  protected readonly roleForm = inject(NonNullableFormBuilder).group({
    eventId: ['', Validators.required],
    role: ['' as EventRole | '', Validators.required],
  });
  protected readonly roleSubmitted = signal(false);
  protected readonly assigning = signal(false);
  protected readonly roleError = signal<string | null>(null);
  protected readonly roleAssigned = signal(false);

  constructor() {
    this.users.get(this.userId).subscribe({
      next: (user) => {
        this.user.set(user);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected showRoleError(name: 'eventId' | 'role'): boolean {
    const control = this.roleForm.controls[name];
    return control.invalid && (control.touched || this.roleSubmitted());
  }

  /** Deactivating asks for confirmation first; activating does not. */
  protected changeStatus(): void {
    const user = this.user();
    if (!user) {
      return;
    }
    const activating = user.status === 'Inactive';
    if (!activating && !this.confirmingDeactivation()) {
      this.confirmingDeactivation.set(true);
      return;
    }

    this.changingStatus.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    (activating ? this.users.activate(user.id) : this.users.deactivate(user.id))
      .pipe(switchMap(() => this.users.get(user.id)))
      .subscribe({
        next: (updated) => {
          this.user.set(updated);
          this.changingStatus.set(false);
          this.confirmingDeactivation.set(false);
          this.notice.set(STATUS_NOTICES[updated.status]);
        },
        error: (error: unknown) => {
          this.changingStatus.set(false);
          this.confirmingDeactivation.set(false);
          this.actionError.set(apiErrorMessage(error));
        },
      });
  }

  protected assignRole(): void {
    this.roleSubmitted.set(true);
    this.roleAssigned.set(false);
    if (this.roleForm.invalid) {
      return;
    }

    const { eventId, role } = this.roleForm.getRawValue();
    this.assigning.set(true);
    this.roleError.set(null);
    this.users
      .assignEventRole(eventId.trim(), { userId: this.userId, role: role as EventRole })
      .pipe(switchMap(() => this.users.get(this.userId)))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.assigning.set(false);
          this.roleSubmitted.set(false);
          this.roleAssigned.set(true);
          this.roleForm.reset();
          if (this.isSelf()) {
            this.auth.refreshUser().subscribe();
          }
        },
        error: (error: unknown) => {
          this.assigning.set(false);
          this.roleError.set(apiErrorMessage(error));
        },
      });
  }
}
