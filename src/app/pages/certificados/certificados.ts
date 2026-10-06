import { Component, computed, inject, signal } from '@angular/core';
import { DataService, fechaCert } from '../../core/data.service';
import { Certificado } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { CrestComponent } from '../../shared/crest';
import { IconComponent } from '../../shared/icon';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-certificados',
  imports: [IconComponent, StatusBadgeComponent, CrestComponent],
  template: `
    <div class="layout">
      <section class="list">
        <h3>Inscritos Aptos para Certificación</h3>
        <div class="card bar">
          <label class="search"><app-icon name="search" [size]="16" />
            <input placeholder="Buscar participante..." (input)="q.set($any($event.target).value)"></label>
          <button class="btn danger" (click)="emitir()">Emitir Seleccionados{{ marcados().size ? ' (' + marcados().size + ')' : '' }}</button>
        </div>
        @for (c of filtrados(); track c.id) {
          <div class="card item" [class.sel]="c.id === seleccionado().id" (click)="sel.set(c.id)" tabindex="0" (keydown.enter)="sel.set(c.id)">
            @if (c.estado === 'Aprobado' && !c.emitido) {
              <input type="checkbox" [checked]="marcados().has(c.id)" (click)="$event.stopPropagation(); marcar(c.id)" aria-label="Seleccionar para emitir">
            } @else { <app-icon name="award" [size]="22" /> }
            <div class="txt">
              <strong>{{ c.participante }}</strong><span>{{ c.evento }}</span>
              <small>{{ nota(c) }}</small>
            </div>
            <app-status-badge [estado]="c.estado" />
            <app-icon name="chevron-right" />
          </div>
        }
      </section>

      <section class="card prev">
        <h3>Vista Previa del Certificado</h3>
        <div class="cert">
          <div class="head"><app-crest [size]="44" /><div><b>Universidad del Cauca</b><span>FACULTAD DE INGENIERÍA ELECTRÓNICA Y TELECOMUNICACIONES</span></div></div>
          <p class="o">Otorga el presente certificado a:</p>
          <p class="n">{{ seleccionado().participante.toUpperCase() }}</p>
          <p class="o">Por su participación como {{ seleccionado().tipo }} en el evento académico:</p>
          <p class="e">{{ seleccionado().evento }}{{ seleccionado().evento.includes('2026') ? '' : ' 2026' }}</p>
          <div class="firmas"><span>Decano FIET</span><span>Coordinador General</span></div>
        </div>
        <button class="btn primary block" (click)="descargar(seleccionado())"><app-icon name="download" [size]="16" /> Descargar PDF Firmado</button>
        <button class="btn block" (click)="enviar(seleccionado())"><app-icon name="send" [size]="16" /> Enviar por Correo Institucional</button>
      </section>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
    h3 { font-size: 22px; margin-bottom: 14px; }
    .bar { display: flex; gap: 12px; padding: 12px; margin-bottom: 14px; }
    .search { flex: 1; display: flex; align-items: center; gap: 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 0 12px;
      input { border: 0; background: none; outline: none; padding: 10px 0; width: 100%; } }
    .item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; margin-bottom: 12px; cursor: pointer;
      &.sel { border: 2px solid var(--navy); }
      .txt { flex: 1; min-width: 0; strong, span, small { display: block; } span { color: var(--muted); } small { color: var(--red); font-size: 12px; } } }
    .prev { padding: 24px; display: flex; flex-direction: column; gap: 10px; h3 { margin-bottom: 8px; } }
    .cert { border: 4px solid var(--navy); background: #fffdf8; padding: 28px 32px; margin-bottom: 8px; font-family: var(--serif); text-align: center;
      .head { display: flex; gap: 14px; align-items: center; text-align: left; margin-bottom: 22px; b { display: block; font-size: 18px; } span { font: 10px var(--sans); color: var(--muted); } }
      .o { font-size: 12px; color: var(--muted); margin: 6px 0; } .n { font-size: 26px; font-weight: 700; margin: 8px 0; }
      .e { color: var(--red); font-size: 18px; font-weight: 700; margin: 6px 0 28px; }
      .firmas { display: flex; justify-content: space-between; span { border-top: 1px solid var(--navy); padding-top: 4px; min-width: 130px; font: 10px var(--sans); color: var(--muted); } } }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .bar { flex-direction: column; } .cert { padding: 18px; } .list h3 { display: none; } }
  `],
})
export class CertificadosComponent {
  private data = inject(DataService);
  private toast = inject(ToastService);

  protected q = signal('');
  protected sel = signal(1);
  protected marcados = signal<Set<number>>(new Set());

  protected filtrados = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.data.certificados().filter(c => !q || `${c.participante} ${c.evento}`.toLowerCase().includes(q));
  });
  protected seleccionado = computed(() => this.data.certificados().find(c => c.id === this.sel()) ?? this.data.certificados()[0]);

  protected nota(c: Certificado) {
    if (c.emitido) return `Emitido el ${fechaCert(c.emitido)}`;
    return { 'Aprobado': 'Listo para emitir', 'En Revisión': 'Pendiente de firma', 'Aprobado con Cambios': 'Pendiente de ajustes', 'Rechazado': 'No aprobado para emisión' }[c.estado];
  }

  protected marcar(id: number) {
    this.marcados.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  protected emitir() {
    if (!this.marcados().size) { this.toast.mostrar('Selecciona al menos un participante aprobado sin certificado emitido'); return; }
    const n = this.data.emitirCertificados([...this.marcados()]);
    this.marcados.set(new Set());
    this.toast.mostrar(`${n} certificado(s) emitido(s)`);
  }

  protected descargar(c: Certificado) {
    if (c.estado !== 'Aprobado') { this.toast.mostrar('Solo se puede descargar el certificado de participantes aprobados'); return; }
    const w = window.open('', '_blank');
    if (!w) return;
    const esc = (s: string) => s.replace(/[&<>"]/g, ch => `&#${ch.charCodeAt(0)};`);
    w.document.write(`<html><head><title>Certificado</title><style>body{font-family:Georgia,serif;text-align:center;margin:0;padding:40px}
      .b{border:6px solid #0f1f40;padding:60px 40px}h1{font-size:30px;margin:10px 0}h2{font-size:38px;margin:30px 0}h3{color:#a80000;font-size:28px}
      .f{display:flex;justify-content:space-around;margin-top:90px}.f span{border-top:1px solid #0f1f40;padding-top:6px;min-width:200px;font:12px sans-serif}</style></head>
      <body><div class="b"><h1>Universidad del Cauca</h1><p>FACULTAD DE INGENIERÍA ELECTRÓNICA Y TELECOMUNICACIONES</p>
      <p>Otorga el presente certificado a:</p><h2>${esc(c.participante.toUpperCase())}</h2>
      <p>Por su participación como ${esc(c.tipo)} en el evento académico:</p><h3>${esc(c.evento)}</h3>
      <div class="f"><span>Decano FIET</span><span>Coordinador General</span></div></div>
      <script>onload=()=>print()</script></body></html>`);
    w.document.close();
  }

  protected enviar(c: Certificado) {
    if (!c.emitido) { this.toast.mostrar('Primero debes emitir el certificado'); return; }
    this.data.marcarEnviado(c.id);
    this.toast.mostrar(`Certificado enviado al correo institucional de ${c.participante}`);
  }
}
