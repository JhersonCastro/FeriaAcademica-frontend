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
    <div class="card toolbar">
      <select (change)="eventoId.set(+$any($event.target).value)" aria-label="Evento">
        @for (e of data.eventos(); track e.id) { <option [value]="e.id" [selected]="e.id === eventoId()">Evento: {{ e.titulo.replace(' de Grado FIET', '') }}</option> }
      </select>
      <select (change)="est.set($any($event.target).value)" aria-label="Estado">
        <option value="">Estado: Todos</option>@for (s of estados; track s) { <option>{{ s }}</option> }
      </select>
      <span class="total">Total Registros: <b>{{ totalRegistros() }}</b></span>
    </div>

    <div class="table card">
      <div class="row head"><span>Inscrito / Empresa</span><span>Cédula/NIT</span><span>Tipo de Participante</span><span>Estado de Revisión</span><span class="r">Acciones</span></div>
      @for (i of lista(); track i.id) {
        <div class="row">
          <span><strong>{{ i.nombre }}</strong><small>{{ i.detalle }}</small></span>
          <span>{{ i.documento }}</span><span>{{ i.tipo }}</span>
          <span><app-status-badge [estado]="i.estado" /></span>
          <span class="r acts">
            <button class="ib view" (click)="ver.set(i)" aria-label="Ver"><app-icon name="eye" [size]="16" /></button>
            <button class="ib ok" (click)="cambiar(i, 'Aprobado')" aria-label="Aprobar"><app-icon name="check" [size]="16" /></button>
            <button class="ib no" (click)="cambiar(i, 'Rechazado')" aria-label="Rechazar"><app-icon name="x" [size]="16" /></button>
          </span>
        </div>
      } @empty { <p class="empty">No hay inscripciones para este filtro.</p> }
    </div>

    <div class="cards">
      @for (i of lista(); track i.id) {
        <article class="card">
          <div class="h"><div><strong>{{ i.nombre }}</strong><small>{{ i.detalle }}</small></div><app-status-badge [estado]="i.estado" /></div>
          <div class="kv"><div><label>ID / NIT</label>{{ i.documento }}</div><div class="rr"><label>Participación</label>{{ i.tipo }}</div></div>
          <div class="acts">
            <button class="ib view" (click)="ver.set(i)" aria-label="Ver"><app-icon name="eye" [size]="18" /></button>
            <button class="ib ok" (click)="cambiar(i, 'Aprobado')" aria-label="Aprobar"><app-icon name="check" [size]="18" /></button>
            <button class="ib no" (click)="cambiar(i, 'Rechazado')" aria-label="Rechazar"><app-icon name="x" [size]="18" /></button>
          </div>
        </article>
      } @empty { <p class="empty">No hay inscripciones para este filtro.</p> }
    </div>

    @if (ver(); as i) {
      <app-modal [titulo]="i.nombre" (cerrar)="ver.set(null)">
        <dl>
          <dt>Detalle</dt><dd>{{ i.detalle }}</dd>
          <dt>Cédula/NIT</dt><dd>{{ i.documento }}</dd>
          <dt>Tipo de participante</dt><dd>{{ i.tipo }}</dd>
          <dt>Correo</dt><dd>{{ i.correo }}</dd>
          <dt>Estado</dt><dd><app-status-badge [estado]="i.estado" /></dd>
        </dl>
        <div class="mact">
          <button class="btn" (click)="cambiar(i, 'Aprobado con Cambios'); ver.set(null)">Aprobar con cambios</button>
          <button class="btn primary" (click)="cambiar(i, 'Aprobado'); ver.set(null)">Aprobar</button>
          <button class="btn danger-soft" (click)="cambiar(i, 'Rechazado'); ver.set(null)">Rechazar</button>
        </div>
      </app-modal>
    }
  `,
  styles: [`
    .toolbar { display: flex; gap: 12px; align-items: center; padding: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    select { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: #fff; }
    .total { margin-left: auto; color: var(--muted); b { color: var(--navy); } }
    .table { padding: 0; overflow: hidden; }
    .row { display: grid; grid-template-columns: 2.2fr 1.3fr 1.3fr 1.6fr 1fr; gap: 12px; align-items: center; padding: 14px 18px; border-top: 1px solid var(--border);
      strong { display: block; } small { color: var(--muted); font-size: 12px; } .r { text-align: right; }
      &.head { border-top: 0; font-weight: 700; font-size: 13px; padding-top: 18px; } }
    .acts { display: flex; gap: 8px; justify-content: flex-end; }
    .ib { width: 32px; height: 28px; border: 0; border-radius: 6px; display: grid; place-items: center;
      &.view { background: var(--navy-soft); color: var(--navy); } &.ok { background: var(--green-soft); color: var(--green); } &.no { background: var(--red-soft); color: var(--red); } }
    .cards { display: none; flex-direction: column; gap: 14px; }
    .cards .card { padding: 18px;
      .h { display: flex; justify-content: space-between; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--border); strong { display: block; font-size: 17px; } small { color: var(--muted); } }
      .kv { display: flex; justify-content: space-between; margin: 12px 0; label { display: block; font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 600; } .rr { text-align: right; } }
      .ib { width: 44px; height: 38px; } }
    dl { display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin: 0 0 20px; dt { color: var(--muted); } dd { margin: 0; } }
    .mact { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
    @media (max-width: 900px) {
      .table { display: none; } .cards { display: flex; }
      .toolbar { padding: 0; border: 0; background: none; margin-bottom: 14px; select:first-child { width: 100%; } }
    }
  `],
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
