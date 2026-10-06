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
    <div class="bar"><div class="in"><span>{{ recorrido() }} · {{ modo() === 'estudiante' ? 'Inscripción de proyecto' : 'Registro de asistencia' }}</span><span>0{{ paso() }} / 04</span></div></div>
    <header class="head"><div class="in">
      <a class="brand" routerLink="/feria/{{ modo() === 'estudiante' ? 'proyecto' : 'espectador' }}">
        <app-crest [size]="48" />
        <div><h2>Universidad del Cauca</h2><span>Facultad de Ingeniería Electrónica y Telecomunicaciones</span><b>Sistema de Gestión de Eventos · Feria Empresarial</b></div>
      </a>
      <nav>
        <a [routerLink]="'/feria/' + (modo() === 'estudiante' ? 'proyecto' : 'espectador')" class="cur">El evento</a>
        @if (modo() === 'estudiante') {
          <button (click)="pronto()">Mis solicitudes</button>
          <a href="mailto:bhurtado@unicauca.edu.co">Ayuda</a>
          <span class="av">{{ iniciales() }}</span>
        } @else {
          <button (click)="pronto()">Agenda</button>
          <a href="mailto:bhurtado@unicauca.edu.co">Ayuda</a>
          <a routerLink="/login">Iniciar sesión</a>
        }
      </nav>
    </div></header>

    <div class="wrap">
      <p class="crumb">Eventos / Feria de Proyectos de Grado FIET 2026 / {{ modo() === 'estudiante' ? 'Inscripción de proyecto' : 'Registro de asistencia' }}</p>
      <ol class="stepper">
        @for (p of pasos(); track $index) {
          <li [class.done]="$index + 1 < paso()" [class.cur]="$index + 1 === paso()" [class.on]="$index + 1 <= paso()">
            <span class="n">@if ($index + 1 < paso()) { <app-icon name="check" [size]="12" /> } @else { 0{{ $index + 1 }} }</span>
            <span class="t">{{ p }}</span>
          </li>
        }
      </ol>
      <h1><i></i>{{ titulo() }}</h1>
      <p class="sub">{{ subtitulo() }}</p>
      <ng-content />
      <footer class="contacts">
        <span>Coordinación: Dr. Alvaro Rendón · arendon&#64;unicauca.edu.co</span>
        <a href="mailto:bhurtado@unicauca.edu.co">Consultas: bhurtado&#64;unicauca.edu.co</a>
      </footer>
    </div>

    <div class="foot"><em>Hacia una Universidad comprometida con la paz territorial</em><small>Universidad del Cauca · FIET · Popayán, Colombia</small></div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--bg); }
    .in { max-width: 1280px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; }
    .bar { background: var(--navy); color: #fff; font-size: 11px; height: 38px; display: flex; align-items: center; > .in { width: 100%; } }
    .head { background: #fff; border-bottom: 1px solid var(--border); position: relative; overflow: hidden; height: 128px; display: flex; align-items: center;
      &::after { content: ''; position: absolute; top: 0; right: 0; width: 68px; height: 100%; background: var(--navy-soft); clip-path: polygon(40% 0, 100% 0, 100% 100%, 0 100%); }
      > .in { width: 100%; position: relative; z-index: 1; } }
    .brand { display: flex; gap: 20px; align-items: center; h2 { font-size: 28px; line-height: 1.1; } span { display: block; color: var(--muted); font-size: 13px; margin: 4px 0; } b { color: #1e4a96; font-size: 12px; } }
    nav { display: flex; gap: 24px; align-items: center; margin-right: 40px; font-size: 14px;
      a, button { color: var(--navy); background: none; border: 0; padding: 0; font-weight: 400; } .cur { color: #1e4a96; font-weight: 600; }
      .av { width: 38px; height: 38px; border-radius: 50%; background: var(--navy-soft); display: grid; place-items: center; font-weight: 700; } }
    .wrap { max-width: 1280px; margin: 0 auto; padding: 28px 24px 56px; }
    .crumb { font-size: 12px; color: var(--muted); margin: 0 0 24px; }
    .stepper { list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 0; margin: 0 0 32px;
      li { border-top: 3px solid var(--border); padding-top: 14px; display: flex; align-items: center; gap: 10px; color: var(--muted); &.on { border-top-color: #1e4a96; } &.cur { color: var(--navy); font-weight: 600; } }
      .n { width: 28px; height: 28px; border-radius: 50%; font-size: 11px; font-weight: 700; display: grid; place-items: center; background: #fff; border: 1px solid var(--border); flex-shrink: 0; }
      .done .n { background: var(--navy-soft); border-color: var(--navy-soft); color: var(--navy); }
      .cur .n { background: var(--navy); border-color: var(--navy); color: #fff; } }
    h1 { font-size: 34px; display: flex; align-items: center; gap: 12px; margin-bottom: 8px; i { width: 12px; height: 12px; background: var(--red); transform: rotate(45deg); border-radius: 2px; flex-shrink: 0; } }
    .sub { color: var(--muted); font-size: 16px; margin: 0 0 28px; }
    .contacts { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; border-top: 1px solid var(--border); margin-top: 40px; padding-top: 20px; color: var(--muted); a { color: #1e4a96; } }
    .foot { background: linear-gradient(180deg, #a80000, #5a0000); color: #fff; text-align: center; padding: 28px 16px; em { display: block; font-family: var(--serif); font-size: 22px; } small { display: block; margin-top: 12px; font-size: 12px; } }
    @media (max-width: 900px) {
      nav { margin-right: 0; gap: 14px; font-size: 13px; } .brand h2 { font-size: 22px; } .brand span { display: none; }
      .stepper { gap: 8px; .t { display: none; } .cur .t { display: inline; } li { padding-right: 0; } }
      .head::after { display: none; } .head { height: auto; padding: 14px 0; > .in { flex-direction: column; gap: 12px; align-items: flex-start; } }
      h1 { font-size: 28px; }
    }
  `],
})
export class PublicLayoutComponent {
  modo = input.required<'estudiante' | 'espectador'>();
  paso = input.required<number>();
  pasos = input.required<string[]>();
  recorrido = input.required<string>();
  titulo = input.required<string>();
  subtitulo = input.required<string>();
  iniciales = input('MV');

  private toast = inject(ToastService);
  protected pronto() { this.toast.mostrar('Esta sección estará disponible próximamente.'); }
}
