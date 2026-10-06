import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { RegistroService } from './core/registro.service';

const enviado: CanActivateFn = () => inject(RegistroService).proyecto().referencia ? true : inject(Router).createUrlTree(['/feria/proyecto']);
const confirmado: CanActivateFn = () => inject(RegistroService).espectador().referencia ? true : inject(Router).createUrlTree(['/feria/espectador']);
const revisable: CanActivateFn = () => inject(RegistroService).espectador().nombre ? true : inject(Router).createUrlTree(['/feria/espectador/formulario']);

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent), title: 'Iniciar sesión · FIET' },
  {
    path: 'feria',
    children: [
      { path: 'proyecto', loadComponent: () => import('./pages/publico/proyecto').then(m => m.ProyectoDescubrirComponent), title: 'Inscripción de proyecto · FIET' },
      { path: 'proyecto/equipo', loadComponent: () => import('./pages/publico/proyecto').then(m => m.ProyectoEquipoComponent), title: 'Estudiante y equipo · FIET' },
      { path: 'proyecto/informacion', loadComponent: () => import('./pages/publico/proyecto').then(m => m.ProyectoInfoComponent), title: 'Información del proyecto · FIET' },
      { path: 'proyecto/enviada', canActivate: [enviado], loadComponent: () => import('./pages/publico/proyecto').then(m => m.ProyectoEnviadaComponent), title: 'Solicitud enviada · FIET' },
      { path: 'espectador', loadComponent: () => import('./pages/publico/espectador').then(m => m.EspEventoComponent), title: 'Registro de asistencia · FIET' },
      { path: 'espectador/formulario', loadComponent: () => import('./pages/publico/espectador').then(m => m.EspFormularioComponent), title: 'Formulario de asistencia · FIET' },
      { path: 'espectador/revision', canActivate: [revisable], loadComponent: () => import('./pages/publico/espectador').then(m => m.EspRevisionComponent), title: 'Revisar inscripción · FIET' },
      { path: 'espectador/confirmada', canActivate: [confirmado], loadComponent: () => import('./pages/publico/espectador').then(m => m.EspConfirmadaComponent), title: 'Inscripción confirmada · FIET' },
      { path: '', pathMatch: 'full', redirectTo: 'espectador' },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then(m => m.ShellComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent), title: 'Panel Principal · FIET' },
      { path: 'eventos', loadComponent: () => import('./pages/eventos/eventos').then(m => m.EventosComponent), title: 'Gestión de Eventos · FIET' },
      { path: 'eventos/:id', loadComponent: () => import('./pages/evento-detalle/evento-detalle').then(m => m.EventoDetalleComponent), title: 'Detalle del Evento · FIET' },
      { path: 'inscripciones', loadComponent: () => import('./pages/inscripciones/inscripciones').then(m => m.InscripcionesComponent), title: 'Inscripciones · FIET' },
      { path: 'certificados', loadComponent: () => import('./pages/certificados/certificados').then(m => m.CertificadosComponent), title: 'Certificados · FIET' },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
