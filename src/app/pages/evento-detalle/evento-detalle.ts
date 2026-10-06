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
    <a routerLink="/eventos" class="back"><app-icon name="arrow-left" [size]="16" /> Volver al listado<span class="d"> de eventos</span></a>

    @if (e(); as ev) {
      <section class="card hero">
        <div>
          <div class="tags"><app-status-badge [estado]="ev.estado" /><span>{{ ev.categoria }} FIET 2026</span></div>
          <h2>{{ ev.titulo }}</h2>
          <p>{{ ev.descripcion }}</p>
        </div>
        <aside class="cupos">
          <h4>Cupos &amp; Estado</h4>
          <div><span>Cupos Totales:</span><b>{{ ev.cupos }}</b></div>
          <div><span>Inscritos actuales:</span><b class="red">{{ ev.inscritos }}</b></div>
          <div><span>Disponibles:</span><b class="green">{{ ev.cupos - ev.inscritos }}</b></div>
          <button class="btn block" (click)="reporte(ev)"><app-icon name="download" [size]="16" /> Descargar Reporte</button>
        </aside>
      </section>

      <div class="cols">
        <div class="col">
          <section class="card">
            <h3>Información General</h3>
            <p class="info"><app-icon name="calendar" /> <b>Fecha:</b> {{ fecha(ev.fecha) }}</p>
            <p class="info"><app-icon name="clock" /> <b>Hora:</b> {{ ev.hora }}</p>
            <p class="info"><app-icon name="pin" /> <b>Lugar:</b> {{ ev.lugar }}</p>
          </section>
          <section class="card resp">
            <h3>Responsables del Evento</h3>
            @for (r of ev.responsables; track r.correo) {
              <div class="r"><i>{{ r.nombre.replace('Dr. ', '').replace('Ing. ', '').replace('Dra. ', '')[0] }}</i>
                <div><strong>{{ r.nombre }}</strong><small>{{ r.cargo }} | {{ r.correo }}</small></div></div>
            } @empty { <p class="empty">Sin responsables asignados.</p> }
          </section>
        </div>
        <div class="col">
          <section class="card agenda">
            <h3>Agenda del Evento</h3>
            @for (a of ev.agenda; track a.hora) { <div class="a"><b>{{ a.hora }}</b><span>{{ a.titulo }}</span></div> }
            @empty { <p class="empty">Sin agenda registrada.</p> }
          </section>
          <section class="card actions">
            <button class="btn" (click)="editar.set(true)">Editar Evento</button>
            <button class="btn primary" (click)="estado(ev, 'Aprobado')" [disabled]="ev.estado === 'Aprobado'">Aprobar Evento</button>
            <button class="btn danger-soft" (click)="estado(ev, 'Rechazado')" [disabled]="ev.estado === 'Rechazado'">Rechazar</button>
          </section>
        </div>
      </div>

      @if (editar()) { <app-evento-form [evento]="ev" (guardar)="guardar($event)" (cerrar)="editar.set(false)" /> }
    } @else { <p class="empty">El evento no existe.</p> }
  `,
  styles: [`
    .back { display: inline-flex; align-items: center; gap: 8px; color: var(--red); font-weight: 600; margin-bottom: 20px; }
    .hero { display: grid; grid-template-columns: 1fr 340px; gap: 40px; align-items: center; margin-bottom: 24px;
      .tags { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; span { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; } }
      h2 { font-size: 36px; margin-bottom: 12px; } p { color: var(--muted); line-height: 1.6; margin: 0; } }
    .cupos { background: var(--bg); border-radius: 10px; padding: 20px;
      h4 { margin: 0 0 12px; font-size: 12px; text-transform: uppercase; }
      > div { display: flex; justify-content: space-between; margin-bottom: 10px; color: var(--muted); b { font-size: 16px; color: var(--navy); } }
      .red { color: var(--red) !important; } .green { color: var(--green) !important; }
      .btn { margin-top: 8px; border-top: 1px solid var(--border); } }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
    .col { display: flex; flex-direction: column; gap: 24px; }
    h3 { font-size: 22px; margin-bottom: 16px; }
    .info { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; app-icon { color: var(--red); } }
    .r { display: flex; gap: 12px; align-items: center; margin-bottom: 14px;
      i { font-style: normal; width: 38px; height: 38px; border-radius: 50%; background: var(--navy-soft); display: grid; place-items: center; font-weight: 700; }
      strong { display: block; } small { color: var(--muted); } }
    .a { display: grid; grid-template-columns: 90px 1fr; margin-bottom: 14px; b { color: var(--red); font-size: 13px; } }
    .actions { display: flex; gap: 12px; padding: 18px; .btn { flex: 1; } }
    .empty { color: var(--muted); }
    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; gap: 20px; padding: 18px; h2 { font-size: 28px; } }
      .cols { grid-template-columns: 1fr; } .d { display: none; }
      .actions { flex-direction: column; padding: 0; border: 0; background: none; }
    }
  `],
})
export class EventoDetalleComponent {
  id = input.required({ transform: numberAttribute });
  private data = inject(DataService);
  private toast = inject(ToastService);

  protected editar = signal(false);
  protected fecha = fechaLarga;
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
