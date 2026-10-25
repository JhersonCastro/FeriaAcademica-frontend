import { FormControl, FormGroup } from '@angular/forms';
import {
  evaluatePassword,
  passwordPolicyValidator,
  passwordsMatchValidator,
} from './password-policy';

describe('password policy', () => {
  it('accepts a password with 8+ characters, upper, lower, digit and symbol', () => {
    expect(passwordPolicyValidator(new FormControl('Clave#2026'))).toBeNull();
  });

  it('lists every missing requirement', () => {
    expect(passwordPolicyValidator(new FormControl('abc'))).toEqual({
      passwordPolicy: ['length', 'uppercase', 'digit', 'symbol'],
    });
  });

  it('treats accented letters as letters, not symbols', () => {
    const symbol = evaluatePassword('Ññandú2026').find((check) => check.requirement === 'symbol');
    expect(symbol?.met).toBe(false);
  });

  it('flags a confirmation that differs from the password', () => {
    const group = new FormGroup(
      { password: new FormControl('Clave#2026'), confirmation: new FormControl('Clave#2027') },
      { validators: passwordsMatchValidator('password', 'confirmation') },
    );
    expect(group.hasError('passwordMismatch')).toBe(true);

    group.controls.confirmation.setValue('Clave#2026');
    expect(group.hasError('passwordMismatch')).toBe(false);
  });
});
