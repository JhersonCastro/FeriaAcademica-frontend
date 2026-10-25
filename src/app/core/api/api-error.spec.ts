import { HttpErrorResponse } from '@angular/common/http';
import { API_MESSAGES, apiErrorMessage, isApiMessage } from './api-error';

function businessError(detail: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 400,
    error: { title: 'Business rule violation', detail, status: 400 },
  });
}

describe('apiErrorMessage', () => {
  it('translates known business rule messages', () => {
    expect(apiErrorMessage(businessError('A user with this email already exists.'))).toBe(
      'Ya existe un usuario con este correo.',
    );
  });

  it('translates each joined password error', () => {
    const detail =
      "Passwords must have at least one non alphanumeric character. Passwords must have at least one digit ('0'-'9').";
    expect(apiErrorMessage(businessError(detail))).toBe(
      'La contraseña debe incluir al menos un símbolo. La contraseña debe incluir al menos un número.',
    );
  });

  it('shows unknown details as received', () => {
    expect(apiErrorMessage(businessError('Something new.'))).toBe('Something new.');
  });

  it('explains when the server cannot be reached', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('No hay conexión');
  });
});

describe('isApiMessage', () => {
  it('recognises the expired link message', () => {
    expect(isApiMessage(businessError(API_MESSAGES.invalidLink), API_MESSAGES.invalidLink)).toBe(
      true,
    );
  });
});
