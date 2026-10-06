import { Component, computed, inject, input } from '@angular/core';
import { DataService, fechaDMA, horaEs } from '../../core/data.service';
import { IconComponent } from '../icon';

/** Aviso informativo azul claro con icono. */
@Component({
  selector: 'app-aviso',
  imports: [IconComponent],
  template: `<div class="flex items-start gap-3 rounded-md bg-info-soft px-4 py-3.5 leading-normal"><app-icon class="mt-px text-info" name="info" [size]="18" /><span><ng-content /></span></div>`,
})
export class AvisoComponent {}

/** Tarjeta "Evento seleccionado" con modalidad. */
@Component({
  selector: 'app-evento-aside',
  template: `
    <div class="pcard">
      <h2 class="mb-2 text-2xl">Evento seleccionado</h2>
      <p class="mt-3 mb-3.5 text-xs font-semibold text-info">FERIA EMPRESARIAL · FIET 2026</p>
      <h3 class="text-[22px]">{{ e().titulo }}</h3>
      <hr class="my-3.5 border-0 border-t border-line">
      <p class="mb-3 leading-relaxed">{{ fecha() }}<br>{{ hora() }}</p>
      <p class="mb-3 leading-relaxed text-muted">{{ e().lugar }}</p>
      <span class="chip">Modalidad: {{ modalidad() }}</span>
    </div>`,
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
  template: `
    <div class="px-3">
      <h3 class="mb-2 text-xl">¿Necesitas orientación?</h3>
      <p class="mb-1.5 leading-relaxed text-muted">Ing. Beatriz Hurtado<br>Comité de Relación con el Sector Externo</p>
      <a class="font-semibold text-info" href="mailto:bhurtado@unicauca.edu.co">bhurtado&#64;unicauca.edu.co</a>
    </div>`,
})
export class OrientacionComponent {}

/** Banner oscuro del evento (paso 1 de ambos recorridos). */
@Component({
  selector: 'app-evento-hero',
  template: `
    <section class="grid items-center gap-5 rounded-lg bg-navy p-5.5 text-white lg:grid-cols-[1fr_340px] lg:gap-10 lg:p-8">
      <div>
        <p class="mb-3.5 text-xs font-semibold">FERIA EMPRESARIAL · FIET 2026</p>
        <h2 class="mb-3.5 text-[28px] lg:text-4xl">{{ e().titulo }}</h2>
        <p class="m-0 leading-relaxed">{{ e().descripcion }}</p>
        <div class="mt-5.5 flex gap-2.5"><i class="size-3 rotate-45 rounded-xs bg-white"></i><i class="size-3 rotate-45 rounded-xs bg-brand"></i><i class="size-3 rotate-45 rounded-xs bg-white"></i></div>
      </div>
      <div class="rounded-md bg-[#1e4f9c] p-6">
        <h3 class="mb-3 text-[22px]">{{ fecha() }}</h3>
        <p class="m-0 text-sm leading-relaxed">{{ hora() }}</p>
        <hr class="my-3.5 border-0 border-t border-white/30">
        <p class="m-0 text-sm leading-relaxed">{{ lugar()[0] }}<br>{{ lugar()[1] }}</p>
      </div>
    </section>`,
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
  template: `
    <div class="pcard">
      <h2 class="mb-2 text-2xl">Agenda del evento</h2>
      @for (a of e().agenda; track a.hora) {
        <div class="grid grid-cols-[90px_1fr] items-center border-b border-line py-3.5 sm:grid-cols-[120px_1fr]"><b class="text-xs text-info">{{ hora(a.hora) }}</b><span>{{ a.titulo }}</span></div>
      }
    </div>`,
})
export class AgendaPublicaComponent {
  private data = inject(DataService);
  protected e = computed(() => this.data.evento(1)!);
  protected hora = horaEs;
}
