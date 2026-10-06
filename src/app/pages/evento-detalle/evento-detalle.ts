import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService, fechaLarga } from '../../core/data.service';
import { Evento } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { EventoFormComponent } from '../../shared/evento-form';
import { IconComponent } from '../../shared/icon';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-evento-detalle',
  imports: [RouterLink, IconComponent, StatusBadgeComponent, EventoFormComponent],
  template: `
    <a routerLink="/eventos" class="mb-5 inline-flex items-center gap-2 font-semibold text-brand"><app-icon name="arrow-left" [size]="16" /> Volver al listado<span class="hidden lg:inline"> de eventos</span></a>

    @if (e(); as ev) {
      <section class="card mb-6 grid items-center gap-5 p-4.5 lg:grid-cols-[1fr_340px] lg:gap-10 lg:p-6">
        <div>
          <div class="mb-3.5 flex items-center gap-3"><app-status-badge [estado]="ev.estado" /><span class="text-xs font-semibold text-muted uppercase">{{ ev.categoria }} FIET 2026</span></div>
          <h2 class="mb-3 text-[28px] lg:text-4xl">{{ ev.titulo }}</h2>
          <p class="m-0 leading-relaxed text-muted">{{ ev.descripcion }}</p>
        </div>
        <aside class="rounded-[10px] bg-surface p-5">
          <h4 class="mb-3 font-sans text-xs uppercase">Cupos &amp; Estado</h4>
          <div class="mb-2.5 flex justify-between text-muted"><span>Cupos Totales:</span><b class="text-base text-navy">{{ ev.cupos }}</b></div>
          <div class="mb-2.5 flex justify-between text-muted"><span>Inscritos actuales:</span><b class="text-base text-brand">{{ ev.inscritos }}</b></div>
          <div class="mb-2.5 flex justify-between text-muted"><span>Disponibles:</span><b class="text-base text-ok">{{ ev.cupos - ev.inscritos }}</b></div>
          <button class="btn mt-2 w-full" (click)="reporte(ev)"><app-icon name="download" [size]="16" /> Descargar Reporte</button>
        </aside>
      </section>

      <div class="grid items-start gap-6 lg:grid-cols-2">
        <div class="flex flex-col gap-6">
          <section class="card">
            <h3 class="mb-4 text-[22px]">Información General</h3>
            <p class="mb-3 flex items-center gap-2.5"><app-icon class="text-brand" name="calendar" /> <b>Fecha:</b> {{ fecha(ev.fecha) }}</p>
            <p class="mb-3 flex items-center gap-2.5"><app-icon class="text-brand" name="clock" /> <b>Hora:</b> {{ ev.hora }}</p>
            <p class="m-0 flex items-center gap-2.5"><app-icon class="text-brand" name="pin" /> <b>Lugar:</b> {{ ev.lugar }}</p>
          </section>
          <section class="card">
            <h3 class="mb-4 text-[22px]">Responsables del Evento</h3>
            @for (r of ev.responsables; track r.correo) {
              <div class="mb-3.5 flex items-center gap-3">
                <i class="grid size-[38px] shrink-0 place-items-center rounded-full bg-navy-soft font-bold not-italic">{{ inicial(r.nombre) }}</i>
                <div><strong class="block">{{ r.nombre }}</strong><small class="text-muted">{{ r.cargo }} | {{ r.correo }}</small></div>
              </div>
            } @empty { <p class="text-muted">Sin responsables asignados.</p> }
          </section>
        </div>
        <div class="flex flex-col gap-6">
          <section class="card">
            <h3 class="mb-4 text-[22px]">Agenda del Evento</h3>
            @for (a of ev.agenda; track a.hora) { <div class="mb-3.5 grid grid-cols-[90px_1fr]"><b class="text-[13px] text-brand">{{ a.hora }}</b><span>{{ a.titulo }}</span></div> }
            @empty { <p class="text-muted">Sin agenda registrada.</p> }
          </section>
          <section class="flex flex-col gap-3 sm:flex-row lg:card lg:p-4.5">
            <button class="btn flex-1" (click)="editar.set(true)">Editar Evento</button>
            <button class="btn btn-primary flex-1" (click)="estado(ev, 'Aprobado')" [disabled]="ev.estado === 'Aprobado'">Aprobar Evento</button>
            <button class="btn btn-danger-soft flex-1" (click)="estado(ev, 'Rechazado')" [disabled]="ev.estado === 'Rechazado'">Rechazar</button>
          </section>
        </div>
      </div>

      @if (editar()) { <app-evento-form [evento]="ev" (guardar)="guardar($event)" (cerrar)="editar.set(false)" /> }
    } @else { <p class="py-10 text-center text-muted">El evento no existe.</p> }
  `,
})
export class EventoDetalleComponent {
  id = input.required({ transform: numberAttribute });
  private data = inject(DataService);
  private toast = inject(ToastService);

  protected editar = signal(false);
  protected fecha = fechaLarga;
  protected inicial = (n: string) => n.replace(/^(Dr\.|Dra\.|Ing\.|Lic\.)\s*/, '')[0];
  protected e = computed(() => this.data.eventos().find(x => x.id === this.id()));

  protected estado(ev: Evento, estado: 'Aprobado' | 'Rechazado') {
    this.data.cambiarEstadoEvento(ev.id, estado);
    this.toast.mostrar(estado === 'Aprobado' ? 'Evento aprobado' : 'Evento rechazado');
  }

  protected guardar(ev: Omit<Evento, 'id'> & { id?: number }) {
    this.data.guardarEvento(ev);
    this.editar.set(false);
    this.toast.mostrar('Evento actualizado');
  }

  protected reporte(ev: Evento) {
    const filas = this.data.inscripciones().filter(i => i.eventoId === ev.id);
    const csv = ['Nombre,Documento,Tipo,Estado,Correo',
      ...filas.map(i => [i.nombre, i.documento, i.tipo, i.estado, i.correo].map(v => `"${v}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `reporte-evento-${ev.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
