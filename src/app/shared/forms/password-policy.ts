import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRequirement = 'length' | 'uppercase' | 'lowercase' | 'digit' | 'symbol';

export interface PasswordCheck {
  requirement: PasswordRequirement;
  label: string;
  met: boolean;
}

/** Mirrors the backend policy: 8+ characters with upper and lower case, a digit and a symbol. */
export function evaluatePassword(password: string): PasswordCheck[] {
  return [
    {
      requirement: 'length',
      label: `${PASSWORD_MIN_LENGTH} caracteres`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    { requirement: 'uppercase', label: 'mayúscula', met: /\p{Lu}/u.test(password) },
    { requirement: 'lowercase', label: 'minúscula', met: /\p{Ll}/u.test(password) },
    { requirement: 'digit', label: 'número', met: /\p{Nd}/u.test(password) },
    { requirement: 'symbol', label: 'símbolo', met: /[^\p{L}\p{N}]/u.test(password) },
  ];
}

export const passwordPolicyValidator: ValidatorFn = (
  control: AbstractControl<string | null>,
): ValidationErrors | null => {
  const missing = evaluatePassword(control.value ?? '')
    .filter((check) => !check.met)
    .map((check) => check.requirement);
  return missing.length ? { passwordPolicy: missing } : null;
};

/** Group validator: flags `passwordMismatch` when the confirmation differs from the password. */
export function passwordsMatchValidator(passwordKey: string, confirmationKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey)?.value;
    const confirmation = group.get(confirmationKey)?.value;
    return confirmation && password !== confirmation ? { passwordMismatch: true } : null;
  };
}
