import { Component, computed, inject, input } from '@angular/core';
import { DataService, fechaDMA, horaEs } from '../../core/data.service';
import { IconComponent } from '../icon';

/** Aviso informativo azul claro con icono. */
@Component({
  selector: 'app-aviso',
  imports: [IconComponent],
  template: `<div class="a"><app-icon name="info" [size]="18" /><span><ng-content /></span></div>`,
  styles: [`.a { display: flex; gap: 12px; align-items: flex-start; background: var(--blue-soft); border-radius: 6px; padding: 14px 16px; line-height: 1.5; app-icon { color: #1e4a96; margin-top: 1px; } }`],
})
export class AvisoComponent {}

/** Tarjeta "Evento seleccionado" con modalidad. */
@Component({
  selector: 'app-evento-aside',
  template: `
    <div class="pcard">
      <h2>Evento seleccionado</h2>
      <p class="cat">FERIA EMPRESARIAL · FIET 2026</p>
      <h3>{{ e().titulo }}</h3><hr class="sep">
      <p class="d">{{ fecha() }}<br>{{ hora() }}</p>
      <p class="d muted">{{ e().lugar }}</p>
      <span class="chip">Modalidad: {{ modalidad() }}</span>
    </div>`,
  styles: [`.cat { color: #1e4a96; font-size: 12px; font-weight: 600; margin: 12px 0 14px; } h3 { font-size: 22px; } .d { line-height: 1.6; margin: 0 0 12px; } hr { margin: 14px 0; }`],
})
export class EventoAsideComponent {
  modalidad = input.required<string>();
  private data = inject(DataService);
  protected e = computed(() => this.data.evento(1)!);
  protected fecha = computed(() => fechaDMA(this.e().fecha));
  protected hora = computed(() => horaEs(this.e().hora));
}

@Component({
  selector: 'app-orientacion',
  template: `<div class="o"><h3>¿Necesitas orientación?</h3><p>Ing. Beatriz Hurtado<br>Comité de Relación con el Sector Externo</p><a href="mailto:bhurtado@unicauca.edu.co">bhurtado&#64;unicauca.edu.co</a></div>`,
  styles: [`.o { padding: 0 12px; h3 { font-size: 20px; margin-bottom: 8px; } p { color: var(--muted); line-height: 1.6; margin: 0 0 6px; } a { color: #1e4a96; font-weight: 600; } }`],
})
export class OrientacionComponent {}

/** Banner oscuro del evento (paso 1 de ambos recorridos). */
@Component({
  selector: 'app-evento-hero',
  template: `
    <section class="hero">
      <div class="l">
        <p class="cat">FERIA EMPRESARIAL · FIET 2026</p>
        <h2>{{ e().titulo }}</h2><p class="desc">{{ e().descripcion }}</p>
        <div class="dots"><i></i><i class="r"></i><i></i></div>
      </div>
      <div class="r2"><h3>{{ fecha() }}</h3><p>{{ hora() }}</p><hr><p>{{ lugar()[0] }}<br>{{ lugar()[1] }}</p></div>
    </section>`,
  styles: [`
    .hero { background: var(--navy); color: #fff; border-radius: 8px; padding: 32px; display: grid; grid-template-columns: 1fr 340px; gap: 40px; align-items: center; }
    .cat { font-size: 12px; font-weight: 600; margin: 0 0 14px; } h2 { font-size: 36px; margin-bottom: 14px; } .desc { line-height: 1.6; margin: 0; }
    .dots { display: flex; gap: 10px; margin-top: 22px; i { width: 12px; height: 12px; background: #fff; transform: rotate(45deg); border-radius: 2px; } .r { background: var(--red); } }
    .r2 { background: #1e4f9c; border-radius: 6px; padding: 24px; h3 { font-size: 22px; margin-bottom: 12px; } p { margin: 0; line-height: 1.6; font-size: 14px; } hr { border: 0; border-top: 1px solid rgba(255,255,255,.3); margin: 14px 0; } }
    @media (max-width: 960px) { .hero { grid-template-columns: 1fr; padding: 22px; gap: 22px; } h2 { font-size: 28px; } }
  `],
})
export class EventoHeroComponent {
  private data = inject(DataService);
  protected e = computed(() => this.data.evento(1)!);
  protected fecha = computed(() => fechaDMA(this.e().fecha));
  protected hora = computed(() => horaEs(this.e().hora));
  protected lugar = computed(() => { const [a, b] = this.e().lugar.split(', '); return [a, `${b}, Colombia`]; });
}

@Component({
  selector: 'app-agenda-publica',
  template: `<div class="pcard"><h2>Agenda del evento</h2>@for (a of e().agenda; track a.hora) { <div class="r"><b>{{ hora(a.hora) }}</b><span>{{ a.titulo }}</span></div> }</div>`,
  styles: [`.r { display: grid; grid-template-columns: 120px 1fr; padding: 14px 0; border-bottom: 1px solid var(--border); align-items: center; b { color: #1e4a96; font-size: 12px; } } h2 { margin-bottom: 8px; } @media (max-width: 640px) { .r { grid-template-columns: 90px 1fr; } }`],
})
export class AgendaPublicaComponent {
  private data = inject(DataService);
  protected e = computed(() => this.data.evento(1)!);
  protected hora = horaEs;
}
