import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { PersonalDataForm } from '../../forms/personal-data-form';
import { FULL_NAME_MAX_LENGTH, todayIsoDate } from '../../forms/profile-validators';

type FieldName = keyof PersonalDataForm['controls'];

@Component({
  selector: 'app-personal-data-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './personal-data-fields.html',
  host: { class: 'form-grid form-grid__full' },
})
export class PersonalDataFields {
  readonly group = input.required<PersonalDataForm>();
  /** Show every error once the user tried to submit, not only the touched ones. */
  readonly submitted = input(false);
  readonly idPrefix = input('personal');

  protected readonly fullNameMaxLength = FULL_NAME_MAX_LENGTH;
  protected readonly today = todayIsoDate();

  protected showError(name: FieldName): boolean {
    const control = this.group().controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected id(name: string): string {
    return `${this.idPrefix()}-${name}`;
  }
}
