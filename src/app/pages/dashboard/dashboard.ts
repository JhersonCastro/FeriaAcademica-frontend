import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DataService, fechaMedia } from '../../core/data.service';
import { IconComponent, IconName } from '../../shared/icon';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, IconComponent, StatusBadgeComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent {
  protected data = inject(DataService);
  protected auth = inject(AuthService);
  protected fecha = fechaMedia;

  protected tarjetas = computed<{ titulo: string; valor: number; nota: string; icono: IconName }[]>(() => {
    const s = this.data.stats();
    return [
      { titulo: 'Eventos activos', valor: s.eventosActivos, nota: `${s.programadosSemana} programados esta semana`, icono: 'calendar' },
      { titulo: 'Inscritos totales', valor: s.inscritos, nota: `+${s.nuevosHoy} nuevos hoy`, icono: 'users' },
      { titulo: 'Certificados emitidos', valor: s.certificados, nota: `${s.tasaEntrega}% de tasa de entrega`, icono: 'award' },
      { titulo: 'Empresas aliadas', valor: s.empresas, nota: `${s.empresasNuevas} nuevas en Feria 2026`, icono: 'building' },
    ];
  });
}
