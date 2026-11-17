import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/api/api-error';
import {
  InstitutionDto,
  InstitutionsService,
} from '../../../../core/institutions/institutions.service';

/** Super admin: the institutions that host fairs; a fair can only be created in an active one. */
@Component({
  selector: 'app-institution-list-page',
  imports: [RouterLink],
  templateUrl: './institution-list-page.html',
  host: { class: 'page-content' },
})
export class InstitutionListPage {
  private readonly institutions = inject(InstitutionsService);

  protected readonly items = signal<InstitutionDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  /** Id of the institution whose state is being changed. */
  protected readonly changing = signal<string | null>(null);

  constructor() {
    this.institutions.list().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected toggle(institution: InstitutionDto): void {
    this.changing.set(institution.id);
    this.errorMessage.set(null);
    const request = institution.isActive
      ? this.institutions.deactivate(institution.id)
      : this.institutions.activate(institution.id);
    request.subscribe({
      next: () => {
        this.items.update((items) =>
          items.map((item) =>
            item.id === institution.id ? { ...item, isActive: !institution.isActive } : item,
          ),
        );
        this.changing.set(null);
      },
      error: (error: unknown) => {
        this.errorMessage.set(apiErrorMessage(error));
        this.changing.set(null);
      },
    });
  }
}
