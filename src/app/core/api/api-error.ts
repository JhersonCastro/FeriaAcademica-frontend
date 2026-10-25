import { HttpErrorResponse } from '@angular/common/http';

/** Backend business-rule messages the UI needs to recognise. */
export const API_MESSAGES = {
  invalidCredentials: 'Invalid email or password, or the account is temporarily locked.',
  invalidLink: 'The link is invalid or has expired.',
} as const;

/**
 * Spanish text for the `detail` messages the backend sends (DomainException and Identity
 * password errors). Several Identity errors arrive joined in one string, so each is replaced
 * in place; anything unknown is shown as received.
 */
const TRANSLATIONS: ReadonlyArray<[pattern: string | RegExp, text: string]> = [
  [
    API_MESSAGES.invalidCredentials,
    'Las credenciales no son válidas o el acceso está bloqueado temporalmente. Verifica tu correo y contraseña.',
  ],
  [
    'The account is not active yet: set your password with the link sent to your email.',
    'Tu cuenta aún no está activa: define tu contraseña con el enlace que enviamos a tu correo.',
  ],
  [
    'The account is deactivated.',
    'La cuenta está desactivada. Comunícate con el administrador de la plataforma.',
  ],
  [API_MESSAGES.invalidLink, 'El enlace no es válido o ya venció.'],
  ['A user with this email already exists.', 'Ya existe un usuario con este correo.'],
  ['You cannot deactivate your own account.', 'No puedes desactivar tu propia cuenta.'],
  ['The account is already deactivated.', 'La cuenta ya está desactivada.'],
  ['Only a deactivated account can be activated.', 'Solo se puede activar una cuenta desactivada.'],
  [/The user already has the \w+ role in this event\./, 'El usuario ya tiene ese rol en esta feria.'],
  [
    'Sign in with the invited account to accept this invitation.',
    'Inicia sesión con la cuenta invitada para aceptar esta invitación.',
  ],
  ['This invitation was sent to a different email.', 'Esta invitación se envió a otro correo.'],
  ['This invitation has expired.', 'Esta invitación venció.'],
  [/This invitation is no longer pending \(\w+\)\./, 'Esta invitación ya no está pendiente.'],
  ['Invitation not found.', 'No encontramos la invitación.'],
  [
    'Only a teacher of the event can send invitations.',
    'Solo un profesor de la feria puede enviar invitaciones.',
  ],
  [
    'A teacher can only invite students (participants) or guests (attendees).',
    'Solo puedes invitar estudiantes participantes o invitados.',
  ],
  ['Event not found.', 'No encontramos la feria.'],
  ['User not found.', 'No encontramos el usuario.'],
  ['Full name is required.', 'El nombre completo es obligatorio.'],
  ['Full name cannot exceed 200 characters.', 'El nombre completo no puede superar 200 caracteres.'],
  ['Email is required.', 'El correo es obligatorio.'],
  ['Email is not valid.', 'El correo no es válido.'],
  ['Phone number is not valid.', 'El teléfono no es válido.'],
  ['Birth date cannot be in the future.', 'La fecha de nacimiento no puede ser futura.'],
  ['Guardian email is not valid.', 'El correo del acudiente no es válido.'],
  ['Password is required.', 'La contraseña es obligatoria.'],
  [/Passwords must be at least (\d+) characters\./, 'La contraseña debe tener al menos $1 caracteres.'],
  [
    'Passwords must have at least one non alphanumeric character.',
    'La contraseña debe incluir al menos un símbolo.',
  ],
  ["Passwords must have at least one digit ('0'-'9').", 'La contraseña debe incluir al menos un número.'],
  [
    "Passwords must have at least one lowercase ('a'-'z').",
    'La contraseña debe incluir al menos una minúscula.',
  ],
  [
    "Passwords must have at least one uppercase ('A'-'Z').",
    'La contraseña debe incluir al menos una mayúscula.',
  ],
];

const DEFAULT_MESSAGE = 'No pudimos completar la solicitud. Intenta de nuevo.';

interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

/** Raw `detail` of a ProblemDetails response, or `null` when there is none. */
export function apiErrorDetail(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const body = error.error as ProblemDetails | null;
  return typeof body?.detail === 'string' && body.detail ? body.detail : null;
}

export function isApiMessage(error: unknown, message: string): boolean {
  return apiErrorDetail(error)?.startsWith(message) ?? false;
}

export function translateApiMessage(detail: string): string {
  return TRANSLATIONS.reduce(
    (text, [pattern, translation]) => text.replace(pattern, translation),
    detail,
  );
}

/** User-facing (Spanish) message for any error coming from the API. */
export function apiErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (error.status === 0) {
    return 'No hay conexión con el servidor. Verifica tu red e intenta de nuevo.';
  }

  const detail = apiErrorDetail(error);
  if (detail) {
    return translateApiMessage(detail);
  }

  // ASP.NET model-binding errors (e.g. a malformed id) come as `errors` without `detail`.
  if ((error.error as ProblemDetails | null)?.errors) {
    return 'Algunos datos no tienen el formato esperado. Revisa la información e intenta de nuevo.';
  }
  if (error.status === 403) {
    return 'No tienes permisos para realizar esta acción.';
  }
  if (error.status === 404) {
    return 'No encontramos el recurso solicitado.';
  }
  return fallback;
}
