import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../core/api/api-error';
import { InstitutionChoice, institutionChoices } from '../../../../core/events/event-rules';
import { EventsService } from '../../../../core/events/events.service';

/** The backend stores the name in 200 characters. */
const NAME_MAX_LENGTH = 200;

/**
 * Super admin (HU-005): creates a fair. It is born in configuration; its stages and its
 * publication are done afterwards from its configuration page.
 */
@Component({
  selector: 'app-event-create-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './event-create-page.html',
  host: { class: 'page-content' },
})
export class EventCreatePage {
  private readonly events = inject(EventsService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly form = this.fb.group({
    institutionId: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)]],
    capacity: this.fb.control<number | null>(null, [Validators.min(1)]),
  });

  /** The backend cannot list institutions yet: these are the ones that already have a fair. */
  protected readonly institutions = signal<InstitutionChoice[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.events.list().subscribe({
      next: (events) => {
        const choices = institutionChoices(events);
        this.institutions.set(choices);
        if (choices.length === 1) {
          this.form.controls.institutionId.setValue(choices[0].id);
        }
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected showError(name: 'institutionId' | 'name' | 'capacity'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { institutionId, name, capacity } = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);
    this.events.create({ institutionId, name: name.trim(), capacity }).subscribe({
      next: ({ id }) => void this.router.navigate(['/admin/events', id]),
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }
}
