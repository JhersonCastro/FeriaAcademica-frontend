# Tarea para el back: estado de las etapas según la fecha actual (`Scheduled` / `Open` / `Closed`)

Este documento está pensado para dárselo a Claude Code abierto en la carpeta de `FeriaAcademica-backend`. Contiene el contexto, lo que hay que hacer, lo que no hay que tocar y cómo comprobarlo.

## Problema

Todas las etapas de una feria aparecen siempre como "Pendiente" (`Scheduled`) en `GET /api/events/{id}/stages`, aunque su fecha de inicio ya haya pasado o la etapa ya haya terminado. Nunca llegan a `Open` ("En curso") ni a `Closed` ("Finalizada").

El front ya lo resuelve por su cuenta comparando las fechas con la hora del navegador, pero eso es solo un parche visual: el back es quien debe decir en qué etapa está la feria, para que todos los usuarios y todas las reglas vean lo mismo.

## Causa (ya verificada en el código)

- `src/FeriaAcademica.Domain/Events/EventStage.cs` define `public enum StageStatus { Disabled, Scheduled, Open, Closed }`, pero las únicas asignaciones a `Status` son `Scheduled` (en `Create` y en `Schedule`) y `Disabled` (en `Disable`). **Nada asigna `Open` ni `Closed`.** Se comprobó buscando `StageStatus.Open`, `StageStatus.Closed` y `Status =` en todo el código.
- `Application/Features/Events/Queries/ListEventStages/ListEventStagesQuery.cs` documenta el estado como "Scheduled, Open or Closed", así que el contrato ya promete tres valores; hoy solo sale uno.
- `Status` se guarda como columna de `EventStage`, pero no hay ningún proceso que la actualice cuando pasa el tiempo.

## Comportamiento esperado

El estado de una etapa activa depende de la hora actual (UTC) y de sus fechas:

- `Scheduled`: ahora es **anterior** a `StartDate`.
- `Open`: ahora está **entre** `StartDate` (incluido) y `EndDate` (excluido).
- `Closed`: ahora es **igual o posterior** a `EndDate`.
- Una etapa activa sin fechas se queda en `Scheduled`.
- `Disabled` (etapa quitada del cronograma) no cambia: sigue fuera del cronograma y sin fechas.

`GET /api/events/{id}/stages` debe devolver ese estado calculado.

## Cómo implementarlo (recomendado: calcular, sin guardar)

1. Dejar de depender de la columna `Status` para los estados dependientes del tiempo. Añadir en `EventStage` un método que reciba la hora actual y devuelva el estado efectivo, por ejemplo `StageStatus StatusAt(DateTime now)`, con las reglas de arriba y devolviendo `Disabled` cuando la etapa lo esté.
2. Usar ese método en `ListEventStagesQuery` (y su handler) para rellenar el campo `Status` del DTO, en lugar de leer la columna.
3. Obtener la hora por la abstracción de reloj que use el proyecto (revisar si hay un `IClock` o `TimeProvider`; si no, seguir lo que ya hace `Submit`, que recibe `now`). No usar `DateTime.UtcNow` directo si hay una abstracción, para poder probarlo.
4. Decidir si la columna `Status` se conserva solo para `Disabled`/activa o se simplifica. Lo mínimo es no tocar el esquema: seguir guardando `Disabled`/`Scheduled` y calcular `Open`/`Closed` al leer. Si se decide cambiar el esquema, hace falta migración.
5. Buscar con `grep` otros usos de `StageStatus` y de `EventStage.Status` (consultas, `Repositories.cs`, comandos) y comprobar que ninguno depende de que `Open` o `Closed` se guarden. Los filtros `Status != StageStatus.Disabled` siguen valiendo.

Alternativa más frágil: un proceso en segundo plano que actualice la columna periódicamente. Solo elegirla si algo más del sistema necesita el estado guardado en la base.

## Pruebas que hay que añadir o ajustar

- Etapa con inicio en el futuro: `Scheduled`.
- Etapa en curso (ahora entre inicio y fin): `Open`.
- Etapa ya terminada: `Closed`.
- Los límites: justo en `StartDate` es `Open`, justo en `EndDate` es `Closed`.
- Etapa sin fechas: `Scheduled`.
- Etapa quitada (`Disabled`): sigue `Disabled`, no sale en el listado de etapas.
- `GET /api/events/{id}/stages` devuelve los estados calculados con una hora controlada (reloj de prueba).

Ejecutar toda la suite (`dotnet test`) antes de terminar. Si `dotnet watch` está corriendo, bloquea las DLL: pararlo antes de compilar o probar.

## Qué NO tocar

- El contrato de `GET /api/events/{id}/stages` (nombres y tipos de los campos del DTO): solo cambia el valor que llega en `status`.
- El comportamiento de `PUT /api/events/{id}/stages/{type}`: debe seguir siendo una actualización, no un error si la etapa ya existe.
- Las reglas de fechas al programar una etapa (`endDate` posterior a `startDate`).
- Nada del front: ya tiene un cálculo local que respeta lo que mande el back. Si el back devuelve `Open` o `Closed`, el front lo usa tal cual; si devuelve `Scheduled`, sigue comparando con las fechas.

## Cómo comprobarlo a mano

1. Levantar el back (`dotnet run --project src/FeriaAcademica.Api --launch-profile http`, puerto 5100).
2. Iniciar sesión como `admin@unicauca.edu.co` y crear una feria con `POST /api/events`.
3. Programar tres etapas con `PUT /api/events/{id}/stages/{type}` (cuerpo `{ "startDate": "...", "endDate": "..." }`, instantes ISO 8601 en UTC): una que ya terminó, una que incluya la hora actual y una en el futuro.
4. `GET /api/events/{id}/stages`: deben salir `Closed`, `Open` y `Scheduled`, en ese orden.
5. En el front (http://localhost:4200, Ferias > Configurar), la línea de tiempo debe mostrar "Finalizada", "En curso" y "Pendiente".

## Entrega

- Rama propia a partir de `main` y Pull Request. Mensaje de commit claro, sin líneas de coautoría.
- Describir en la PR: causa, solución elegida (calculada o guardada) y pruebas.
- Avisar al front cuando se mergee: se puede quitar el cálculo local de `stageStatusAt` en `core/events/stage-plan.ts`, aunque no estorba si se queda.

## Prompt sugerido para Claude

> Lee `pendiente-back-estado-de-las-etapas.md` y haz la tarea descrita: que `GET /api/events/{id}/stages` devuelva el estado de cada etapa (`Scheduled`, `Open`, `Closed`) calculado según la hora actual y sus fechas. Verifica la causa en el código antes de cambiar nada, implementa la opción recomendada con el reloj abstraído, añade las pruebas y ejecuta `dotnet test`. No toques el contrato del DTO ni el `PUT` de etapas.
