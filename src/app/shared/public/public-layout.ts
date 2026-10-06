import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { inject } from '@angular/core';
import { CrestComponent } from '../crest';
import { IconComponent } from '../icon';

@Component({
  selector: 'app-public-layout',
  imports: [RouterLink, CrestComponent, IconComponent],
  template: `
    <div class="flex h-[38px] items-center bg-navy text-[11px] text-white"><div class="mx-auto flex w-full max-w-[1280px] justify-between px-6"><span>{{ recorrido() }} · {{ modo() === 'estudiante' ? 'Inscripción de proyecto' : 'Registro de asistencia' }}</span><span>0{{ paso() }} / 04</span></div></div>
    <header class="relative overflow-hidden border-b border-line bg-white py-3.5 lg:flex lg:h-32 lg:items-center lg:py-0">
      <span class="absolute inset-y-0 right-0 hidden w-[68px] bg-navy-soft [clip-path:polygon(40%_0,100%_0,100%_100%,0_100%)] lg:block"></span>
      <div class="relative mx-auto flex w-full max-w-[1280px] flex-col items-start justify-between gap-3 px-6 lg:flex-row lg:items-center">
        <a class="flex items-center gap-5" [routerLink]="inicio()">
          <app-crest [size]="48" />
          <div><h2 class="text-[22px] leading-tight lg:text-[28px]">Universidad del Cauca</h2>
            <span class="my-1 hidden text-[13px] text-muted lg:block">Facultad de Ingeniería Electrónica y Telecomunicaciones</span>
            <b class="text-xs text-info">Sistema de Gestión de Eventos · Feria Empresarial</b></div>
        </a>
        <nav class="flex items-center gap-3.5 text-[13px] lg:mr-10 lg:gap-6 lg:text-sm">
          <a class="font-semibold text-info" [routerLink]="inicio()">El evento</a>
          <button class="border-0 bg-transparent p-0" (click)="pronto()">{{ modo() === 'estudiante' ? 'Mis solicitudes' : 'Agenda' }}</button>
          <a href="mailto:bhurtado@unicauca.edu.co">Ayuda</a>
          @if (modo() === 'estudiante') { <span class="grid size-[38px] place-items-center rounded-full bg-navy-soft font-bold">{{ iniciales() }}</span> }
          @else { <a routerLink="/login">Iniciar sesión</a> }
        </nav>
      </div>
    </header>

    <div class="mx-auto max-w-[1280px] px-6 pt-7 pb-14">
      <p class="mb-6 text-xs text-muted">Eventos / Feria de Proyectos de Grado FIET 2026 / {{ modo() === 'estudiante' ? 'Inscripción de proyecto' : 'Registro de asistencia' }}</p>
      <ol class="m-0 mb-8 grid list-none grid-cols-4 gap-2 p-0 lg:gap-4">
        @for (p of pasos(); track $index) {
          <li class="flex items-center gap-2.5 border-t-[3px] pt-3.5" [class]="$index + 1 <= paso() ? 'border-info' : 'border-line'" [class.text-navy]="$index + 1 === paso()" [class.font-semibold]="$index + 1 === paso()" [class.text-muted]="$index + 1 !== paso()">
            <span class="grid size-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold"
                  [class]="$index + 1 === paso() ? 'border-navy bg-navy text-white' : $index + 1 < paso() ? 'border-navy-soft bg-navy-soft text-navy' : 'border-line bg-white'">
              @if ($index + 1 < paso()) { <app-icon name="check" [size]="12" /> } @else { 0{{ $index + 1 }} }
            </span>
            <span class="hidden lg:inline">{{ p }}</span>
          </li>
        }
      </ol>
      <h1 class="mb-2 flex items-center gap-3 text-[28px] lg:text-[34px]"><i class="size-3 shrink-0 rotate-45 rounded-xs bg-brand"></i>{{ titulo() }}</h1>
      <p class="mb-7 text-base text-muted">{{ subtitulo() }}</p>
      <ng-content />
      <footer class="mt-10 flex flex-wrap justify-between gap-3 border-t border-line pt-5 text-muted">
        <span>Coordinación: Dr. Alvaro Rendón · arendon&#64;unicauca.edu.co</span>
        <a class="text-info" href="mailto:bhurtado@unicauca.edu.co">Consultas: bhurtado&#64;unicauca.edu.co</a>
      </footer>
    </div>

    <div class="bg-gradient-to-b from-brand to-[#5a0000] px-4 py-7 text-center text-white"><em class="block font-serif text-[22px]">Hacia una Universidad comprometida con la paz territorial</em><small class="mt-3 block text-xs">Universidad del Cauca · FIET · Popayán, Colombia</small></div>
  `,
  host: { class: 'block min-h-screen bg-surface' },
})
export class PublicLayoutComponent {
  modo = input.required<'estudiante' | 'espectador'>();
  paso = input.required<number>();
  pasos = input.required<string[]>();
  recorrido = input.required<string>();
  titulo = input.required<string>();
  subtitulo = input.required<string>();
  iniciales = input('MV');
  protected inicio = () => '/feria/' + (this.modo() === 'estudiante' ? 'proyecto' : 'espectador');

  private toast = inject(ToastService);
  protected pronto() { this.toast.mostrar('Esta sección estará disponible próximamente.'); }
}
