import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { InstitutionsService } from '../../../../core/institutions/institutions.service';

/** The backend stores the name in 200 characters and the acronym in 30. */
const NAME_MAX_LENGTH = 200;
const ACRONYM_MAX_LENGTH = 30;

/**
 * Super admin: creates an institution (`/admin/institutions/new`) or edits one
 * (`/admin/institutions/:institutionId`). There is no endpoint to read a single institution, so
 * editing finds it in the list.
 */
@Component({
  selector: 'app-institution-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './institution-form-page.html',
  host: { class: 'page-content' },
})
export class InstitutionFormPage {
  private readonly institutions = inject(InstitutionsService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  /** `null` when creating. */
  protected readonly institutionId = inject(ActivatedRoute).snapshot.paramMap.get('institutionId');

  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly acronymMaxLength = ACRONYM_MAX_LENGTH;
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)]],
    acronym: ['', [Validators.maxLength(ACRONYM_MAX_LENGTH)]],
  });

  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    const id = this.institutionId;
    if (!id) {
      return;
    }
    this.loading.set(true);
    this.institutions.list().subscribe({
      next: (items) => {
        const institution = items.find((item) => item.id === id);
        if (institution) {
          this.form.setValue({ name: institution.name, acronym: institution.acronym ?? '' });
        } else {
          this.loadError.set('No encontramos esta institución.');
        }
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected showError(name: 'name' | 'acronym'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, acronym } = this.form.getRawValue();
    const request = { name: name.trim(), acronym: acronym.trim() || null };
    const id = this.institutionId;
    this.saving.set(true);
    this.errorMessage.set(null);
    const saved: Observable<unknown> = id
      ? this.institutions.update(id, request)
      : this.institutions.create(request);
    saved.subscribe({
      next: () => void this.router.navigate(['/admin/institutions']),
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }
}
