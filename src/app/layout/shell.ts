import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { CrestComponent } from '../shared/crest';
import { IconComponent, IconName } from '../shared/icon';

interface NavItem { ruta: string; etiqueta: string; corta: string; icono: IconName; }

const TITULOS: Record<string, string> = {
  dashboard: 'Panel de Administración - FIET',
  eventos: 'Gestión de Eventos de la Facultad',
  inscripciones: 'Gestión de Inscripciones y Revisión',
  certificados: 'Generación y Emisión de Certificados',
};
const SUBTITULOS: Record<string, string> = {
  dashboard: 'Panel de Administración',
  eventos: 'Gestión de Eventos',
  inscripciones: 'Gestión de Inscripciones',
  certificados: 'Generación de Certificados',
};

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CrestComponent, IconComponent],
  templateUrl: './shell.html',
})
export class ShellComponent {
  protected auth = inject(AuthService);
  protected toast = inject(ToastService);
  private router = inject(Router);

  protected menuAbierto = signal(false);

  protected nav: NavItem[] = [
    { ruta: '/dashboard', etiqueta: 'Panel Principal', corta: 'Principal', icono: 'grid' },
    { ruta: '/eventos', etiqueta: 'Gestión de Eventos', corta: 'Eventos', icono: 'calendar' },
    { ruta: '/inscripciones', etiqueta: 'Inscripciones', corta: 'Inscripciones', icono: 'users' },
    { ruta: '/certificados', etiqueta: 'Certificados', corta: 'Certificados', icono: 'award' },
  ];

  private seccion = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url.split('/')[1]?.split('?')[0] ?? 'dashboard'),
    ),
    { initialValue: this.router.url.split('/')[1] ?? 'dashboard' },
  );

  protected titulo = () => (this.router.url.includes('/eventos/') ? 'Detalle del Evento Académico' : TITULOS[this.seccion()] ?? '');
  protected subtitulo = () => (this.router.url.includes('/eventos/') ? 'Detalle del Evento' : SUBTITULOS[this.seccion()] ?? '');

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.menuAbierto.set(false));
  }
}
