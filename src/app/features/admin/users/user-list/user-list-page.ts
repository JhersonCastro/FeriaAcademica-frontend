import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { ROLE_FILTERS, USER_STATUSES, userStatusLabel } from '../../../../core/models/labels';
import {
  PagedResult,
  UserListItem,
  UserListQuery,
  UserRoleFilter,
  UserStatus,
} from '../../../../core/models/user';
import { UsersService } from '../../../../core/users/users.service';
import { RoleLabelPipe } from '../../../../shared/ui/role-label.pipe';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-user-list-page',
  imports: [RouterLink, RoleLabelPipe, StatusChip],
  templateUrl: './user-list-page.html',
  styleUrl: './user-list-page.css',
  host: { class: 'page-content' },
})
export class UserListPage {
  private readonly users = inject(UsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly roleFilters = ROLE_FILTERS;
  protected readonly statuses = USER_STATUSES;
  protected readonly statusLabel = userStatusLabel;

  // Filters live in the URL so going back from a user's detail keeps them.
  private readonly initial = this.route.snapshot.queryParamMap;
  protected readonly search = signal(this.initial.get('search') ?? '');
  protected readonly role = signal<UserRoleFilter | ''>(
    pick(this.initial.get('role'), ROLE_FILTERS),
  );
  protected readonly status = signal<UserStatus | ''>(
    pick(this.initial.get('status'), USER_STATUSES),
  );
  protected readonly page = signal(Math.max(1, Number(this.initial.get('page')) || 1));

  protected readonly result = signal<PagedResult<UserListItem> | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly totalPages = computed(() => {
    const result = this.result();
    return result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  });

  private readonly query = computed<UserListQuery>(() => ({
    search: this.search(),
    role: this.role(),
    status: this.status(),
    page: this.page(),
    pageSize: PAGE_SIZE,
  }));

  private readonly searchInput = new Subject<string>();
  private readonly reload = new Subject<UserListQuery>();

  constructor() {
    this.searchInput
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.search.set(term);
        this.page.set(1);
        this.load();
      });

    this.reload
      .pipe(
        switchMap((query) =>
          this.users.list(query).pipe(
            catchError((error: unknown) => {
              this.errorMessage.set(apiErrorMessage(error));
              this.loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.loading.set(false);
      });

    // The URL already holds these filters; navigating here would cancel the navigation in flight.
    this.load(false);
  }

  protected onSearch(event: Event): void {
    this.searchInput.next((event.target as HTMLInputElement).value);
  }

  protected onRoleChange(event: Event): void {
    this.role.set((event.target as HTMLSelectElement).value as UserRoleFilter | '');
    this.page.set(1);
    this.load();
  }

  protected onStatusChange(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as UserStatus | '');
    this.page.set(1);
    this.load();
  }

  protected goToPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
    this.load();
  }

  /** Event roles only; the super admin flag has its own chip. */
  protected eventRoles(user: UserListItem): string[] {
    return user.roles.filter((role) => role !== 'SuperAdmin');
  }

  private load(syncUrl = true): void {
    const query = this.query();
    this.loading.set(true);
    this.errorMessage.set(null);
    if (syncUrl) {
      void this.router.navigate([], {
        relativeTo: this.route,
        replaceUrl: true,
        queryParams: {
          search: query.search.trim() || null,
          role: query.role || null,
          status: query.status || null,
          page: query.page > 1 ? query.page : null,
        },
      });
    }
    this.reload.next(query);
  }
}

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return allowed.includes(value as T) ? (value as T) : '';
}
