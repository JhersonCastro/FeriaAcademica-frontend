import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const FULL_NAME_MAX_LENGTH = 200;

const PHONE_ALLOWED_CHARACTERS = /^[+\d\s()-]+$/;
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;

/** Optional phone: 7 to 15 digits, allowing `+`, spaces, hyphens and parentheses. */
export const phoneValidator: ValidatorFn = (
  control: AbstractControl<string | null>,
): ValidationErrors | null => {
  const value = control.value?.trim();
  if (!value) {
    return null;
  }
  const digits = value.replace(/\D/g, '').length;
  const valid =
    PHONE_ALLOWED_CHARACTERS.test(value) && digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
  return valid ? null : { phone: true };
};

/** Expects `yyyy-MM-dd` (what `<input type="date">` produces). */
export const notFutureDateValidator: ValidatorFn = (
  control: AbstractControl<string | null>,
): ValidationErrors | null => {
  const value = control.value;
  return value && value > todayIsoDate() ? { futureDate: true } : null;
};

/** Today's local date as `yyyy-MM-dd`. */
export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Optional text fields go to the API as `null` rather than empty strings. */
export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
