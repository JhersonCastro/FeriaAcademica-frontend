# Feria Académica · Frontend


Interfaz web de la plataforma de ferias académicas de la Universidad del Cauca. Cubre el acceso (inicio de sesión, recuperación y definición de contraseña, invitaciones), el perfil, la administración de usuarios y de ferias, el envío y la revisión de trabajos, la inscripción con QR y el check-in, las notificaciones, el informe del evento y los certificados. Está hecha con [Angular](https://angular.dev) 22 y sigue el diseño de Figma `gawasoft-mocaps`.

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
| `/admin/users` | Súper admin | Listado, detalle, creación y edición de usuarios; asignar roles por feria |
| `/admin/events` · `/admin/events/:eventId` | Súper admin | Ver las ferias; publicar, cerrar, cambiar el cupo y programar las etapas |
| `/admin/report` | Súper admin | Informe del evento con cifras de asistencia y de trabajos, observaciones y PDF |
| `/events/:eventId/invitations/new` | Profesor del evento | Invitar estudiantes o invitados |
| `/works` · `/works/new` · `/works/:workId` | Estudiante participante | Mis trabajos, crear uno nuevo, subir un PDF o un enlace, ver el estado y la retroalimentación, reemplazar la versión |
| `/reviews` · `/reviews/:workId` | Profesor del evento | Cola de trabajos asignados, iniciar la revisión y decidir (aprobado, aprobado con cambios o rechazado) |
| `/my-qr` | Con sesión | Inscribirse en una feria publicada, ver los cupos y el QR personal |
| `/events/:eventId/attendance/scan` | Súper admin, coordinador o profesor del evento | Check-in: leer QR con la cámara o escribir el código |
| `/events/:eventId/attendance` | Súper admin, coordinador o profesor del evento | Afluencia en vivo (ingresados / inscritos) |
| `/notifications` | Con sesión | Centro de notificaciones: marcar como leídas, una o todas |
| `/certificates` | Con sesión | Mis certificados (asistencia, participación y reconocimiento) y su descarga en PDF |
| `/unauthorized` | Con sesión | Aviso cuando no se tienen permisos |

### Qué puede hacer cada rol

- **Súper admin:** crear, editar, activar y desactivar usuarios; asignarles roles en cada feria; publicar y cerrar ferias, fijar el cupo y las etapas (el fin de la recepción es la fecha límite de envío); generar y guardar el informe del evento, y descargarlo en PDF.
- **Estudiante participante:** crear su trabajo, adjuntar un PDF (hasta 10 MB) o un enlace, enviarlo, retirarlo o reemplazarlo mientras la convocatoria esté abierta, y ver el estado y la retroalimentación del revisor. Se inscribe en las ferias y descarga sus certificados.
- **Profesor:** invitar estudiantes e invitados, revisar los trabajos que tiene asignados y registrar la decisión con su retroalimentación. También puede hacer el check-in y ver la afluencia.
- **Coordinador:** hacer el check-in con QR y ver la afluencia de su feria.
- **Invitado (asistente):** inscribirse en la feria, obtener su QR y descargar su certificado de asistencia.
- **Todos:** ver y marcar sus notificaciones, que se actualizan solas cada 30 segundos, con un contador en la campana y un aviso cuando llega una nueva.

El menú lateral cambia según los roles que la persona tenga en la **feria activa**, que se elige con el selector de la barra lateral.

## Estructura

```
src/app/
├── core/       Servicios de la API, sesión, interceptor 401, guards y modelos
├── shared/     Validadores y componentes reutilizables (campo de contraseña, chips...)
├── layout/     Diseño institucional (pantallas públicas) y barra lateral (área con sesión)
└── features/   Pantallas: auth, invitations, profile, home, events, attendance, works,
                reviews, notifications, certificates, reports, admin (users y events)
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
