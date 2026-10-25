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

En desarrollo, `proxy.conf.json` reenvía `/api` al backend (`http://localhost:5100`), así que el navegador solo habla con el servidor de Angular: sin CORS y con la cookie de sesión `HttpOnly` (`feria.auth`) como propia. El frontend no guarda tokens. Para otra URL de API, cambia `apiBaseUrl` en `src/environments/environment.ts` o el `target` del proxy.

### Probar en el celular (escáner de QR)

La cámara solo funciona con HTTPS o en `localhost`, y el celular no alcanza el `localhost` del PC. Con el PC y el celular en la misma red:

```bash
npm run start:mobile
```

Abre en el celular `https://<IP-del-PC>:4200` (la IP sale con `ipconfig`) y acepta una vez el aviso del certificado de desarrollo. Si no carga, permite Node.js en el firewall de Windows para redes privadas.

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
| `/my-qr` | Con sesión | Inscribirse en una feria publicada y ver el QR personal |
| `/events/:eventId/attendance/scan` | Súper admin, coordinador o profesor del evento | Check-in: leer QR con la cámara |
| `/events/:eventId/attendance` | Súper admin, coordinador o profesor del evento | Afluencia en vivo (ingresados / inscritos) |
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
