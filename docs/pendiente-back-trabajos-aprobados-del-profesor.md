# Tarea para el back: que el profesor vea los trabajos aprobados y su versión final (`isFinal`)

Este documento está pensado para dárselo a Claude Code abierto en la carpeta de `FeriaAcademica-backend`. Contiene el contexto, lo que hay que hacer, lo que no hay que tocar y cómo comprobarlo.

## Problema

Cuando un estudiante entrega la versión final de su trabajo, **el profesor revisor no se entera ni la puede ver**:

1. Su bandeja de trabajos (`GET /api/reviews/assigned`) solo lista los trabajos pendientes de revisión. La versión final solo se puede entregar con el trabajo ya aprobado, así que en ese momento el trabajo ya salió de la bandeja.
2. Aunque el profesor llegara al trabajo, el adjunto que recibe no dice si es la versión final: el DTO de la bandeja no trae `isFinal`.
3. Entregar la versión final no genera ninguna notificación al profesor.

Resultado: el profesor aprueba un trabajo y nunca más vuelve a verlo, ni sabe si el estudiante entregó el documento definitivo.

## Causa (ya verificada en el código)

- `src/FeriaAcademica.Infrastructure/Persistence/Repositories.cs`, `AssignedWorkReadModel.ListAsync` (~línea 300): filtra `w.ProfessorId == reviewerId && (w.Status == WorkStatus.Submitted || w.Status == WorkStatus.InReview)`. Los trabajos `Admitted` y `Evaluated` no salen.
- `src/FeriaAcademica.Application/Features/Works/Queries/ListAssignedWorks/AssignedWorkDto.cs`: `ArtifactDto(Id, Type, Version, FileUrl, LinkUrl, UploadedAt)`. No incluye `IsFinal`, aunque `WorkArtifactDto` (el del estudiante en `GetWork/WorkDto.cs`) sí lo tiene.
- La lista agrupa por tipo y deja solo la versión más alta de cada uno (`GroupBy(a => a.Type).Select(g => g.MaxBy(a => a.Version))`). La versión final es un `Document` con la versión más alta, así que aparecería, pero sin marca.
- `src/FeriaAcademica.Application/Features/Works/Commands/SubmitFinalVersion/SubmitFinalVersionHandler.cs`: guarda el archivo y no crea ninguna notificación. Como referencia de estilo, `DecideReviewHandler` sí notifica al autor con `notifications.AddAsync(Notification.Create(userId, eventId, type, message, now), ct)`.
- El profesor revisor **sí** tiene permiso para descargar el archivo (`WorkFileAccess.CanRead`): solo le falta verlo y saber cuál es.

## Comportamiento esperado

1. **Marca de versión final.** `ArtifactDto` (la bandeja del profesor) incluye `isFinal` (booleano).
2. **Trabajos aprobados del profesor.** Nuevo endpoint `GET /api/reviews/approved`, con la misma forma que `GET /api/reviews/assigned` (`AssignedWorkDto` con sus adjuntos), que devuelve los trabajos del profesor en estado `Admitted` o `Evaluated`, de los más recientes a los más antiguos (por fecha de la decisión o, si no hay, por la fecha de envío). Cada adjunto trae `isFinal`.
3. **Aviso de entrega.** Al entregar la versión final, el profesor revisor del trabajo recibe una notificación con tipo `FinalVersionSubmitted`, por ejemplo: `The final version of "<título>" was submitted.` (en el mismo idioma y estilo que `WorkReviewed`).
4. `GET /api/reviews/assigned` **no cambia**: sigue devolviendo solo los trabajos pendientes de revisión.

## Cómo implementarlo

1. Añadir `bool IsFinal` al final de `ArtifactDto` y rellenarlo en `AssignedWorkReadModel` (`a.IsFinal`). Si en paralelo se está añadiendo `FileName` y `SizeBytes` al mismo record (ver `pendiente-back-nombre-del-archivo.md`), añadir los tres parámetros nuevos al final y resolver el choque al fusionar.
2. Extraer de `AssignedWorkReadModel.ListAsync` la consulta común y parametrizar el filtro de estados, o añadir un segundo método (`ListApprovedAsync`) que use `Admitted`/`Evaluated` y el orden descrito. Crear la query `ListApprovedWorksQuery` y su handler siguiendo `ListAssignedWorksQuery`.
3. En `ReviewsController`, añadir `[HttpGet("approved")]` junto a `Assigned`, con la misma autorización que ese endpoint.
4. En `SubmitFinalVersionHandler`, inyectar `INotificationRepository`, y después de `work.SubmitFinalVersion(...)` y antes de `SaveChangesAsync`, crear la notificación para `work.ProfessorId` con `participation.EventId`. Verificar que `ProfessorId` está disponible en `Work` (se usa en `AssignedWorkReadModel`).
5. Documentar el endpoint nuevo (`///` del controlador y README si el back lista sus endpoints).

## Pruebas que hay que añadir o ajustar

- `GET /api/reviews/approved` devuelve los trabajos `Admitted` y `Evaluated` del profesor, y no los `Submitted`, `InReview`, `Draft` ni `Cancelled`.
- No devuelve trabajos de otro profesor.
- El adjunto de la versión final llega con `isFinal: true`, y los demás con `false`.
- `GET /api/reviews/assigned` sigue devolviendo solo los pendientes (no regresión).
- Tras `POST /api/works/{id}/final-version`, el profesor revisor tiene una notificación `FinalVersionSubmitted` y el estudiante no.
- Un usuario sin trabajos asignados recibe una lista vacía, no un error.
- Sin sesión: `401`.

Ejecutar toda la suite (`dotnet test`) antes de terminar. Si `dotnet watch` está corriendo, bloquea las DLL: pararlo antes de compilar o probar.

## Qué NO tocar

- El comportamiento y los campos existentes de `GET /api/reviews/assigned` (salvo añadir `isFinal` a sus adjuntos).
- Las reglas de `Work.SubmitFinalVersion` (estados permitidos, una sola versión final, formato y tamaño).
- Los permisos de descarga de archivos.
- Nada del front: se adapta después, con una sección "Aprobados" en Revisar trabajos.

## Cómo comprobarlo a mano

1. Levantar el back (`dotnet run --project src/FeriaAcademica.Api --launch-profile http`, puerto 5100) con los datos de prueba.
2. Con `profe1@test.edu.co`, abrir el trabajo W3 (de `est3@test.edu.co`, en revisión) y aprobarlo.
3. Con `est3@test.edu.co`, entregar la versión final: `POST /api/works/{id}/final-version` con un PDF en el campo `file`.
4. Con `profe1@test.edu.co`: `GET /api/notifications` debe traer `FinalVersionSubmitted`, y `GET /api/reviews/approved` debe listar el trabajo con su adjunto final marcado `isFinal: true`.
5. `GET /api/reviews/assigned` ya no debe incluir ese trabajo.

## Entrega

- Rama propia a partir de `main` y Pull Request. Mensaje de commit claro, sin líneas de coautoría.
- Describir en la PR: causa, endpoint nuevo, cambio en `ArtifactDto`, la notificación y pruebas.
- Avisar al front cuando se mergee: entonces se añade la sección "Aprobados" a Revisar trabajos y se marca la versión final en la tabla del profesor.

## Prompt sugerido para Claude

> Lee `pendiente-back-trabajos-aprobados-del-profesor.md` y haz la tarea descrita: añadir `isFinal` al `ArtifactDto` de la bandeja del profesor, crear `GET /api/reviews/approved` con los trabajos `Admitted` y `Evaluated` del profesor, y notificar al profesor revisor cuando el estudiante entrega la versión final. Verifica la causa en el código antes de cambiar nada, añade las pruebas y ejecuta `dotnet test`. No cambies el comportamiento de `GET /api/reviews/assigned` ni las reglas de `Work.SubmitFinalVersion`.
