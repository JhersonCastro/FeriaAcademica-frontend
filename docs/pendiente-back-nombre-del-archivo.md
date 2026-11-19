# Tarea para el back: guardar y devolver el nombre y el tamaño de los archivos subidos

Este documento está pensado para dárselo a Claude Code abierto en la carpeta de `FeriaAcademica-backend`. Contiene el contexto, lo que hay que hacer, lo que no hay que tocar y cómo comprobarlo.

## Problema

Cuando alguien sube un PDF a su trabajo (adjunto normal o versión final), el back lo guarda pero **pierde su nombre original y su tamaño**. `GET /api/works/{id}` devuelve cada artefacto sin esos datos, así que el front no puede mostrar qué archivo es cada uno: solo puede decir "Documento · versión 2". Tampoco puede mostrar cuánto pesa.

El front ya tiene el diseño hecho (lista de archivos con nombre, tamaño, fecha y etiquetas "Versión" y "Vigente") y ya lee los campos `fileName` y `sizeBytes` si llegan; mientras no lleguen, muestra un nombre genérico.

## Causa (ya verificada en el código)

- `src/FeriaAcademica.Domain/Works/WorkParts.cs`: la entidad `Artifact` solo tiene `Id`, `WorkId`, `Type`, `Version`, `FileUrl`, `LinkUrl`, `UploadedAt` e `IsFinal`. No hay dónde guardar el nombre ni el tamaño.
- `src/FeriaAcademica.Domain/Works/Work.cs`: `AddFile(type, fileUrl, fileName, sizeBytes, now, deadline)` y `SubmitFinalVersion(fileUrl, fileName, sizeBytes, now)` **reciben** el nombre y el tamaño, pero solo los usan para validar con `ArtifactFileRules.Validate(fileName, sizeBytes)` y los descartan: el `Artifact` se crea sin ellos.
- `src/FeriaAcademica.Application/Features/Works/Queries/GetWork/WorkDto.cs`: `WorkArtifactDto(Id, Type, Version, FileUrl, LinkUrl, UploadedAt, IsFinal)`. Se rellena en `Infrastructure/Persistence/Repositories.cs` (~línea 268).
- `src/FeriaAcademica.Application/Features/Works/Queries/ListAssignedWorks/AssignedWorkDto.cs`: `ArtifactDto(Id, Type, Version, FileUrl, LinkUrl, UploadedAt)`, que se usa en la bandeja del profesor y se rellena en `Repositories.cs` (~línea 313).
- `DownloadWorkFileHandler` pone al archivo descargado el nombre `document-v{n}.pdf`, también sin el original.

## Comportamiento esperado

1. Al subir un archivo, el nombre original (solo el nombre, sin rutas) y el tamaño en bytes quedan guardados en el artefacto.
2. `GET /api/works/{id}` devuelve en cada artefacto dos campos nuevos: `fileName` (string o `null`) y `sizeBytes` (número o `null`). Para enlaces y para archivos antiguos son `null`.
3. El mismo par de campos aparece en el `ArtifactDto` de la bandeja del profesor (`ListAssignedWorks`), para que quien revisa también vea el nombre.
4. La descarga (`GET /api/works/{id}/files/{fileId}`) usa el nombre original en `Content-Disposition` cuando existe; si no, sigue con `document-v{n}.pdf`.
5. Ningún campo existente cambia de nombre ni de tipo.

## Cómo implementarlo

1. **Dominio.** Añadir a `Artifact` las propiedades `string? FileName` y `long? SizeBytes`. Ampliar el constructor interno con esos dos parámetros opcionales. En `Work.AddFile` y `Work.SubmitFinalVersion`, pasar `fileName` y `sizeBytes` al crear el artefacto (hoy `AddArtifact` no los recibe: ampliarlo, o crear el artefacto en `AddFile` con una ruta común). Limpiar el nombre con `Path.GetFileName` y recortarlo a un máximo razonable (255).
2. **Persistencia.** Mapear las dos columnas en `WorkConfigurations.cs` (nullable; `FileName` con longitud máxima) y crear una migración. Las filas existentes quedan en `NULL`; no hace falta rellenarlas.
3. **Lecturas.** Ampliar `WorkArtifactDto` y `ArtifactDto` con `string? FileName, long? SizeBytes` **al final** del record, y rellenarlos en las dos proyecciones de `Repositories.cs`. Buscar con `grep` cualquier otro lugar que construya esos DTOs (tests, seeds).
4. **Descarga.** En `DownloadWorkFileHandler`, si el artefacto tiene `FileName`, usarlo como nombre de la descarga; si no, el nombre actual. Esto puede requerir añadir el nombre a lo que devuelve `IWorkFileReadModel.FindAsync`.
5. **Handlers.** Comprobar que `UploadArtifactFileHandler` y `SubmitFinalVersionHandler` ya tienen el nombre y el tamaño (`c.FileName`, `c.SizeBytes`) y que llegan hasta `Work`.
6. **Enlaces.** `POST /api/works/{id}/artifacts` con `fileUrl` en JSON también recibe `fileName` y `fileSizeBytes`: guardarlos igual si vienen.

## Pruebas que hay que añadir o ajustar

- Subir un PDF con `POST /api/works/{id}/artifacts/file` y comprobar que `GET /api/works/{id}` devuelve su `fileName` y `sizeBytes` correctos.
- Lo mismo con `POST /api/works/{id}/final-version`.
- Un nombre con ruta (`..\..\secreto.pdf`, `C:\carpeta\informe.pdf`) se guarda solo como el nombre final del archivo.
- Un artefacto de tipo enlace devuelve `fileName` y `sizeBytes` en `null`.
- Un archivo anterior a la migración devuelve `null` en ambos.
- La bandeja del profesor (`ListAssignedWorks`) trae los dos campos.
- La descarga usa el nombre original en `Content-Disposition`.

Ejecutar toda la suite (`dotnet test`) antes de terminar. Si `dotnet watch` está corriendo, bloquea las DLL: pararlo antes de compilar o probar.

## Qué NO tocar

- Las reglas de formato y tamaño de `ArtifactFileRules`.
- Las rutas y los permisos de los endpoints de archivos.
- El nombre con el que se guarda el archivo en disco (`WorkFileLocation`): sigue basándose en el `fileId`, no en el nombre del usuario.
- Nada del front: ya lee `fileName` y `sizeBytes` y se adapta solo.

## Cómo comprobarlo a mano

1. Levantar el back (`dotnet run --project src/FeriaAcademica.Api --launch-profile http`, puerto 5100) con la migración nueva aplicada.
2. Como participante, abrir un trabajo en borrador y subir un PDF llamado, por ejemplo, `sistema-riego.pdf`.
3. `GET /api/works/{id}`: el artefacto debe traer `"fileName": "sistema-riego.pdf"` y su `sizeBytes`.
4. En el front (http://localhost:4200, Mis trabajos > trabajo) la lista "Archivos" debe mostrar ese nombre y el tamaño en lugar de "Documento · versión 1".
5. Descargar el archivo: debe llamarse `sistema-riego.pdf`.
6. Abrir un trabajo anterior a la migración: sigue funcionando y muestra el nombre genérico.

## Entrega

- Rama propia a partir de `main` y Pull Request. Mensaje de commit claro, sin líneas de coautoría.
- Describir en la PR: causa, columnas nuevas, migración (con aviso de que los archivos antiguos quedan sin nombre) y pruebas.

## Prompt sugerido para Claude

> Lee `pendiente-back-nombre-del-archivo.md` y haz la tarea descrita: que el nombre original y el tamaño de los archivos subidos se guarden en `Artifact` y se devuelvan como `fileName` y `sizeBytes` en `GET /api/works/{id}` y en la bandeja del profesor, y que la descarga use el nombre original. Verifica la causa en el código antes de cambiar nada, crea la migración, añade las pruebas y ejecuta `dotnet test`. No cambies las reglas de `ArtifactFileRules` ni los campos existentes de los DTO.
