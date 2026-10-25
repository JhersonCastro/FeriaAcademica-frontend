# Feria Académica · Frontend


Interfaz web de la plataforma de ferias académicas de la Universidad del Cauca. Incluye el acceso (inicio de sesión, recuperación y definición de contraseña, invitaciones), el perfil de cada persona y la administración de usuarios. Está hecha con [Angular](https://angular.dev) 22 y sigue el diseño de Figma `gawasoft-mocaps`.

## Requisitos

- Node.js y npm.
- La API del backend ([FeriaAcademica-backend](https://github.com/JhersonCastro/FeriaAcademica-backend)) corriendo, por defecto en `http://localhost:5100`.

## Servidor de desarrollo

```bash
npm install
npm start
```

Abre `http://localhost:4200/`. La aplicación se recarga sola cuando cambias un archivo.

La URL de la API se configura en `src/environments/environment.ts` (`apiBaseUrl`). La sesión va en una cookie `HttpOnly` (`feria.auth`), por lo que el frontend no guarda tokens y todas las llamadas se envían con credenciales. El backend ya permite CORS desde `http://localhost:4200`.

## Rutas principales

| Ruta | Quién | Para |
| --- | --- | --- |
| `/login` | Todos | Iniciar sesión |
| `/forgot-password` | Todos | Pedir el enlace de recuperación |
| `/account/set-password` · `/account/reset-password` | Todos (desde el correo) | Definir la primera contraseña o restablecerla |
| `/invitations/:token` | Todos (desde el correo) | Ver y aceptar una invitación |
| `/` · `/profile` | Con sesión | Inicio y mis datos |
| `/admin/users` | Súper admin | Listado, detalle, creación y edición de usuarios |
| `/events/:eventId/invitations/new` | Profesor del evento | Invitar estudiantes o invitados |
| `/unauthorized` | Con sesión | Aviso cuando no se tienen permisos |

## Estructura

```
src/app/
├── core/       Servicios de la API, sesión, interceptor 401, guards y modelos
├── shared/     Validadores y componentes reutilizables (campo de contraseña, chips...)
├── layout/     Diseño institucional (pantallas públicas) y barra lateral (área con sesión)
└── features/   Pantallas: auth, invitations, profile, admin/users, events, home
```

Los estilos usan variables CSS con los tokens del diseño (`src/styles.css`); no hay librerías de componentes.

## Compilar

```bash
npm run build
```

Los archivos generados quedan en `dist/`. La compilación de producción optimiza la aplicación para rendimiento y velocidad.

## Pruebas unitarias

Se ejecutan con [Vitest](https://vitest.dev/):

```bash
npm test
```

## Generar código

Angular CLI trae herramientas para generar componentes, directivas, pipes y más:

```bash
ng generate component nombre-del-componente
ng generate --help
```

## Recursos adicionales

Para más información sobre Angular CLI y sus comandos, consulta la [referencia de Angular CLI](https://angular.dev/tools/cli).
