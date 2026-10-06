import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { fechaHoraEs, RegistroService } from '../../core/registro.service';
import { IconComponent } from '../../shared/icon';
import { PublicLayoutComponent } from '../../shared/public/public-layout';
import { AgendaPublicaComponent, AvisoComponent, EventoAsideComponent, EventoHeroComponent, OrientacionComponent } from '../../shared/public/piezas';

const PASOS = ['Consultar el evento', 'Formulario de asistencia', 'Revisar inscripción', 'Inscripción confirmada'];
const REC = 'Recorrido del espectador';

/* ---------- Paso 1 ---------- */
@Component({
  selector: 'app-esp-evento',
  imports: [RouterLink, PublicLayoutComponent, EventoHeroComponent, AgendaPublicaComponent, AvisoComponent, OrientacionComponent, IconComponent],
  template: `
    <app-public-layout modo="espectador" [paso]="1" [pasos]="pasos" [recorrido]="rec" titulo="Conoce la feria y reserva tu asistencia"
      subtitulo="Descubre los proyectos de la FIET y participa en la agenda como espectador, sin presentar una propuesta.">
      <app-evento-hero />
      <div class="pub-cols" style="margin-top:28px">
        <div class="pub-main">
          <div class="pcard"><h2>Una feria abierta a la comunidad</h2><p>Estudiantes, graduados, representantes de empresas y público general pueden conocer los proyectos y asistir a las actividades del evento.</p>
            <app-aviso>El registro es individual. No necesitas un proyecto, archivos ni asesor académico para asistir como espectador.</app-aviso></div>
          <app-agenda-publica />
        </div>
        <div class="pub-side">
          <div class="pcard"><span class="chip">INSCRIPCIONES ABIERTAS</span><h2 style="margin-top:14px">Asiste como espectador</h2>
            <p class="muted">Reserva tu lugar para visitar la feria y disfrutar de la agenda. El registro no corresponde a una postulación de proyecto.</p>
            <p class="cupos">{{ reg.cuposEspectador() }} cupos disponibles</p><p class="muted">Entrada gratuita · Registro individual</p>
            <a class="pbtn primary block" routerLink="/feria/espectador/formulario">Registrarme como espectador <app-icon name="arrow-left" [size]="16" class="fl" /></a>
            <p class="muted" style="margin:16px 0 0">Tu cupo se reserva al confirmar la inscripción.</p></div>
          <div class="pcard"><h2>¿Quieres exponer un proyecto?</h2><p class="muted">La inscripción como estudiante expositor tiene un recorrido diferente y está sujeta a revisión del comité.</p>
            <a class="plink" routerLink="/feria/proyecto">Ir a inscripción de proyecto →</a></div>
          <app-orientacion />
        </div>
      </div>
    </app-public-layout>`,
  styles: [`.cupos { color: var(--green); font-size: 22px; font-weight: 600; margin: 18px 0 2px; } .fl { transform: rotate(180deg); }`],
})
export class EspEventoComponent { pasos = PASOS; rec = REC; protected reg = inject(RegistroService); }

/* ---------- Paso 2 ---------- */
@Component({
  selector: 'app-esp-formulario',
  imports: [ReactiveFormsModule, PublicLayoutComponent, EventoAsideComponent, AvisoComponent, OrientacionComponent, IconComponent],
  template: `
    <app-public-layout modo="espectador" [paso]="2" [pasos]="pasos" [recorrido]="rec" titulo="Formulario de asistencia"
      subtitulo="Completa tus datos para reservar un cupo. Este registro es únicamente para asistir como espectador.">
      <form class="pub-cols" [formGroup]="form" (ngSubmit)="revisar()" novalidate>
        <div class="pub-main">
          <div class="pcard"><h2>Datos personales y de contacto</h2><p class="req-note">* Campos obligatorios. Escribe tus datos como aparecen en tu documento.</p>
            <div class="pf"><label for="n">Nombre completo <span class="req">*</span></label><input id="n" formControlName="nombre" autocomplete="name">@if (bad('nombre')) { <span class="err">Obligatorio</span> }</div>
            <div class="pf-2">
              <div class="pf"><label for="ti">Tipo de identificación <span class="req">*</span></label><select id="ti" formControlName="tipoId">@for (t of tiposId; track t) { <option>{{ t }}</option> }</select></div>
              <div class="pf"><label for="ni">Número de identificación <span class="req">*</span></label><input id="ni" formControlName="numId" inputmode="numeric">
                @if (bad('numId')) { <span class="err">Solo números, entre 5 y 12 dígitos</span> } @else { <span class="hint">Solo números, sin puntos ni espacios.</span> }</div>
              <div class="pf"><label for="co">Correo electrónico <span class="req">*</span></label><input id="co" type="email" formControlName="correo" autocomplete="email">
                @if (bad('correo')) { <span class="err">Ingresa un correo válido</span> } @else { <span class="hint">Aquí recibirás la confirmación y tu pase de ingreso.</span> }</div>
              <div class="pf"><label for="te">Teléfono de contacto (opcional)</label><input id="te" formControlName="telefono" inputmode="tel">
                @if (bad('telefono')) { <span class="err">Debe tener 10 dígitos</span> } @else { <span class="hint">Número de celular de 10 dígitos.</span> }</div>
            </div></div>
          <div class="pcard"><h2>Vinculación y accesibilidad</h2>
            <div class="pf"><label>Vinculación con el evento <span class="req">*</span></label>
              <div class="radios">@for (v of vinculos; track v) { <label class="rad" [class.on]="form.controls.vinculacion.value === v"><input type="radio" formControlName="vinculacion" [value]="v"> {{ v }}</label> }</div></div>
            <div class="pf"><label for="ac">Requerimientos de accesibilidad (opcional)</label><textarea id="ac" rows="3" formControlName="accesibilidad" placeholder="No requiero apoyos de accesibilidad."></textarea>
              <span class="hint">Indica los apoyos que necesitas para el ingreso o la movilidad. Evita incluir diagnósticos o información médica.</span></div></div>
          <div class="pcard"><label class="chk top"><input type="checkbox" formControlName="autoriza">
            <span><strong>Autorizo el tratamiento de mis datos personales <span class="req">*</span></strong>
              <small>Autorizo a la Universidad del Cauca a tratar los datos de este formulario para gestionar mi inscripción, verificar el ingreso y enviar comunicaciones del evento, conforme a su política de protección de datos personales.</small>
              <a class="plink" href="https://www.unicauca.edu.co" target="_blank" rel="noopener">Consultar política de protección de datos</a></span></label>
            @if (bad('autoriza')) { <span class="err">Debes autorizar el tratamiento de datos para continuar</span> }</div>
          <app-aviso>Revisa el correo y la identificación antes de continuar. Tu inscripción aún no está confirmada.</app-aviso>
          <div class="pactions"><button type="button" class="pbtn" (click)="volver()">Volver al evento</button><button type="submit" class="pbtn primary">Revisar inscripción <app-icon name="arrow-left" [size]="16" class="fl" /></button></div>
        </div>
        <div class="pub-side">
          <app-evento-aside modalidad="espectador" />
          <div class="pcard"><h2>Un registro por persona</h2><p class="muted">Cada espectador debe completar su propio formulario. No se requiere una cuenta ni documentación de un proyecto.</p>
            <app-aviso>La confirmación reserva tu cupo; la asistencia se verificará el día del evento.</app-aviso></div>
          <app-orientacion />
        </div>
      </form>
    </app-public-layout>`,
  styles: [`.radios { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .rad { display: flex; gap: 10px; align-items: center; border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; cursor: pointer; font-size: 14px; font-weight: 400 !important;
      &.on { border-color: #1e4a96; background: var(--blue-soft); } input { accent-color: var(--navy); } }
    .top { align-items: flex-start; small { display: block; color: var(--muted); margin: 4px 0 8px; line-height: 1.5; } input { margin-top: 3px; } }
    .fl { transform: rotate(180deg); }
    @media (max-width: 760px) { .radios { grid-template-columns: 1fr 1fr; } }`],
})
export class EspFormularioComponent {
  pasos = PASOS; rec = REC;
  private reg = inject(RegistroService);
  private router = inject(Router);
  protected tiposId = ['Cédula de ciudadanía', 'Tarjeta de identidad', 'Cédula de extranjería', 'Pasaporte'];
  protected vinculos = ['Estudiante', 'Graduado', 'Empresa', 'Público general'];
  private e = this.reg.espectador();
  protected form = inject(FormBuilder).nonNullable.group({
    nombre: [this.e.nombre, Validators.required], tipoId: [this.e.tipoId],
    numId: [this.e.numId, [Validators.required, Validators.pattern(/^\d{5,12}$/)]],
    correo: [this.e.correo, [Validators.required, Validators.email]],
    telefono: [this.e.telefono, Validators.pattern(/^(\d{3}\s?\d{3}\s?\d{4})?$/)],
    vinculacion: [this.e.vinculacion], accesibilidad: [this.e.accesibilidad],
    autoriza: [this.e.autoriza, Validators.requiredTrue],
  });
  protected bad(c: 'nombre' | 'numId' | 'correo' | 'telefono' | 'autoriza') { const x = this.form.controls[c]; return x.invalid && x.touched; }
  private guardar() { this.reg.espectador.update(r => ({ ...r, ...this.form.getRawValue() })); }
  protected volver() { this.guardar(); this.router.navigateByUrl('/feria/espectador'); }
  protected revisar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardar();
    this.router.navigateByUrl('/feria/espectador/revision');
  }
}

/* ---------- Paso 3 ---------- */
@Component({
  selector: 'app-esp-revision',
  imports: [RouterLink, PublicLayoutComponent, EventoAsideComponent, AvisoComponent, OrientacionComponent, IconComponent],
  template: `
    <app-public-layout modo="espectador" [paso]="3" [pasos]="pasos" [recorrido]="rec" titulo="Revisar inscripción"
      subtitulo="Comprueba tus datos y el evento antes de confirmar. Puedes volver al formulario para hacer cambios.">
      <div class="pub-cols">
        <div class="pub-main">
          <div class="pcard"><h2>Datos del espectador</h2>
            <div class="hd"><span class="chip">Modalidad: espectador</span><a class="plink" routerLink="/feria/espectador/formulario">Editar mis datos</a></div>
            <span class="kv-l">Nombre completo</span><p class="kv-v">{{ e().nombre }}</p>
            <div class="kv-grid"><div><span class="kv-l">Tipo de identificación</span><p class="kv-v">{{ e().tipoId }}</p></div><div><span class="kv-l">Número de identificación</span><p class="kv-v">{{ e().numId }}</p></div></div><hr class="sep">
            <div class="kv-grid"><div><span class="kv-l">Correo electrónico</span><p class="kv-v">{{ e().correo }}</p></div><div><span class="kv-l">Teléfono de contacto</span><p class="kv-v">{{ e().telefono || 'No indicado' }}</p></div></div>
            <span class="kv-l">Vinculación con el evento</span><p class="kv-v">{{ e().vinculacion }}</p>
            <span class="kv-l">Requerimientos de accesibilidad</span><p class="kv-v">{{ e().accesibilidad || 'No requiero apoyos de accesibilidad.' }}</p></div>
          <div class="pcard"><h2>Tu visita a la feria</h2>
            <span class="kv-l">Evento</span><p class="kv-v">Feria de Proyectos de Grado FIET 2026</p>
            <div class="kv-grid"><div><span class="kv-l">Fecha</span><p class="kv-v">15 de octubre de 2026</p></div><div><span class="kv-l">Horario</span><p class="kv-v">8:00 a. m. – 5:00 p. m.</p></div></div>
            <span class="kv-l">Lugar</span><p class="kv-v">Centro de Convenciones Casa de la Moneda<br>Popayán, Colombia</p><p class="muted">Entrada gratuita · Un cupo individual como espectador</p></div>
          <app-aviso>Autorización de tratamiento de datos personales aceptada. Tus datos se usarán para gestionar la inscripción, verificar el ingreso y comunicar novedades del evento.</app-aviso>
          <div class="pactions"><a class="pbtn" routerLink="/feria/espectador/formulario"><app-icon name="arrow-left" [size]="16" /> Volver al formulario</a><button class="pbtn primary" (click)="confirmar()">Confirmar inscripción <app-icon name="check" [size]="16" /></button></div>
        </div>
        <div class="pub-side">
          <app-evento-aside modalidad="espectador" />
          <div class="pcard"><h2>Antes de confirmar</h2><p class="muted">Verifica que tu nombre e identificación coincidan con el documento que presentarás al ingresar.</p>
            <p class="muted">La confirmación y el pase de ingreso se enviarán a:</p><a class="plink" href="mailto:{{ e().correo }}">{{ e().correo }}</a>
            <div style="margin-top:16px"><app-aviso>Confirmar reserva tu cupo. No registra tu asistencia ni genera un certificado.</app-aviso></div></div>
          <app-orientacion />
        </div>
      </div>
    </app-public-layout>`,
  styles: [`.hd { display: flex; justify-content: space-between; align-items: center; margin: 4px 0 18px; }`],
})
export class EspRevisionComponent {
  pasos = PASOS; rec = REC;
  private reg = inject(RegistroService);
  private router = inject(Router);
  protected e = this.reg.espectador;
  protected confirmar() { this.reg.confirmarEspectador(); this.router.navigateByUrl('/feria/espectador/confirmada'); }
}

/* ---------- Paso 4 ---------- */
@Component({
  selector: 'app-esp-confirmada',
  imports: [RouterLink, PublicLayoutComponent, AvisoComponent, OrientacionComponent, IconComponent],
  template: `
    <app-public-layout modo="espectador" [paso]="4" [pasos]="pasos" [recorrido]="rec" titulo="Inscripción confirmada"
      subtitulo="Tu cupo como espectador está reservado. Conserva tu referencia y prepara tu visita a la feria.">
      <div class="pcard recibo" style="margin-bottom:28px">
        <div class="l"><span class="ico ok"><app-icon name="check" [size]="32" /></span><div><h2>¡Te esperamos en la feria, {{ nombre() }}!</h2><p>La confirmación y el pase de ingreso se han enviado a {{ e().correo }}. Tu registro corresponde a la modalidad de espectador.</p></div></div>
        <div class="ref"><span class="kv-l">REFERENCIA DE INSCRIPCIÓN</span><strong>{{ e().referencia }}</strong><span class="chip green">Inscripción confirmada</span><small>{{ fecha() }}</small></div>
      </div>
      <div class="pub-cols">
        <div class="pub-main">
          <div class="pcard"><h2>Pase de ingreso · Espectador</h2>
            <div class="hd"><span class="cat">FERIA EMPRESARIAL · FIET 2026</span><span class="chip green">Cupo reservado</span></div>
            <h3 class="pn">Feria de Proyectos de Grado FIET 2026</h3><hr class="sep">
            <span class="kv-l">Espectador</span><p class="kv-v">{{ e().nombre }}</p>
            <div class="kv-grid"><div><span class="kv-l">Identificación</span><p class="kv-v">{{ e().tipoId }} · {{ e().numId }}</p></div><div><span class="kv-l">Vinculación</span><p class="kv-v">{{ e().vinculacion }}</p></div></div>
            <span class="kv-l">Correo registrado</span><p class="kv-v">{{ e().correo }}</p><hr class="sep">
            <div class="kv-grid"><div><span class="kv-l">Fecha del evento</span><p class="kv-v">15 de octubre de 2026</p></div><div><span class="kv-l">Horario</span><p class="kv-v">8:00 a. m. – 5:00 p. m.</p></div></div>
            <span class="kv-l">Lugar de ingreso</span><p class="kv-v">Centro de Convenciones Casa de la Moneda<br>Popayán, Colombia</p>
            <div class="pase"><strong>{{ e().referencia }}</strong><span>Personal · Presentar con identificación</span></div>
            <small class="muted">Este pase acredita tu inscripción, no tu asistencia. No constituye un certificado de participación.</small></div>
        </div>
        <div class="pub-side">
          <div class="pcard"><h2>¿Qué sigue ahora?</h2><ol class="steps-list">
            <li><span class="n">1</span><div><b>Guarda tu pase</b><p>Descarga el pase de ingreso o conserva la confirmación enviada a tu correo. Revisa también la carpeta de correo no deseado.</p></div></li>
            <li><span class="n">2</span><div><b>Presenta tu identificación</b><p>El 15 de octubre, acércate al registro de asistentes desde las 8:00 a. m. con tu cédula y el pase, digital o impreso.</p></div></li>
            <li><span class="n">3</span><div><b>Verifica tu ingreso</b><p>El equipo del evento validará tu inscripción y registrará tu asistencia en la entrada. Luego podrás recorrer la feria.</p></div></li></ol></div>
          <app-aviso>La asistencia está pendiente de verificación el día del evento. No se ha emitido un certificado.</app-aviso>
          <app-orientacion />
        </div>
      </div>
      <div class="pactions" style="justify-content:flex-start;margin-top:28px">
        <button class="pbtn primary" (click)="pase()">Descargar pase de ingreso <app-icon name="download" [size]="16" /></button>
        <a class="pbtn" routerLink="/feria/espectador">Ver agenda del evento <app-icon name="calendar" [size]="16" /></a>
        <a class="pbtn" routerLink="/feria/espectador" (click)="reg.reiniciarEspectador()">Volver al evento</a>
      </div>
      <p class="muted" style="margin-top:20px">Formato PDF · Puedes presentar el pase desde tu celular o llevarlo impreso.</p>
    </app-public-layout>`,
  styles: [`.hd { display: flex; justify-content: space-between; align-items: center; margin: 14px 0; } .cat { color: #1e4a96; font-size: 12px; font-weight: 600; } .pn { font-size: 26px; }
    .pase { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; background: var(--bg); border-radius: 6px; padding: 16px; margin: 6px 0 14px; span { color: var(--muted); } }`],
})
export class EspConfirmadaComponent {
  pasos = PASOS; rec = REC;
  protected reg = inject(RegistroService);
  protected e = this.reg.espectador;
  protected nombre = computed(() => this.e().nombre.split(' ').slice(0, 2).join(' '));
  protected fecha = computed(() => fechaHoraEs(this.e().confirmadoEn));
  protected pase() { window.print(); }
}
