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
    <div class="grid items-start gap-6 lg:grid-cols-2">
      <section>
        <h3 class="mb-3.5 hidden text-[22px] lg:block">Inscritos Aptos para Certificación</h3>
        <div class="card mb-3.5 flex flex-col gap-3 p-3 sm:flex-row">
          <label class="flex flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3"><app-icon name="search" [size]="16" />
            <input class="w-full border-0 bg-transparent py-2.5 outline-none" placeholder="Buscar participante..." (input)="q.set($any($event.target).value)"></label>
          <button class="btn btn-danger" (click)="emitir()">Emitir Seleccionados{{ marcados().size ? ' (' + marcados().size + ')' : '' }}</button>
        </div>
        @for (c of filtrados(); track c.id) {
          <div class="card mb-3 flex cursor-pointer items-center gap-3.5 px-4 py-3.5" [class]="c.id === seleccionado().id ? 'border-2 border-navy' : ''"
               (click)="sel.set(c.id)" tabindex="0" (keydown.enter)="sel.set(c.id)">
            @if (c.estado === 'Aprobado' && !c.emitido) {
              <input type="checkbox" [checked]="marcados().has(c.id)" (click)="$event.stopPropagation(); marcar(c.id)" aria-label="Seleccionar para emitir">
            } @else { <app-icon name="award" [size]="22" /> }
            <div class="min-w-0 flex-1">
              <strong class="block">{{ c.participante }}</strong><span class="block text-muted">{{ c.evento }}</span>
              <small class="block text-xs text-brand">{{ nota(c) }}</small>
            </div>
            <app-status-badge [estado]="c.estado" />
            <app-icon name="chevron-right" />
          </div>
        }
      </section>

      <section class="card flex flex-col gap-2.5 p-6">
        <h3 class="mb-2 text-[22px]">Vista Previa del Certificado</h3>
        <div class="mb-2 border-4 border-navy bg-[#fffdf8] px-4.5 py-7 text-center font-serif lg:px-8">
          <div class="mb-5.5 flex items-center gap-3.5 text-left">
            <app-crest [size]="44" />
            <div><b class="block text-lg">Universidad del Cauca</b><span class="font-sans text-[10px] text-muted">FACULTAD DE INGENIERÍA ELECTRÓNICA Y TELECOMUNICACIONES</span></div>
          </div>
          <p class="my-1.5 text-xs text-muted">Otorga el presente certificado a:</p>
          <p class="my-2 text-[26px] font-bold">{{ seleccionado().participante.toUpperCase() }}</p>
          <p class="my-1.5 text-xs text-muted">Por su participación como {{ seleccionado().tipo }} en el evento académico:</p>
          <p class="mt-1.5 mb-7 text-lg font-bold text-brand">{{ seleccionado().evento }}{{ seleccionado().evento.includes('2026') ? '' : ' 2026' }}</p>
          <div class="flex justify-between font-sans text-[10px] text-muted"><span class="min-w-[130px] border-t border-navy pt-1">Decano FIET</span><span class="min-w-[130px] border-t border-navy pt-1">Coordinador General</span></div>
        </div>
        <button class="btn btn-primary w-full" (click)="descargar(seleccionado())"><app-icon name="download" [size]="16" /> Descargar PDF Firmado</button>
        <button class="btn w-full" (click)="enviar(seleccionado())"><app-icon name="send" [size]="16" /> Enviar por Correo Institucional</button>
      </section>
    </div>
  `,
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
