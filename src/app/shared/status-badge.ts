import { Component, computed, input } from '@angular/core';
import { EstadoRevision } from '../core/models';

const CLASES: Record<EstadoRevision, string> = {
  'Aprobado': 'bg-ok-soft text-ok',
  'En Revisión': 'bg-info-soft text-info',
  'Aprobado con Cambios': 'bg-warn-soft text-warn',
  'Rechazado': 'bg-brand-soft text-brand',
};

@Component({
  selector: 'app-status-badge',
  template: `<span class="inline-block rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap" [class]="clase()">{{ estado() }}</span>`,
})
export class StatusBadgeComponent {
  estado = input.required<EstadoRevision>();
  clase = computed(() => CLASES[this.estado()]);
}
