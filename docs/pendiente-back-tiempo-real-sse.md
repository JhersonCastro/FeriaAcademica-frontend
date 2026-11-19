# Tarea para el back: tiempo real con Server-Sent Events (SSE)

Este documento está pensado para dárselo a Claude Code abierto en la carpeta de `FeriaAcademica-backend`. Contiene el contexto, lo que hay que hacer, lo que no hay que tocar y cómo comprobarlo.

## Problema

El front se entera de lo que pasa en el servidor preguntando cada cierto tiempo:

- **Notificaciones:** `GET /api/notifications` cada 30 segundos. Una notificación puede tardar hasta 30 s en aparecer.
- **Afluencia** (pestaña del staff): `GET /api/events/{id}/attendance/summary` y `GET /api/events/{id}/registrations` cada 4 s mientras la página está abierta. Con varias personas del staff mirándola, son muchas peticiones para casi siempre la misma respuesta.

El front ya está listo para recibir los cambios por **SSE** (`EventSource`), pero el back no tiene esos endpoints. Mientras no existan, el front **sigue preguntando como hasta ahora** (si el stream no conecta, vuelve a sondear y reintenta abrirlo cada 30 s). Cuando el back los publique, el front deja de sondear solo, sin desplegar nada más.

## Cómo se conecta el front (lo que el back debe respetar)

- Usa `new EventSource(url, { withCredentials: true })`. **`EventSource` no puede enviar cabeceras**, por eso la autenticación debe ir por la **cookie de sesión**, igual que el resto de la API. No hay que aceptar el token por la URL.
- Mismo origen que la API (`/api/...`, detrás del proxy del front).
- Si el endpoint responde `401`/`403`/`404`, el navegador no reintenta; el front lo reintenta cada 30 s. Si la conexión se corta, el navegador reintenta solo.
- Cada vez que el stream (re)conecta, el front vuelve a pedir el estado completo por REST. Por eso **no hace falta** repetir eventos perdidos ni usar `Last-Event-ID`.
- Los datos van en JSON, con los mismos nombres (camelCase) y la misma forma que los DTO que ya existen.

## Endpoints a crear

Respuesta con `Content-Type: text/event-stream`, `Cache-Control: no-cache` y `X-Accel-Buffering: no`. Formato de cada mensaje:

```
event: <nombre>
data: <json en una sola línea>

```

### 1. `GET /api/notifications/stream`

Autorización: sesión iniciada. Solo emite las notificaciones **del usuario autenticado**.

| Evento | Cuándo | `data` |
|---|---|---|
| `notification` | Se crea una notificación para el usuario (cualquier tipo: `WorkReviewed`, `FinalVersionSubmitted`, etc.) | Un `NotificationDto`: `{ id, eventId, type, message, isRead, createdAt }` (el mismo de `GET /api/notifications`) |

### 2. `GET /api/events/{eventId}/attendance/stream`

Autorización: la misma que `GET /api/events/{eventId}/attendance/summary` (`AttendancePolicy.EnsureCanManage`: super admin, coordinadores y profesores de la feria). Sin permiso → `403`/`400` como el resto.

| Evento | Cuándo | `data` |
|---|---|---|
| `summary` | Tras cada check-in válido y cada cambio en las inscripciones (inscribirse, cancelar) de ese evento | Un `AttendanceSummaryDto`: `{ eventId, registered, entered, pending, lastEntryAt }` |
| `entered` | Tras cada check-in **válido** (no `AlreadyEntered` ni `Invalid`) | Un `EventRegistrationDto`: `{ registrationId, userId, fullName, email, status, enteredAt }` de la persona que acaba de entrar |

Con un solo check-in se envían los dos eventos (primero `entered`, luego `summary`).

## Cómo implementarlo (sugerencia)

1. **Un hub en memoria** (singleton) que reparta mensajes a los suscriptores, p. ej. con `System.Threading.Channels` (un `Channel<T>` por conexión) o `IAsyncEnumerable`. Cada conexión se registra con su clave (`userId` para notificaciones, `eventId` para afluencia) y se da de baja cuando el cliente se desconecta (`HttpContext.RequestAborted`).
2. **Publicar desde los puntos donde ya ocurre el cambio:**
   - Notificaciones: donde se hace `notifications.AddAsync(Notification.Create(...))` (p. ej. `DecideReviewHandler`, `SubmitFinalVersionHandler`). Lo más limpio es publicar **después de `SaveChangesAsync`**, para no emitir algo que no llegó a guardarse. Un decorador sobre el repositorio, un evento de dominio o un `INotificationPublisher` inyectado son opciones; elegir la que encaje con el estilo del proyecto.
   - Afluencia: en `ScanAttendanceHandler` (cuando el resultado es `Valid`) y en los comandos de registro/cancelación, también tras guardar. El `summary` se calcula con la misma consulta de `IAttendanceReadModel.GetSummaryAsync`.
3. **Endpoints:** `[HttpGet("stream")]` en `NotificationsController` y en `AttendanceController`. En .NET 10 se puede devolver `TypedResults.ServerSentEvents(IAsyncEnumerable<SseItem<T>>)`; si no encaja, escribir a mano en `Response` y hacer `FlushAsync` tras cada mensaje.
4. **Heartbeat:** enviar un comentario (`: ping\n\n`) cada 15–20 s para que ni el proxy ni el navegador den por muerta la conexión.
5. **Middleware:** comprobar que nada bufferiza la respuesta (compresión de respuesta, caché, filtros que esperen al final). Excluir `text/event-stream` de la compresión si está activa.
6. **Una sola instancia:** el hub en memoria solo funciona con una instancia del API. Si algún día hay varias, habrá que pasar a Redis pub/sub o `LISTEN/NOTIFY` de Postgres; dejarlo anotado, no implementarlo ahora.
7. Documentar los endpoints (`///` del controlador y README si el back lista sus endpoints).

## Proxy (para que funcione en Docker)

El proxy que sirve el front (`nginx`) bufferiza por defecto, y entonces los eventos llegan tarde o en bloque. Hay que añadir esto **antes** del `location /api/` general (ya está hecho en el `nginx.local.conf` de la carpeta del proyecto):

```nginx
location ~ ^/api/.+/stream$ {
    proxy_pass http://api:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
}
```

Si despliegan detrás de otro proxy o balanceador, aplicar lo mismo (sin buffer y con tiempo de lectura largo).

## Pruebas que hay que añadir

- Crear una notificación para un usuario la entrega por `GET /api/notifications/stream` de **ese** usuario y no de otro.
- Un check-in `Valid` emite `entered` y `summary` con las cifras correctas a los suscriptores de **ese** evento y no a los de otro.
- `AlreadyEntered` e `Invalid` no emiten `entered`.
- Sin sesión: `401`. Sin permiso de afluencia: se rechaza como `GET .../attendance/summary`.
- Al cerrar la conexión del cliente, el suscriptor se da de baja (no hay fugas en el hub).
- Varios suscriptores simultáneos reciben el mismo evento.

Ejecutar toda la suite (`dotnet test`) antes de terminar. Si `dotnet watch` está corriendo, bloquea las DLL: pararlo antes de compilar o probar.

## Qué NO tocar

- Los endpoints REST actuales (`GET /api/notifications`, `.../attendance/summary`, `.../registrations`): el front los sigue usando para la carga inicial y como respaldo.
- Las reglas de quién puede ver cada cosa.
- Nada del front: ya está adaptado.

## Cómo comprobarlo a mano

1. Levantar el back y el front (con el `nginx.local.conf` actualizado).
2. Con `curl -N -H "Cookie: <cookie de sesión>" http://localhost:5100/api/notifications/stream` debe quedarse abierto y mostrar `: ping` cada pocos segundos.
3. Con `profe1@test.edu.co` y `est3@test.edu.co` en dos navegadores: el estudiante entrega la versión final y el profesor ve la notificación **al instante**, sin esperar 30 s.
4. Abrir **Afluencia → Ingresados** como staff, hacer un check-in con otro navegador y ver que la persona aparece de inmediato; el texto bajo el título debe decir "en tiempo real".
5. Parar el back: el front vuelve a "se actualiza cada 4 segundos" y, al volver a levantarlo, reconecta solo.

## Entrega

- Rama propia a partir de `main` y Pull Request. Mensaje de commit claro, sin líneas de coautoría.
- Describir en la PR: los dos endpoints, los eventos y su forma, dónde se publica cada uno y las pruebas.
- Avisar al front cuando se mergee: no hay que cambiar nada, solo comprobar que el indicador dice "en tiempo real".

## Prompt sugerido para Claude

> Lee `pendiente-back-tiempo-real-sse.md` y haz la tarea descrita: crear `GET /api/notifications/stream` y `GET /api/events/{eventId}/attendance/stream` como Server-Sent Events autenticados por la cookie de sesión, con los eventos `notification`, `summary` y `entered`, un hub en memoria que se publique tras guardar en base de datos, heartbeat y baja del suscriptor al desconectarse. Verifica en el código dónde se crean las notificaciones y dónde se registra el check-in antes de cambiar nada, añade las pruebas y ejecuta `dotnet test`. No cambies los endpoints REST existentes.
