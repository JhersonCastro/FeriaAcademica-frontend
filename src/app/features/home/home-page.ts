import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ActiveEventStore } from '../../core/events/active-event.store';
import { EventsService } from '../../core/events/events.service';
import { RoleLabelPipe } from '../../shared/ui/role-label.pipe';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, DatePipe, RoleLabelPipe],
  templateUrl: './home-page.html',
  host: { class: 'page-content' },
})
export class HomePage {
  private readonly auth = inject(AuthService);
  protected readonly activeEvents = inject(ActiveEventStore);

  protected readonly user = this.auth.user;
  protected readonly isSuperAdmin = this.auth.isSuperAdmin;
  protected readonly today = new Date();
  /** Every event, only for the super admin (other roles see just the events they belong to). */
  protected readonly allEvents = toSignal(
    this.isSuperAdmin() ? inject(EventsService).list().pipe(catchError(() => of([]))) : of([]),
    { initialValue: [] },
  );
  protected readonly firstName = computed(() => this.user()?.fullName.split(/\s+/)[0] ?? '');
}
