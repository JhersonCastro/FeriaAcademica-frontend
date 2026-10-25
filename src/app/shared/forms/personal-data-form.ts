import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { UpdateProfileRequest, UserDto } from '../../core/models/user';
import {
  FULL_NAME_MAX_LENGTH,
  emptyToNull,
  notFutureDateValidator,
  phoneValidator,
} from './profile-validators';

/** Fields shared by "Mi perfil" and the super admin's user edit form. */
export type PersonalDataForm = FormGroup<{
  fullName: FormControl<string>;
  phoneNumber: FormControl<string>;
  birthDate: FormControl<string>;
  guardianName: FormControl<string>;
  guardianEmail: FormControl<string>;
}>;

export function buildPersonalDataForm(fb: NonNullableFormBuilder): PersonalDataForm {
  return fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(FULL_NAME_MAX_LENGTH)]],
    phoneNumber: ['', phoneValidator],
    birthDate: ['', notFutureDateValidator],
    guardianName: ['', Validators.maxLength(FULL_NAME_MAX_LENGTH)],
    guardianEmail: ['', Validators.email],
  });
}

export function personalDataFromUser(user: UserDto): ReturnType<PersonalDataForm['getRawValue']> {
  return {
    fullName: user.fullName,
    phoneNumber: user.phoneNumber ?? '',
    birthDate: user.birthDate ?? '',
    guardianName: user.guardianName ?? '',
    guardianEmail: user.guardianEmail ?? '',
  };
}

export function toPersonalDataRequest(form: PersonalDataForm): UpdateProfileRequest {
  const value = form.getRawValue();
  return {
    fullName: value.fullName.trim(),
    phoneNumber: emptyToNull(value.phoneNumber),
    birthDate: emptyToNull(value.birthDate),
    guardianName: emptyToNull(value.guardianName),
    guardianEmail: emptyToNull(value.guardianEmail),
  };
}
