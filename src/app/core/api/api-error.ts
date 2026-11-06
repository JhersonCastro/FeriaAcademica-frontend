import { HttpErrorResponse } from '@angular/common/http';

/** Backend business-rule messages the UI needs to recognise. */
export const API_MESSAGES = {
  invalidCredentials: 'Invalid email or password, or the account is temporarily locked.',
  invalidLink: 'The link is invalid or has expired.',
  notRegistered: 'You are not registered for this event.',
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
  [/An event in state \w+ cannot be published\./, 'Solo una feria en configuración se puede publicar.'],
  [
    'At least one stage must be active.',
    'Programa al menos una etapa antes de publicar la feria.',
  ],
  [
    /An event in state \w+ cannot be closed\./,
    'Solo una feria publicada o en curso se puede cerrar.',
  ],
  [
    /The stages of an event in state \w+ cannot be rescheduled\./,
    'Las etapas de una feria cerrada o cancelada ya no se pueden cambiar.',
  ],
  [/The \w+ stage is disabled and cannot be scheduled\./, 'Esa etapa está desactivada.'],
  ['A stage must end after it starts.', 'La etapa debe terminar después de empezar.'],
  ['Capacity must be at least one.', 'El cupo debe ser de al menos 1.'],
  [
    /The capacity cannot be lower than the (\d+) people already registered\./,
    'El cupo no puede ser menor que las $1 personas ya inscritas.',
  ],
  ['User not found.', 'No encontramos el usuario.'],
  ['Full name is required.', 'El nombre completo es obligatorio.'],
  ['Full name cannot exceed 200 characters.', 'El nombre completo no puede superar 200 caracteres.'],
  ['Email is required.', 'El correo es obligatorio.'],
  ['Email is not valid.', 'El correo no es válido.'],
  ['Phone number is not valid.', 'El teléfono no es válido.'],
  ['Birth date cannot be in the future.', 'La fecha de nacimiento no puede ser futura.'],
  ['Guardian email is not valid.', 'El correo del acudiente no es válido.'],
  ['Password is required.', 'La contraseña es obligatoria.'],
  // Registrations and QR attendance (scan results arrive as `message`, not as an error).
  [API_MESSAGES.notRegistered, 'Aún no estás inscrito en esta feria.'],
  [
    /An event in state \w+ does not accept registrations or attendance\./,
    'Esta feria no está abierta a inscripciones ni asistencia en este momento.',
  ],
  [
    'Only the super admin or a coordinator or teacher of the event can take attendance.',
    'Solo el súper admin o un coordinador o profesor de la feria puede tomar asistencia.',
  ],
  ['QR token is required.', 'El QR leído no tiene contenido.'],
  [
    'This QR code is not registered for this event.',
    'Este QR no corresponde a ninguna inscripción de esta feria.',
  ],
  ['This registration was cancelled.', 'Esta inscripción fue cancelada.'],
  ['This person already entered.', 'Esta persona ya ingresó.'],
  ['Attendance registered.', 'Asistencia registrada.'],
  ['The event is full: there are no seats left.', 'Esta feria ya no tiene cupos disponibles.'],
  // Works and reviews.
  ['Work not found.', 'No encontramos el trabajo.'],
  [
    'A work can only be edited while it is a draft.',
    'Solo puedes cambiar los adjuntos mientras el trabajo está en Borrador.',
  ],
  ['Only a draft can be submitted.', 'Solo un trabajo en Borrador se puede enviar.'],
  [
    'A work needs at least one artifact to be submitted.',
    'Agrega al menos un adjunto antes de enviar el trabajo.',
  ],
  [
    'A work in review can no longer be withdrawn.',
    'El trabajo ya está en revisión: no se puede retirar ni reemplazar.',
  ],
  [
    /A work in state \w+ cannot be withdrawn\./,
    'En su estado actual el trabajo no se puede retirar.',
  ],
  [
    /The call is closed: the submission deadline was [^.]*\./,
    'La convocatoria está cerrada: ya pasó la fecha límite de envío.',
  ],
  [
    /The link must be a full http or https address.*/,
    'El enlace debe ser una dirección completa que empiece por http:// o https://.',
  ],
  ['Send either a link or a file.', 'Envía un enlace o un archivo.'],
  ['Only a submitted work can enter review.', 'Solo un trabajo enviado puede pasar a revisión.'],
  [
    'Only the professor assigned to this work can review it.',
    'Solo el profesor asignado puede revisar este trabajo.',
  ],
  ['The work is not in review.', 'El trabajo no está en revisión.'],
  [
    'Feedback is required unless the work is approved.',
    'La retroalimentación es obligatoria si el trabajo no se aprueba.',
  ],
  // Final version, event report and certificates (backend PR #11).
  [
    'The final version can only be submitted once the work is approved.',
    'Solo puedes entregar la versión final cuando el trabajo esté aprobado.',
  ],
  ['The final version was already submitted.', 'La versión final ya fue entregada.'],
  [
    'The final version needs the file, its name and its size.',
    'Adjunta el archivo de la versión final.',
  ],
  ['The report content is required.', 'Escribe el contenido del informe.'],
  ['The report is empty.', 'Escribe el contenido del informe.'],
  ['The report is too large.', 'El informe es demasiado grande. Reduce el tamaño de las imágenes.'],
  [
    'The event report has not been generated yet.',
    'El informe de esta feria todavía no se ha guardado.',
  ],
  [/An event in state \w+ cannot be closed\./, 'Esta feria no se puede cerrar en su estado actual.'],
  [
    'Certificates are available once the event has finished.',
    'Los certificados se pueden descargar cuando la feria termina.',
  ],
  [
    'An attendance certificate requires having attended the event.',
    'Para el certificado de asistencia debes haber registrado tu ingreso con el QR.',
  ],
  [
    'A participation certificate requires a work with its final version delivered.',
    'Para el certificado de participación debes entregar la versión final de tu trabajo.',
  ],
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
