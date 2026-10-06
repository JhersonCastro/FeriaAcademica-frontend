import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataService, fechaCorta } from '../../core/data.service';
import { CATEGORIAS, ESTADOS, Evento } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { EventoFormComponent } from '../../shared/evento-form';
import { IconComponent } from '../../shared/icon';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-eventos',
  imports: [RouterLink, IconComponent, StatusBadgeComponent, EventoFormComponent],
  template: `
    <div class="toolbar card">
      <label class="search"><app-icon name="search" [size]="16" />
        <input placeholder="Buscar evento..." [value]="q()" (input)="q.set($any($event.target).value)"></label>
      <select (change)="cat.set($any($event.target).value)" aria-label="Categoría">
        <option value="">Categoría: Todos</option>@for (c of categorias; track c) { <option [value]="c">{{ c }}</option> }</select>
      <select (change)="est.set($any($event.target).value)" aria-label="Estado">
        <option value="">Estado: Todos</option>@for (s of estados; track s) { <option [value]="s">{{ s }}</option> }</select>
      <button class="btn primary new" (click)="crear.set(true)"><app-icon name="plus" [size]="16" /> Crear Nuevo Evento</button>
    </div>

    <div class="grid">
      @for (e of filtrados(); track e.id) {
        <a class="card ev" [routerLink]="['/eventos', e.id]">
          <div class="top"><span class="cat">{{ e.categoria }}</span><app-status-badge [estado]="e.estado" /></div>
          <h3>{{ e.titulo }}</h3>
          <p>Responsable: {{ e.responsable }}</p>
          <div class="meta">
            <span><app-icon name="calendar" [size]="14" /> {{ fecha(e.fecha) }}</span>
            <span><app-icon name="users" [size]="14" /> {{ e.cupos }} Cupos</span>
            <app-icon name="chevron-right" class="go" />
          </div>
        </a>
      } @empty { <p class="empty">No hay eventos que coincidan con la búsqueda.</p> }
    </div>

    @if (crear()) { <app-evento-form (guardar)="guardar($event)" (cerrar)="crear.set(false)" /> }
  `,
  styles: [`
    .toolbar { display: flex; gap: 12px; padding: 16px; margin-bottom: 24px; align-items: center; flex-wrap: wrap; }
    .search { display: flex; align-items: center; gap: 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 0 12px; width: 240px;
      input { border: 0; background: none; outline: none; padding: 10px 0; width: 100%; } }
    select { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: #fff; }
    .new { margin-left: auto; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: start; }
    .ev { padding: 18px 20px; display: block; transition: box-shadow .15s; &:hover { box-shadow: 0 4px 14px rgba(15,31,64,.1); }
      .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
      .cat { color: var(--red); font-size: 11px; font-weight: 600; text-transform: uppercase; }
      h3 { font-size: 20px; line-height: 1.25; margin-bottom: 8px; }
      p { color: var(--muted); margin: 0 0 14px; }
      .meta { border-top: 1px solid var(--border); padding-top: 12px; display: flex; gap: 16px; color: var(--muted); font-size: 13px; align-items: center;
        span { display: inline-flex; gap: 6px; align-items: center; } .go { margin-left: auto; color: var(--navy); } } }
    .empty { grid-column: 1 / -1; }
    @media (max-width: 1100px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 700px) {
      .grid { grid-template-columns: 1fr; gap: 14px; }
      .search { width: 100%; } .toolbar select { flex: 1; } .new { width: 100%; margin-left: 0; }
    }
  `],
})
export class EventosComponent {
  private data = inject(DataService);
  private toast = inject(ToastService);
  private router = inject(Router);

  protected categorias = CATEGORIAS;
  protected estados = ESTADOS;
  protected fecha = fechaCorta;
  protected q = signal('');
  protected cat = signal('');
  protected est = signal('');
  protected crear = signal(false);

  protected filtrados = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.data.eventos().filter(e =>
      (!q || `${e.titulo} ${e.responsable}`.toLowerCase().includes(q)) &&
      (!this.cat() || e.categoria === this.cat()) && (!this.est() || e.estado === this.est()));
  });

  protected guardar(e: Omit<Evento, 'id'> & { id?: number }) {
    const nuevo = this.data.guardarEvento(e);
    this.crear.set(false);
    this.toast.mostrar('Evento creado y enviado a revisión');
    this.router.navigate(['/eventos', nuevo.id]);
  }
}
