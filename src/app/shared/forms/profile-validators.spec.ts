import { FormControl } from '@angular/forms';
import { emptyToNull, notFutureDateValidator, phoneValidator } from './profile-validators';

describe('phoneValidator', () => {
  it.each(['', '3001234567', '+57 300 123 4567', '(602) 820-9800', '1234567'])(
    'accepts "%s"',
    (value) => {
      expect(phoneValidator(new FormControl(value))).toBeNull();
    },
  );

  it.each(['300-12', '1234567890123456', '300.123.4567', 'abc1234567'])('rejects "%s"', (value) => {
    expect(phoneValidator(new FormControl(value))).toEqual({ phone: true });
  });
});

describe('notFutureDateValidator', () => {
  it('accepts past dates and empty values', () => {
    expect(notFutureDateValidator(new FormControl('2008-05-14'))).toBeNull();
    expect(notFutureDateValidator(new FormControl(''))).toBeNull();
  });

  it('rejects dates after today', () => {
    expect(notFutureDateValidator(new FormControl('2999-01-01'))).toEqual({ futureDate: true });
  });
});

describe('emptyToNull', () => {
  it('sends blank optional fields as null', () => {
    expect(emptyToNull('   ')).toBeNull();
    expect(emptyToNull(' Ana ')).toBe('Ana');
  });
});
