import { Component, computed, inject, signal } from '@angular/core';
import { DataService } from '../../core/data.service';
import { ESTADOS, EstadoRevision, Inscripcion } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/icon';
import { ModalComponent } from '../../shared/modal';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-inscripciones',
  imports: [IconComponent, StatusBadgeComponent, ModalComponent],
  template: `
    <div class="card mb-6 flex flex-wrap items-center gap-3 p-4 max-lg:border-0 max-lg:bg-transparent max-lg:p-0">
      <select class="w-full rounded-lg border border-line bg-white px-3 py-2.5 sm:w-auto" (change)="eventoId.set(+$any($event.target).value)" aria-label="Evento">
        @for (e of data.eventos(); track e.id) { <option [value]="e.id" [selected]="e.id === eventoId()">Evento: {{ e.titulo.replace(' de Grado FIET', '') }}</option> }
      </select>
      <select class="rounded-lg border border-line bg-white px-3 py-2.5" (change)="est.set($any($event.target).value)" aria-label="Estado">
        <option value="">Estado: Todos</option>@for (s of estados; track s) { <option>{{ s }}</option> }
      </select>
      <span class="ml-auto text-muted">Total Registros: <b class="text-navy">{{ totalRegistros() }}</b></span>
    </div>

    <div class="card hidden overflow-hidden p-0 lg:block">
      <div class="grid grid-cols-[2.2fr_1.3fr_1.3fr_1.6fr_1fr] items-center gap-3 px-4.5 pt-4.5 pb-3.5 text-[13px] font-bold">
        <span>Inscrito / Empresa</span><span>Cédula/NIT</span><span>Tipo de Participante</span><span>Estado de Revisión</span><span class="text-right">Acciones</span>
      </div>
      @for (i of lista(); track i.id) {
        <div class="grid grid-cols-[2.2fr_1.3fr_1.3fr_1.6fr_1fr] items-center gap-3 border-t border-line px-4.5 py-3.5">
          <span><strong class="block">{{ i.nombre }}</strong><small class="text-xs text-muted">{{ i.detalle }}</small></span>
          <span>{{ i.documento }}</span><span>{{ i.tipo }}</span>
          <span><app-status-badge [estado]="i.estado" /></span>
          <span class="flex justify-end gap-2">
            <button class="grid h-7 w-8 place-items-center rounded-md border-0 bg-navy-soft text-navy" (click)="ver.set(i)" aria-label="Ver"><app-icon name="eye" [size]="16" /></button>
            <button class="grid h-7 w-8 place-items-center rounded-md border-0 bg-ok-soft text-ok" (click)="cambiar(i, 'Aprobado')" aria-label="Aprobar"><app-icon name="check" [size]="16" /></button>
            <button class="grid h-7 w-8 place-items-center rounded-md border-0 bg-brand-soft text-brand" (click)="cambiar(i, 'Rechazado')" aria-label="Rechazar"><app-icon name="x" [size]="16" /></button>
          </span>
        </div>
      } @empty { <p class="py-10 text-center text-muted">No hay inscripciones para este filtro.</p> }
    </div>

    <div class="flex flex-col gap-3.5 lg:hidden">
      @for (i of lista(); track i.id) {
        <article class="card p-4.5">
          <div class="flex justify-between gap-2 border-b border-line pb-3"><div><strong class="block text-[17px]">{{ i.nombre }}</strong><small class="text-muted">{{ i.detalle }}</small></div><app-status-badge [estado]="i.estado" /></div>
          <div class="my-3 flex justify-between">
            <div><label class="block text-[11px] font-semibold text-muted uppercase">ID / NIT</label>{{ i.documento }}</div>
            <div class="text-right"><label class="block text-[11px] font-semibold text-muted uppercase">Participación</label>{{ i.tipo }}</div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="grid h-[38px] w-11 place-items-center rounded-md border-0 bg-navy-soft text-navy" (click)="ver.set(i)" aria-label="Ver"><app-icon name="eye" [size]="18" /></button>
            <button class="grid h-[38px] w-11 place-items-center rounded-md border-0 bg-ok-soft text-ok" (click)="cambiar(i, 'Aprobado')" aria-label="Aprobar"><app-icon name="check" [size]="18" /></button>
            <button class="grid h-[38px] w-11 place-items-center rounded-md border-0 bg-brand-soft text-brand" (click)="cambiar(i, 'Rechazado')" aria-label="Rechazar"><app-icon name="x" [size]="18" /></button>
          </div>
        </article>
      } @empty { <p class="py-10 text-center text-muted">No hay inscripciones para este filtro.</p> }
    </div>

    @if (ver(); as i) {
      <app-modal [titulo]="i.nombre" (cerrar)="ver.set(null)">
        <dl class="m-0 mb-5 grid grid-cols-[150px_1fr] gap-2.5">
          <dt class="text-muted">Detalle</dt><dd class="m-0">{{ i.detalle }}</dd>
          <dt class="text-muted">Cédula/NIT</dt><dd class="m-0">{{ i.documento }}</dd>
          <dt class="text-muted">Tipo de participante</dt><dd class="m-0">{{ i.tipo }}</dd>
          <dt class="text-muted">Correo</dt><dd class="m-0">{{ i.correo }}</dd>
          <dt class="text-muted">Estado</dt><dd class="m-0"><app-status-badge [estado]="i.estado" /></dd>
        </dl>
        <div class="flex flex-wrap justify-end gap-2.5">
          <button class="btn" (click)="cambiar(i, 'Aprobado con Cambios'); ver.set(null)">Aprobar con cambios</button>
          <button class="btn btn-primary" (click)="cambiar(i, 'Aprobado'); ver.set(null)">Aprobar</button>
          <button class="btn btn-danger-soft" (click)="cambiar(i, 'Rechazado'); ver.set(null)">Rechazar</button>
        </div>
      </app-modal>
    }
  `,
})
export class InscripcionesComponent {
  protected data = inject(DataService);
  private toast = inject(ToastService);

  protected estados = ESTADOS;
  protected eventoId = signal(1);
  protected est = signal('');
  protected ver = signal<Inscripcion | null>(null);

  protected lista = computed(() => this.data.inscripciones().filter(i =>
    i.eventoId === this.eventoId() && (!this.est() || i.estado === this.est())));

  protected totalRegistros = computed(() => this.data.evento(this.eventoId())?.inscritos ?? 0);

  protected cambiar(i: Inscripcion, estado: EstadoRevision) {
    this.data.cambiarEstadoInscripcion(i.id, estado);
    this.toast.mostrar(`${i.nombre}: ${estado}`);
  }
}
