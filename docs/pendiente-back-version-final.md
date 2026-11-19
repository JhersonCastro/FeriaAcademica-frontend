# Tarea para el back: entrega de la versión final con archivo (HU-030)

Este documento está pensado para dárselo a Claude Code abierto en la carpeta de `FeriaAcademica-backend`. Contiene el contexto, lo que hay que hacer, lo que no hay que tocar y cómo comprobarlo.

## Problema

`POST /api/works/{id}/final-version` no recibe un archivo: pide un JSON con `fileUrl`, `fileName` y `fileSizeBytes`, y el autor tendría que escribir a mano la URL de un archivo que no existe en ninguna parte. Un estudiante no puede entregar la versión final de su trabajo aprobado desde la aplicación.

El front ya tiene la pantalla hecha (se revirtió porque el back no la soporta; está en el commit `669ad62` del repo del front). Envía el PDF como `multipart/form-data`, igual que la subida normal de adjuntos.

## Causa (ya verificada en el código)

- `src/FeriaAcademica.Api/Controllers/WorksController.cs` (~línea 90): `SubmitFinalVersion(Guid id, SubmitFinalVersionRequest r, ...)` recibe un `SubmitFinalVersionRequest(string? FileUrl, string? FileName, long? FileSizeBytes)` en JSON y no guarda ningún archivo.
- `src/FeriaAcademica.Application/Features/Works/Commands/SubmitFinalVersion/SubmitFinalVersionCommand.cs` y `SubmitFinalVersionHandler.cs`: el comando lleva `FileUrl`, `FileName` y `FileSizeBytes`; el handler solo valida y llama a `work.SubmitFinalVersion(fileUrl, fileName, size, now)`. No usa `IFileStorage`.
- La subida normal de adjuntos sí funciona con archivo y es el modelo a seguir:
  - `WorksController.UploadArtifactFile` (`POST /api/works/{id}/artifacts/file`): `[FromForm] ArtifactType type, IFormFile file`, con `[RequestSizeLimit(ArtifactFileRules.MaxSizeBytes + 1024 * 1024)]`.
  - `UploadArtifactFileHandler`: genera `fileId`, llama a `work.AddFile(..., WorkFileLocation.Url(work.Id, fileId), ...)` (valida antes de guardar) y después `storage.SaveAsync(WorkFileLocation.Key(work.Id, fileId) + extensión, content, ct)`.
- La descarga `GET /api/works/{id}/files/{fileId}` ya existe y sirve cualquier archivo cuyo `fileUrl` salga de `WorkFileLocation`, así que la versión final quedará descargable sin trabajo extra.
- `Work.SubmitFinalVersion` (en `Domain/Works/Work.cs`, ~línea 78) ya tiene las reglas de negocio correctas: solo trabajos `Admitted` o `Evaluated`, una sola versión final, formato y tamaño con `ArtifactFileRules.Validate`. Marca el artefacto con `isFinal: true`. **Esas reglas no cambian.**
- `WorkDto` ya expone `isFinal` en cada artefacto, y el front ya lo lee.

## Comportamiento esperado

`POST /api/works/{id}/final-version` pasa a recibir `multipart/form-data` con un único campo `file` (el PDF):

1. Solo el autor del trabajo puede entregarla (`participation.EnsureOwnedBy`), igual que hoy.
2. El trabajo debe estar `Admitted` o `Evaluated` y no tener ya versión final: mismos errores de dominio de hoy.
3. Se valida formato y tamaño con `ArtifactFileRules`, antes de guardar nada en disco.
4. El archivo se guarda con `IFileStorage` bajo la misma convención de `WorkFileLocation` que usa la subida normal.
5. Responde `201 Created` con `AddedArtifact(Id, Version)`, como hoy.
6. El artefacto aparece en `GET /api/works/{id}` con `isFinal: true` y se puede descargar con `GET /api/works/{id}/files/{fileId}`.

## Cómo implementarlo

1. En `WorksController`, cambiar `SubmitFinalVersion` para que reciba `IFormFile file` (`[FromForm]`) en lugar del `SubmitFinalVersionRequest`, con el mismo `[RequestSizeLimit(ArtifactFileRules.MaxSizeBytes + 1024 * 1024)]` de `UploadArtifactFile`. Abrir el stream con `file.OpenReadStream()` y eliminar el record `SubmitFinalVersionRequest` si queda sin uso.
2. Cambiar `SubmitFinalVersionCommand` a `(Guid WorkId, Guid ActorId, string FileName, long SizeBytes, Stream Content)`, igual que `UploadArtifactFileCommand`.
3. En `SubmitFinalVersionHandler`, inyectar `IFileStorage` y seguir el patrón de `UploadArtifactFileHandler`: generar `fileId`, llamar a `work.SubmitFinalVersion(WorkFileLocation.Url(work.Id, fileId), fileName, size, now)` **antes** de guardar (así la validación falla sin dejar archivos huérfanos), guardar con `storage.SaveAsync(...)` y luego `uow.SaveChangesAsync`.
4. Comprobar si `Work.SubmitFinalVersion` o el repositorio necesitan algún ajuste para que `WorkFileLocation` reconozca el archivo en la descarga (revisar `DownloadWorkFileQuery` y cómo resuelve el `fileId` desde el `fileUrl` del artefacto).
5. Actualizar la documentación (`///` del controlador, README o `docs/` si el back documenta sus endpoints) para reflejar el nuevo contrato.

## Pruebas que hay que añadir o ajustar

`tests/FeriaAcademica.Api.Tests/FinalVersionApiTests.cs` hoy envía JSON con `PostAsJsonAsync`. Hay que pasarlo a `MultipartFormDataContent`, manteniendo los casos que ya cubre:

- Autor con trabajo aprobado entrega un PDF válido: `201` y el trabajo queda con versión final.
- Formato no permitido o archivo demasiado grande: error y no se guarda nada.
- Segunda entrega: error (ya existe versión final).
- Otro usuario que no es el autor: no puede entregarla.
- Trabajo en estado no aprobado: error.
- Trabajo inexistente: error.
- Sin sesión: `401`.
- Petición sin archivo: error claro (hoy es el caso `new { fileUrl = ... }`).

Casos nuevos:

- Tras la entrega, `GET /api/works/{id}/files/{fileId}` descarga el PDF y su contenido coincide con el enviado.
- Si la validación falla, no queda ningún archivo guardado en el almacenamiento.

`ApiFactory.cs` (~línea 135) llama a `work.SubmitFinalVersion("https://files.test/final.pdf", ...)` para preparar datos: mantenerlo funcionando con la firma nueva del dominio si esta cambia.

Ejecutar toda la suite (`dotnet test`) antes de terminar. Si `dotnet watch` está corriendo, bloquea las DLL: pararlo antes de compilar o probar.

## Qué NO tocar

- Las reglas de `Work.SubmitFinalVersion` (estados permitidos, una sola versión final, formato y tamaño).
- El `WorkDto` ni el campo `isFinal`: el front ya los usa.
- `POST /api/works/{id}/artifacts` (JSON con `fileUrl`) y `POST /api/works/{id}/artifacts/file`: no son parte de esta tarea.
- Nada del front: ya está preparado (solo hay que recuperar la pantalla revertida).

## Cómo comprobarlo a mano

1. Levantar el back (`dotnet run --project src/FeriaAcademica.Api --launch-profile http`, puerto 5100).
2. Con un participante, crear un trabajo, subir un PDF y enviarlo. Con el profesor revisor, aprobarlo (queda `Admitted`).
3. Como participante: `POST /api/works/{id}/final-version` con `multipart/form-data` y el campo `file` con un PDF. Debe responder `201`.
4. `GET /api/works/{id}`: el nuevo artefacto debe traer `isFinal: true`.
5. `GET /api/works/{id}/files/{fileId}` con el `fileId` de ese artefacto: descarga el mismo PDF.
6. Repetir el paso 3: debe rechazarlo porque ya hay versión final.

## Entrega

- Rama propia a partir de `main` y Pull Request. Mensaje de commit claro, sin líneas de coautoría.
- Describir en la PR: causa, el cambio de contrato de `final-version` (de JSON a multipart), pruebas ajustadas y nuevas.
- Avisar al front cuando se mergee: entonces se recupera la pantalla con `git revert e4a6282` en el repo del front y se prueba el flujo completo.

## Prompt sugerido para Claude

> Lee `pendiente-back-version-final.md` y haz la tarea descrita: que `POST /api/works/{id}/final-version` reciba el PDF como `multipart/form-data` (campo `file`), lo guarde con `IFileStorage` siguiendo el patrón de `UploadArtifactFile` y deje la versión final descargable por `GET /api/works/{id}/files/{fileId}`. Verifica la causa en el código antes de cambiar nada, no cambies las reglas de `Work.SubmitFinalVersion`, ajusta `FinalVersionApiTests` a multipart, añade las pruebas nuevas y ejecuta `dotnet test`.
