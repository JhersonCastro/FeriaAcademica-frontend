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
      <div class="mt-7 grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        <div class="flex min-w-0 flex-col gap-6">
          <div class="pcard"><h2 class="mb-2 text-2xl">Una feria abierta a la comunidad</h2><p class="mb-4">Estudiantes, graduados, representantes de empresas y público general pueden conocer los proyectos y asistir a las actividades del evento.</p>
            <app-aviso>El registro es individual. No necesitas un proyecto, archivos ni asesor académico para asistir como espectador.</app-aviso></div>
          <app-agenda-publica />
        </div>
        <div class="flex min-w-0 flex-col gap-6">
          <div class="pcard"><span class="chip">INSCRIPCIONES ABIERTAS</span><h2 class="mt-3.5 mb-2 text-2xl">Asiste como espectador</h2>
            <p class="mb-4 text-muted">Reserva tu lugar para visitar la feria y disfrutar de la agenda. El registro no corresponde a una postulación de proyecto.</p>
            <p class="mt-4.5 mb-0.5 text-[22px] font-semibold text-ok">{{ reg.cuposEspectador() }} cupos disponibles</p><p class="mb-4 text-muted">Entrada gratuita · Registro individual</p>
            <a class="pbtn pbtn-primary w-full" routerLink="/feria/espectador/formulario">Registrarme como espectador <app-icon class="rotate-180" name="arrow-left" [size]="16" /></a>
            <p class="mt-4 text-muted">Tu cupo se reserva al confirmar la inscripción.</p></div>
          <div class="pcard"><h2 class="mb-2 text-2xl">¿Quieres exponer un proyecto?</h2><p class="mb-4 text-muted">La inscripción como estudiante expositor tiene un recorrido diferente y está sujeta a revisión del comité.</p>
            <a class="plink" routerLink="/feria/proyecto">Ir a inscripción de proyecto →</a></div>
          <app-orientacion />
        </div>
      </div>
    </app-public-layout>`,
})
export class EspEventoComponent { pasos = PASOS; rec = REC; protected reg = inject(RegistroService); }

/* ---------- Paso 2 ---------- */
@Component({
  selector: 'app-esp-formulario',
  imports: [ReactiveFormsModule, PublicLayoutComponent, EventoAsideComponent, AvisoComponent, OrientacionComponent, IconComponent],
  template: `
    <app-public-layout modo="espectador" [paso]="2" [pasos]="pasos" [recorrido]="rec" titulo="Formulario de asistencia"
      subtitulo="Completa tus datos para reservar un cupo. Este registro es únicamente para asistir como espectador.">
      <form class="grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-8" [formGroup]="form" (ngSubmit)="revisar()" novalidate>
        <div class="flex min-w-0 flex-col gap-6">
          <div class="pcard"><h2 class="mb-2 text-2xl">Datos personales y de contacto</h2><p class="mb-3.5 text-xs text-muted">* Campos obligatorios. Escribe tus datos como aparecen en tu documento.</p>
            <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="n">Nombre completo <span class="text-brand">*</span></label><input class="pinput" id="n" formControlName="nombre" autocomplete="name">@if (bad('nombre')) { <span class="err">Obligatorio</span> }</div>
            <div class="grid gap-x-5 sm:grid-cols-2">
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="ti">Tipo de identificación <span class="text-brand">*</span></label><select class="pinput" id="ti" formControlName="tipoId">@for (t of tiposId; track t) { <option>{{ t }}</option> }</select></div>
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="ni">Número de identificación <span class="text-brand">*</span></label><input class="pinput" id="ni" formControlName="numId" inputmode="numeric">
                @if (bad('numId')) { <span class="err">Solo números, entre 5 y 12 dígitos</span> } @else { <span class="text-[13px] text-muted">Solo números, sin puntos ni espacios.</span> }</div>
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="co">Correo electrónico <span class="text-brand">*</span></label><input class="pinput" id="co" type="email" formControlName="correo" autocomplete="email">
                @if (bad('correo')) { <span class="err">Ingresa un correo válido</span> } @else { <span class="text-[13px] text-muted">Aquí recibirás la confirmación y tu pase de ingreso.</span> }</div>
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="te">Teléfono de contacto (opcional)</label><input class="pinput" id="te" formControlName="telefono" inputmode="tel">
                @if (bad('telefono')) { <span class="err">Debe tener 10 dígitos</span> } @else { <span class="text-[13px] text-muted">Número de celular de 10 dígitos.</span> }</div>
            </div></div>
          <div class="pcard"><h2 class="mb-2 text-2xl">Vinculación y accesibilidad</h2>
            <div class="mb-4 flex flex-col gap-1.5"><span class="plabel">Vinculación con el evento <span class="text-brand">*</span></span>
              <div class="grid grid-cols-2 gap-3 md:grid-cols-4">@for (v of vinculos; track v) {
                <label class="flex cursor-pointer items-center gap-2.5 rounded-md border px-3.5 py-3 text-sm" [class]="form.controls.vinculacion.value === v ? 'border-info bg-info-soft' : 'border-line'"><input class="accent-navy" type="radio" formControlName="vinculacion" [value]="v"> {{ v }}</label> }</div></div>
            <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="ac">Requerimientos de accesibilidad (opcional)</label><textarea class="pinput min-h-20 resize-y" id="ac" rows="3" formControlName="accesibilidad" placeholder="No requiero apoyos de accesibilidad."></textarea>
              <span class="text-[13px] text-muted">Indica los apoyos que necesitas para el ingreso o la movilidad. Evita incluir diagnósticos o información médica.</span></div></div>
          <div class="pcard"><label class="flex cursor-pointer items-start gap-2.5"><input class="mt-0.5 size-[18px] accent-navy" type="checkbox" formControlName="autoriza">
            <span><strong>Autorizo el tratamiento de mis datos personales <span class="text-brand">*</span></strong>
              <small class="mt-1 mb-2 block leading-normal text-muted">Autorizo a la Universidad del Cauca a tratar los datos de este formulario para gestionar mi inscripción, verificar el ingreso y enviar comunicaciones del evento, conforme a su política de protección de datos personales.</small>
              <a class="plink" href="https://www.unicauca.edu.co" target="_blank" rel="noopener">Consultar política de protección de datos</a></span></label>
            @if (bad('autoriza')) { <span class="err">Debes autorizar el tratamiento de datos para continuar</span> }</div>
          <app-aviso>Revisa el correo y la identificación antes de continuar. Tu inscripción aún no está confirmada.</app-aviso>
          <div class="flex flex-col justify-between gap-3 sm:flex-row"><button type="button" class="pbtn" (click)="volver()">Volver al evento</button><button type="submit" class="pbtn pbtn-primary">Revisar inscripción <app-icon class="rotate-180" name="arrow-left" [size]="16" /></button></div>
        </div>
        <div class="flex min-w-0 flex-col gap-6">
          <app-evento-aside modalidad="espectador" />
          <div class="pcard"><h2 class="mb-2 text-2xl">Un registro por persona</h2><p class="mb-4 text-muted">Cada espectador debe completar su propio formulario. No se requiere una cuenta ni documentación de un proyecto.</p>
            <app-aviso>La confirmación reserva tu cupo; la asistencia se verificará el día del evento.</app-aviso></div>
          <app-orientacion />
        </div>
      </form>
    </app-public-layout>`,
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
      <div class="grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        <div class="flex min-w-0 flex-col gap-6">
          <div class="pcard"><h2 class="mb-2 text-2xl">Datos del espectador</h2>
            <div class="mt-1 mb-4.5 flex items-center justify-between"><span class="chip">Modalidad: espectador</span><a class="plink" routerLink="/feria/espectador/formulario">Editar mis datos</a></div>
            <span class="kvl">Nombre completo</span><p class="kvv">{{ e().nombre }}</p>
            <div class="grid gap-x-8 sm:grid-cols-2"><div><span class="kvl">Tipo de identificación</span><p class="kvv">{{ e().tipoId }}</p></div><div><span class="kvl">Número de identificación</span><p class="kvv">{{ e().numId }}</p></div></div><hr class="hr">
            <div class="grid gap-x-8 sm:grid-cols-2"><div><span class="kvl">Correo electrónico</span><p class="kvv">{{ e().correo }}</p></div><div><span class="kvl">Teléfono de contacto</span><p class="kvv">{{ e().telefono || 'No indicado' }}</p></div></div>
            <span class="kvl">Vinculación con el evento</span><p class="kvv">{{ e().vinculacion }}</p>
            <span class="kvl">Requerimientos de accesibilidad</span><p class="kvv">{{ e().accesibilidad || 'No requiero apoyos de accesibilidad.' }}</p></div>
          <div class="pcard"><h2 class="mb-2 text-2xl">Tu visita a la feria</h2>
            <span class="kvl">Evento</span><p class="kvv">Feria de Proyectos de Grado FIET 2026</p>
            <div class="grid gap-x-8 sm:grid-cols-2"><div><span class="kvl">Fecha</span><p class="kvv">15 de octubre de 2026</p></div><div><span class="kvl">Horario</span><p class="kvv">8:00 a. m. – 5:00 p. m.</p></div></div>
            <span class="kvl">Lugar</span><p class="kvv">Centro de Convenciones Casa de la Moneda<br>Popayán, Colombia</p><p class="text-muted">Entrada gratuita · Un cupo individual como espectador</p></div>
          <app-aviso>Autorización de tratamiento de datos personales aceptada. Tus datos se usarán para gestionar la inscripción, verificar el ingreso y comunicar novedades del evento.</app-aviso>
          <div class="flex flex-col justify-between gap-3 sm:flex-row"><a class="pbtn" routerLink="/feria/espectador/formulario"><app-icon name="arrow-left" [size]="16" /> Volver al formulario</a><button class="pbtn pbtn-primary" (click)="confirmar()">Confirmar inscripción <app-icon name="check" [size]="16" /></button></div>
        </div>
        <div class="flex min-w-0 flex-col gap-6">
          <app-evento-aside modalidad="espectador" />
          <div class="pcard"><h2 class="mb-2 text-2xl">Antes de confirmar</h2><p class="mb-4 text-muted">Verifica que tu nombre e identificación coincidan con el documento que presentarás al ingresar.</p>
            <p class="mb-4 text-muted">La confirmación y el pase de ingreso se enviarán a:</p><a class="plink" href="mailto:{{ e().correo }}">{{ e().correo }}</a>
            <div class="mt-4"><app-aviso>Confirmar reserva tu cupo. No registra tu asistencia ni genera un certificado.</app-aviso></div></div>
          <app-orientacion />
        </div>
      </div>
    </app-public-layout>`,
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
      <div class="pcard mb-7 grid items-center gap-5 lg:grid-cols-[1fr_300px] lg:gap-8">
        <div class="flex flex-col items-start gap-3.5 sm:flex-row sm:items-center sm:gap-6"><span class="grid size-[72px] shrink-0 place-items-center rounded-full bg-ok-soft text-ok"><app-icon name="check" [size]="32" /></span><div><h2 class="text-2xl">¡Te esperamos en la feria, {{ nombre() }}!</h2><p class="mt-1 leading-relaxed text-muted">La confirmación y el pase de ingreso se han enviado a {{ e().correo }}. Tu registro corresponde a la modalidad de espectador.</p></div></div>
        <div><span class="kvl">REFERENCIA DE INSCRIPCIÓN</span><strong class="mb-2.5 block text-2xl tracking-wide">{{ e().referencia }}</strong><span class="chip chip-ok">Inscripción confirmada</span><small class="mt-2.5 block text-muted">{{ fecha() }}</small></div>
      </div>
      <div class="grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        <div class="flex min-w-0 flex-col gap-6">
          <div class="pcard"><h2 class="mb-2 text-2xl">Pase de ingreso · Espectador</h2>
            <div class="my-3.5 flex items-center justify-between"><span class="text-xs font-semibold text-info">FERIA EMPRESARIAL · FIET 2026</span><span class="chip chip-ok">Cupo reservado</span></div>
            <h3 class="text-[26px]">Feria de Proyectos de Grado FIET 2026</h3><hr class="hr mt-3.5">
            <span class="kvl">Espectador</span><p class="kvv">{{ e().nombre }}</p>
            <div class="grid gap-x-8 sm:grid-cols-2"><div><span class="kvl">Identificación</span><p class="kvv">{{ e().tipoId }} · {{ e().numId }}</p></div><div><span class="kvl">Vinculación</span><p class="kvv">{{ e().vinculacion }}</p></div></div>
            <span class="kvl">Correo registrado</span><p class="kvv">{{ e().correo }}</p><hr class="hr">
            <div class="grid gap-x-8 sm:grid-cols-2"><div><span class="kvl">Fecha del evento</span><p class="kvv">15 de octubre de 2026</p></div><div><span class="kvl">Horario</span><p class="kvv">8:00 a. m. – 5:00 p. m.</p></div></div>
            <span class="kvl">Lugar de ingreso</span><p class="kvv">Centro de Convenciones Casa de la Moneda<br>Popayán, Colombia</p>
            <div class="mt-1.5 mb-3.5 flex flex-wrap justify-between gap-2 rounded-md bg-surface p-4"><strong>{{ e().referencia }}</strong><span class="text-muted">Personal · Presentar con identificación</span></div>
            <small class="text-muted">Este pase acredita tu inscripción, no tu asistencia. No constituye un certificado de participación.</small></div>
        </div>
        <div class="flex min-w-0 flex-col gap-6">
          <div class="pcard"><h2 class="mb-2 text-2xl">¿Qué sigue ahora?</h2><ol class="mt-3.5 flex list-none flex-col gap-5 p-0">
            <li class="grid grid-cols-[28px_1fr] gap-3"><span class="grid size-7 place-items-center rounded-full bg-navy-soft text-xs font-bold">1</span><div><b class="mb-1 block">Guarda tu pase</b><p class="m-0 leading-relaxed text-muted">Descarga el pase de ingreso o conserva la confirmación enviada a tu correo. Revisa también la carpeta de correo no deseado.</p></div></li>
            <li class="grid grid-cols-[28px_1fr] gap-3"><span class="grid size-7 place-items-center rounded-full bg-navy-soft text-xs font-bold">2</span><div><b class="mb-1 block">Presenta tu identificación</b><p class="m-0 leading-relaxed text-muted">El 15 de octubre, acércate al registro de asistentes desde las 8:00 a. m. con tu cédula y el pase, digital o impreso.</p></div></li>
            <li class="grid grid-cols-[28px_1fr] gap-3"><span class="grid size-7 place-items-center rounded-full bg-navy-soft text-xs font-bold">3</span><div><b class="mb-1 block">Verifica tu ingreso</b><p class="m-0 leading-relaxed text-muted">El equipo del evento validará tu inscripción y registrará tu asistencia en la entrada. Luego podrás recorrer la feria.</p></div></li></ol></div>
          <app-aviso>La asistencia está pendiente de verificación el día del evento. No se ha emitido un certificado.</app-aviso>
          <app-orientacion />
        </div>
      </div>
      <div class="mt-7 flex flex-col gap-3 sm:flex-row">
        <button class="pbtn pbtn-primary" (click)="pase()">Descargar pase de ingreso <app-icon name="download" [size]="16" /></button>
        <a class="pbtn" routerLink="/feria/espectador">Ver agenda del evento <app-icon name="calendar" [size]="16" /></a>
        <a class="pbtn" routerLink="/feria/espectador" (click)="reg.reiniciarEspectador()">Volver al evento</a>
      </div>
      <p class="mt-5 text-muted">Formato PDF · Puedes presentar el pase desde tu celular o llevarlo impreso.</p>
    </app-public-layout>`,
})
export class EspConfirmadaComponent {
  pasos = PASOS; rec = REC;
  protected reg = inject(RegistroService);
  protected e = this.reg.espectador;
  protected nombre = computed(() => this.e().nombre.split(' ').slice(0, 2).join(' '));
  protected fecha = computed(() => fechaHoraEs(this.e().confirmadoEn));
  protected pase() { window.print(); }
}
