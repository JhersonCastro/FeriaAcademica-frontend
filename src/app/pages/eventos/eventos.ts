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
    <div class="card mb-6 flex flex-wrap items-center gap-3 p-4">
      <label class="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 sm:w-60"><app-icon name="search" [size]="16" />
        <input class="w-full border-0 bg-transparent py-2.5 outline-none" placeholder="Buscar evento..." [value]="q()" (input)="q.set($any($event.target).value)"></label>
      <select class="flex-1 rounded-lg border border-line bg-white px-3 py-2.5 sm:flex-none" (change)="cat.set($any($event.target).value)" aria-label="Categoría">
        <option value="">Categoría: Todos</option>@for (c of categorias; track c) { <option [value]="c">{{ c }}</option> }</select>
      <select class="flex-1 rounded-lg border border-line bg-white px-3 py-2.5 sm:flex-none" (change)="est.set($any($event.target).value)" aria-label="Estado">
        <option value="">Estado: Todos</option>@for (s of estados; track s) { <option [value]="s">{{ s }}</option> }</select>
      <button class="btn btn-primary w-full sm:ml-auto sm:w-auto" (click)="crear.set(true)"><app-icon name="plus" [size]="16" /> Crear Nuevo Evento</button>
    </div>

    <div class="grid items-start gap-3.5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
      @for (e of filtrados(); track e.id) {
        <a class="card block px-5 py-4.5 transition-shadow hover:shadow-md" [routerLink]="['/eventos', e.id]">
          <div class="mb-3.5 flex items-center justify-between"><span class="text-[11px] font-semibold text-brand uppercase">{{ e.categoria }}</span><app-status-badge [estado]="e.estado" /></div>
          <h3 class="mb-2 text-xl leading-tight">{{ e.titulo }}</h3>
          <p class="mb-3.5 text-muted">Responsable: {{ e.responsable }}</p>
          <div class="flex items-center gap-4 border-t border-line pt-3 text-[13px] text-muted">
            <span class="inline-flex items-center gap-1.5"><app-icon name="calendar" [size]="14" /> {{ fecha(e.fecha) }}</span>
            <span class="inline-flex items-center gap-1.5"><app-icon name="users" [size]="14" /> {{ e.cupos }} Cupos</span>
            <app-icon name="chevron-right" class="ml-auto text-navy" />
          </div>
        </a>
      } @empty { <p class="col-span-full py-10 text-center text-muted">No hay eventos que coincidan con la búsqueda.</p> }
    </div>

    @if (crear()) { <app-evento-form (guardar)="guardar($event)" (cerrar)="crear.set(false)" /> }
  `,
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
