# FeriaAcademica-frontend

Plataforma de Gestión de Eventos Académicos · FIET · Universidad del Cauca (Angular, standalone + signals).

## Pantallas
- **Administración** (login requerido): `/login`, `/dashboard`, `/eventos`, `/eventos/:id`, `/inscripciones`, `/certificados`.
- **Recorrido del estudiante expositor**: `/feria/proyecto` → `equipo` → `informacion` → `enviada`.
- **Recorrido del espectador**: `/feria/espectador` → `formulario` → `revision` → `confirmada`.

Diseño responsive (desktop y móvil con navegación inferior). Los datos son simulados (`core/data.service.ts`); la sesión es simulada (cualquier correo `@unicauca.edu.co` con contraseña de 6+ caracteres, o el botón de Google Workspace).

## Desarrollo
```bash
npm install
npm start      # http://localhost:4200
npm run build
```
