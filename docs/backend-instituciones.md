# Contrato del back: instituciones

El front ya tiene las pantallas de instituciones (`/admin/institutions`) y llama a estos endpoints. Hoy responden 404 porque el back no los tiene. Esta guía fija lo que el front envía y espera, para que el back los implemente tal cual.

La entidad `Institution` y su tabla `Institutions` ya existen (`Name` hasta 200 caracteres, único; `Acronym` hasta 30; `IsActive`). Falta exponerlas.

## Reglas generales

- Todos los endpoints exigen sesión (cookie) y el rol **súper admin**. Sin sesión: 401; sin el rol: 403.
- JSON en camelCase. Los errores usan `ProblemDetails` como el resto de la API (el front muestra `detail`).
- Los `id` son GUID.

## `GET /api/institutions`

Lista todas las instituciones, activas o no, ordenadas por nombre.

Respuesta `200`:

```json
[
  {
    "id": "0b6c1f0e-6d6b-4c1e-9a52-3f1d7a0e9c11",
    "name": "Universidad del Cauca",
    "acronym": "Unicauca",
    "isActive": true,
    "eventCount": 3
  }
]
```

| Campo        | Tipo           | Nota                                          |
| ------------ | -------------- | --------------------------------------------- |
| `id`         | string (GUID)  |                                               |
| `name`       | string         |                                               |
| `acronym`    | string \| null | `null` si no tiene                            |
| `isActive`   | boolean        |                                               |
| `eventCount` | number         | Ferias creadas en ella, en cualquier estado   |

Sin instituciones devuelve `[]`.

## `POST /api/institutions`

Crea una institución, siempre activa.

Cuerpo:

```json
{ "name": "Universidad del Cauca", "acronym": "Unicauca" }
```

| Campo     | Tipo           | Regla                                                       |
| --------- | -------------- | ----------------------------------------------------------- |
| `name`    | string         | Obligatorio, sin espacios sobrantes, máx. 200, único        |
| `acronym` | string \| null | Opcional (`null` si va vacío), máx. 30                      |

Respuesta `201` con `{ "id": "<guid>" }` (el front solo lee `id`). Errores `400` con `detail` (nombre vacío o muy largo, siglas muy largas) y `409` o `400` con `detail` si el nombre ya existe. La unicidad no debe distinguir mayúsculas.

## `PUT /api/institutions/{id}`

Cambia el nombre y las siglas. Mismo cuerpo y mismas reglas que el `POST`. Respuesta `204` sin cuerpo. `404` si no existe. El `id` y el estado no cambian.

## `POST /api/institutions/{id}/deactivate`

Sin cuerpo. Respuesta `204`. Una institución inactiva deja de poder recibir ferias nuevas; sus ferias existentes siguen igual. `404` si no existe; `400` con `detail` si ya está inactiva.

## `POST /api/institutions/{id}/activate`

Sin cuerpo. Respuesta `204`. `404` si no existe; `400` con `detail` si ya está activa.

## Cambio en endpoints existentes

- `POST /api/events` debe rechazar con `400` y `detail` una `institutionId` que no exista o que esté inactiva.

## Cómo lo usa el front

| Pantalla                                | Llamadas                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| Instituciones (`/admin/institutions`)   | `GET` para la tabla; `POST .../activate` y `.../deactivate` desde el botón de la fila |
| Crear institución (`/admin/institutions/new`) | `POST /api/institutions`                                                      |
| Editar institución (`/admin/institutions/:id`) | `GET /api/institutions` (busca la fila por `id`) y `PUT /api/institutions/{id}` |
| Crear feria (`/admin/events/new`)       | `GET /api/institutions`: ofrece solo las que tienen `isActive = true`               |

Mientras `GET /api/institutions` responda 404, "Crear feria" toma las instituciones de las ferias existentes. Ese respaldo se quita del front cuando el endpoint exista.

El front no usa `GET /api/institutions/{id}` ni borra instituciones.
