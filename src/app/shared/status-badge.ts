import { Component, computed, input } from '@angular/core';
import { EstadoRevision } from '../core/models';

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [class]="clase()">{{ estado() }}</span>`,
  styles: [`
    .badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; white-space: nowrap; }
    .aprobado { background: var(--green-soft); color: var(--green); }
    .revision { background: var(--blue-soft); color: var(--blue); }
    .cambios { background: var(--amber-soft); color: var(--amber); }
    .rechazado { background: var(--red-soft); color: var(--red); }
  `],
})
export class StatusBadgeComponent {
  estado = input.required<EstadoRevision>();
  clase = computed(() => ({
    'Aprobado': 'aprobado', 'En Revisión': 'revision', 'Aprobado con Cambios': 'cambios', 'Rechazado': 'rechazado',
  }[this.estado()]));
}
