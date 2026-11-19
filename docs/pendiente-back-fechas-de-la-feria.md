# Tarea para el back: fechas de la feria (`startDate` / `endDate`)

Este documento está pensado para dárselo a Claude Code abierto en la carpeta de `FeriaAcademica-backend`. Contiene el contexto, lo que hay que hacer, lo que no hay que tocar y cómo comprobarlo.

## Problema

`GET /api/events` devuelve siempre `startDate: null` y `endDate: null` en todas las ferias, aunque ya tengan etapas programadas. El front (Angular) muestra "Sin programar" en la columna "Fechas" del listado de ferias porque recibe esas fechas vacías.

## Causa (ya verificada en el código)

- `src/FeriaAcademica.Domain/Events/AcademicEvent.cs` declara `public DateTime? StartDate { get; private set; }` y `public DateTime? EndDate { get; private set; }`, pero **nada las asigna**: `Create` no las recibe y `ScheduleStage` y `RemoveStage` no las actualizan.
- `src/FeriaAcademica.Infrastructure/Persistence/Repositories.cs` (`EventRepository`, consulta de listado, ~línea 48) las proyecta tal cual al `EventDto`. Por eso siempre salen `null`.
- `src/FeriaAcademica.Application/Features/Events/Queries/ListEvents/EventDto.cs` ya tiene `DateTime? StartDate, DateTime? EndDate`: el contrato de la API no cambia.
- Como referencia de estilo, `SubmissionDeadline` ya se calcula desde las etapas, tanto en `AcademicEvent` (propiedad calculada sobre `_stages`) como en la consulta del repositorio (subconsulta sobre `db.EventStages`).

## Comportamiento esperado

Las fechas de la feria son las de su cronograma:

- `startDate` = el `StartDate` **más temprano** entre las etapas activas que tengan fechas.
- `endDate` = el `EndDate` **más tardío** entre esas mismas etapas.
- Si ninguna etapa tiene fechas, ambas son `null`.
- Las etapas con `Status == StageStatus.Disabled` (quitadas del cronograma) **no cuentan**.
- Si se programa, cambia o quita una etapa, las fechas de la feria cambian en consecuencia.

## Cómo implementarlo (recomendado: calcular, sin columna)

1. En `AcademicEvent`, convertir `StartDate` y `EndDate` en propiedades calculadas sobre `_stages`, igual que `SubmissionDeadline`: mínimo de `StartDate` y máximo de `EndDate` entre las etapas no `Disabled` con fecha.
2. En `Repositories.cs`, en la consulta de listado de ferias, calcular `Min` y `Max` con una subconsulta sobre `db.EventStages` (mismo filtro: misma feria, `Status != StageStatus.Disabled`, fecha no nula), como ya se hace con `SubmissionDeadline`. Cuidar que EF Core pueda traducirla a SQL.
3. Quitar las dos propiedades del mapeo de EF (si están mapeadas como columnas) y crear una migración que elimine las columnas `StartDate` y `EndDate` de la tabla de ferias. Revisar la configuración de entidad en `Infrastructure/Persistence` (buscar `StartDate`).
4. Buscar con `grep` cualquier otro uso de `AcademicEvent.StartDate` o `EndDate` (comandos, otras consultas, seeds, tests) y ajustarlo.

Alternativa más rápida pero más frágil: mantener las columnas y recalcularlas dentro de `ScheduleStage`, `RemoveStage` y al activar o desactivar una etapa, más un script que rellene las ferias existentes. Solo elegirla si hay una razón para conservar las columnas.

## Pruebas que hay que añadir o ajustar

- Feria sin etapas programadas: `startDate` y `endDate` son `null`.
- Dos o más etapas programadas: `startDate` es la fecha de inicio más temprana y `endDate` la fecha de fin más tardía.
- Quitar (`RemoveStage`) la etapa que marcaba un extremo: las fechas se recalculan.
- Una etapa `Disabled` con fechas no cuenta.
- La consulta del listado (`GET /api/events`) devuelve las fechas calculadas.

Ejecutar toda la suite (`dotnet test`) antes de terminar. Si `dotnet watch` está corriendo, bloquea las DLL: pararlo antes de compilar o probar.

## Qué NO tocar

- El contrato de `GET /api/events` (nombres y tipos de los campos del `EventDto`).
- El comportamiento del `PUT /api/events/{id}/stages/{type}`: debe seguir siendo una actualización, no un error si la etapa ya existe.
- Nada del front: no necesita cambios.

## Cómo comprobarlo a mano

1. Levantar el back (`dotnet run --project src/FeriaAcademica.Api --launch-profile http`, puerto 5100) con la base de datos aplicada con la migración nueva.
2. Iniciar sesión como `admin@unicauca.edu.co` y crear una feria con `POST /api/events`.
3. Programar dos etapas con `PUT /api/events/{id}/stages/{type}` (cuerpo `{ "startDate": "...", "endDate": "..." }`, instantes ISO 8601 en UTC).
4. `GET /api/events`: la feria debe traer `startDate` y `endDate` calculados.
5. En el front (http://localhost:4200, pantalla Ferias) la columna "Fechas" debe mostrar el rango en lugar de "Sin programar".

## Entrega

- Rama propia a partir de `main` y Pull Request. Mensaje de commit claro, sin líneas de coautoría.
- Describir en la PR: causa, solución elegida (calculada o columna), migración y pruebas.

## Prompt sugerido para Claude

> Lee `pendiente-back-fechas-de-la-feria.md` y haz la tarea descrita: que `GET /api/events` devuelva `startDate` y `endDate` calculados desde las etapas activas con fechas. Verifica la causa en el código antes de cambiar nada, implementa la opción recomendada, crea la migración, añade las pruebas y ejecuta `dotnet test`. No toques el contrato del `EventDto` ni el `PUT` de etapas.
