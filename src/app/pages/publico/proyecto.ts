import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { emailInstitucional, fechaHoraEs, Integrante, RegistroService } from '../../core/registro.service';
import { IconComponent } from '../../shared/icon';
import { ModalComponent } from '../../shared/modal';
import { PublicLayoutComponent } from '../../shared/public/public-layout';
import { AgendaPublicaComponent, AvisoComponent, EventoAsideComponent, EventoHeroComponent, OrientacionComponent } from '../../shared/public/piezas';

const PASOS = ['Descubrir el evento', 'Estudiante y equipo', 'Información del proyecto', 'Solicitud enviada'];
const REC = 'Recorrido del estudiante';

const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || 'MV';

/* ---------- Paso 1 ---------- */
@Component({
  selector: 'app-proyecto-descubrir',
  imports: [RouterLink, PublicLayoutComponent, EventoHeroComponent, AgendaPublicaComponent, AvisoComponent, IconComponent],
  template: `
    <app-public-layout modo="estudiante" [paso]="1" [pasos]="pasos" [recorrido]="rec" titulo="Comparte tu proyecto con la región"
      subtitulo="Conoce el evento y elige cómo deseas participar. Este recorrido es para estudiantes expositores.">
      <app-evento-hero />
      <div class="mt-7 grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        <div class="flex min-w-0 flex-col gap-6">
          <div class="pcard"><h2 class="mb-2 text-2xl">¿Quiénes pueden postular su proyecto?</h2>
            <p>Estudiantes de último semestre de la FIET con un prototipo o proyecto de investigación vinculado a su programa y acompañado por un asesor académico.</p>
            <div class="mt-3 flex flex-wrap gap-x-10 gap-y-2"><span class="inline-flex items-center gap-2"><app-icon name="check" [size]="16" /> Matrícula activa y correo institucional</span><span class="inline-flex items-center gap-2"><app-icon name="check" [size]="16" /> Equipo identificado y documento del proyecto</span></div>
          </div>
          <app-agenda-publica />
        </div>
        <div class="flex min-w-0 flex-col gap-6">
          <div class="pcard border-2 border-info">
            <p class="mb-2.5 flex items-center gap-2 text-xs font-semibold text-info"><app-icon name="presentation" [size]="16" /> ESTUDIANTE EXPOSITOR</p>
            <h2 class="mb-2 text-2xl">Postula tu proyecto</h2>
            <p class="mb-4 text-muted">Presenta tu propuesta, registra a tu equipo y envía la documentación para revisión del comité.</p>
            <a class="pbtn pbtn-primary w-full" routerLink="/feria/proyecto/equipo">Participar con mi proyecto <app-icon class="rotate-180" name="arrow-left" [size]="16" /></a>
            <div class="mt-4"><app-aviso>La postulación está sujeta a revisión. No garantiza un stand ni la participación aprobada.</app-aviso></div>
          </div>
          <div class="pcard"><h2 class="mb-2 text-2xl">¿Solo deseas asistir?</h2><p class="mb-4 text-muted">Como espectador puedes conocer los proyectos y asistir a la agenda, sin presentar una propuesta.</p>
            <a class="pbtn w-full" routerLink="/feria/espectador">Registrarme como espectador</a></div>
        </div>
      </div>
    </app-public-layout>`,
})
export class ProyectoDescubrirComponent { pasos = PASOS; rec = REC; }

/* ---------- Paso 2 ---------- */
@Component({
  selector: 'app-proyecto-equipo',
  imports: [ReactiveFormsModule, PublicLayoutComponent, EventoAsideComponent, AvisoComponent, OrientacionComponent, IconComponent, ModalComponent],
  template: `
    <app-public-layout modo="estudiante" [paso]="2" [pasos]="pasos" [recorrido]="rec" [iniciales]="ini()" titulo="Datos del estudiante y equipo"
      subtitulo="Identifica a la persona responsable de la solicitud, a los integrantes y al asesor académico.">
      <form class="grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-8" [formGroup]="form" (ngSubmit)="continuar()" novalidate>
        <div class="flex min-w-0 flex-col gap-6">
          <div class="pcard" formGroupName="responsable">
            <div class="flex items-center justify-between gap-2"><h2 class="text-2xl">Estudiante responsable</h2><span class="text-xs text-muted">* Campos obligatorios</span></div>
            <p class="mt-2 mb-4 text-muted">Esta persona recibirá las comunicaciones del comité sobre el proyecto.</p>
            <div class="grid gap-x-5 sm:grid-cols-2">
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="n">Nombre completo <span class="text-brand">*</span></label><input class="pinput" id="n" formControlName="nombre" autocomplete="name">@if (bad('responsable.nombre')) { <span class="err">Obligatorio</span> }</div>
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="c">Correo institucional <span class="text-brand">*</span></label><input class="pinput" id="c" type="email" formControlName="correo" placeholder="usuario@unicauca.edu.co">@if (bad('responsable.correo')) { <span class="err">Usa tu correo &#64;unicauca.edu.co</span> }</div>
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="cd">Código estudiantil <span class="text-brand">*</span></label><input class="pinput" id="cd" formControlName="codigo" inputmode="numeric">@if (bad('responsable.codigo')) { <span class="err">Obligatorio</span> }</div>
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="pr">Programa académico <span class="text-brand">*</span></label><select class="pinput" id="pr" formControlName="programa">@for (p of programas; track p) { <option>{{ p }}</option> }</select></div>
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="se">Semestre actual <span class="text-brand">*</span></label><select class="pinput" id="se" formControlName="semestre">@for (s of semestres; track s) { <option>{{ s }}</option> }</select></div>
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="tl">Teléfono de contacto</label><input class="pinput" id="tl" formControlName="telefono" inputmode="tel"></div>
            </div>
          </div>

          <div class="pcard">
            <div class="flex items-center justify-between gap-2"><h2 class="text-2xl">Equipo del proyecto</h2><span class="chip">{{ integrantes().length + 1 }} integrante{{ integrantes().length ? 's' : '' }}</span></div>
            <p class="mt-2 mb-4 text-muted">{{ form.controls.responsable.controls.nombre.value || 'El estudiante responsable' }} está incluida como responsable del equipo.</p>
            @for (i of integrantes(); track $index) {
              <div class="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-line py-3.5 sm:grid-cols-[1fr_160px_90px]">
                <div><strong>{{ i.nombre }}</strong><small class="block text-muted">{{ i.correo }}</small></div>
                <div class="col-start-1 sm:col-start-auto">{{ i.codigo }}<small class="block text-muted">{{ i.rol }}</small></div>
                <span class="col-start-2 row-start-1 flex justify-end gap-3.5 sm:col-start-auto sm:row-start-auto">
                  <button type="button" class="plink" (click)="abrir($index)">Editar</button>
                  <button type="button" class="plink text-muted" (click)="quitar($index)" aria-label="Quitar"><app-icon name="trash" [size]="14" /></button>
                </span>
              </div>
            }
            <button type="button" class="pbtn mt-3.5" (click)="abrir(-1)">Agregar integrante <app-icon name="plus" [size]="16" /></button>
          </div>

          <div class="pcard" formGroupName="asesor"><h2 class="mb-2 text-2xl">Asesor académico</h2>
            <div class="grid gap-x-5 sm:grid-cols-2">
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="an">Nombre del asesor <span class="text-brand">*</span></label><input class="pinput" id="an" formControlName="nombre">@if (bad('asesor.nombre')) { <span class="err">Obligatorio</span> }</div>
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="ac">Correo institucional del asesor <span class="text-brand">*</span></label><input class="pinput" id="ac" type="email" formControlName="correo">@if (bad('asesor.correo')) { <span class="err">Usa el correo &#64;unicauca.edu.co</span> }</div>
            </div></div>

          <div class="flex flex-col justify-between gap-3 sm:flex-row"><button type="button" class="pbtn" (click)="volver()">Volver al evento</button>
            <div class="flex flex-col gap-3 sm:flex-row"><button type="button" class="pbtn" (click)="borrador()">Guardar borrador</button><button type="submit" class="pbtn pbtn-primary">Continuar al proyecto <app-icon class="rotate-180" name="arrow-left" [size]="16" /></button></div></div>
          <p class="text-muted">El borrador permite retomar el registro desde Mis solicitudes. Aún no se ha enviado al comité.</p>
        </div>
        <div class="flex min-w-0 flex-col gap-6">
          <app-evento-aside modalidad="expositor" />
          <div class="pcard"><h2 class="mb-2 text-2xl">Tu equipo, una solicitud</h2><p class="mb-4 text-muted">Registra a todos los integrantes y designa un estudiante responsable. Usaremos su correo institucional para las notificaciones.</p>
            <app-aviso>El envío no implica aprobación ni asignación de un espacio de exhibición.</app-aviso></div>
          <app-orientacion />
        </div>
      </form>

      @if (modal() !== null) {
        <app-modal [titulo]="modal()! >= 0 ? 'Editar integrante' : 'Agregar integrante'" (cerrar)="modal.set(null)">
          <form [formGroup]="mform" (ngSubmit)="guardarIntegrante()" novalidate>
            <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="mn">Nombre completo <span class="text-brand">*</span></label><input class="pinput" id="mn" formControlName="nombre"></div>
            <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="mc">Correo institucional <span class="text-brand">*</span></label><input class="pinput" id="mc" type="email" formControlName="correo">@if (mform.controls.correo.touched && mform.controls.correo.invalid) { <span class="err">Usa un correo &#64;unicauca.edu.co</span> }</div>
            <div class="grid gap-x-5 sm:grid-cols-2"><div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="mk">Código <span class="text-brand">*</span></label><input class="pinput" id="mk" formControlName="codigo"></div>
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="mr">Aporte al proyecto</label><input class="pinput" id="mr" formControlName="rol" placeholder="Hardware y sensores"></div></div>
            <div class="flex justify-between gap-3"><button type="button" class="pbtn" (click)="modal.set(null)">Cancelar</button><button type="submit" class="pbtn pbtn-primary">Guardar</button></div>
          </form>
        </app-modal>
      }
    </app-public-layout>`,
})
export class ProyectoEquipoComponent {
  pasos = PASOS; rec = REC;
  private reg = inject(RegistroService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder).nonNullable;

  protected programas = ['Ingeniería Electrónica', 'Ingeniería de Telecomunicaciones', 'Ingeniería de Sistemas', 'Automática Industrial'];
  protected semestres = ['Octavo semestre', 'Noveno semestre', 'Décimo semestre'];
  protected integrantes = signal<Integrante[]>(this.reg.proyecto().integrantes);
  protected modal = signal<number | null>(null);

  private r = this.reg.proyecto();
  protected form = this.fb.group({
    responsable: this.fb.group({
      nombre: [this.r.responsable.nombre, Validators.required],
      correo: [this.r.responsable.correo, [Validators.required, Validators.pattern(emailInstitucional)]],
      codigo: [this.r.responsable.codigo, Validators.required],
      programa: [this.r.responsable.programa], semestre: [this.r.responsable.semestre], telefono: [this.r.responsable.telefono],
    }),
    asesor: this.fb.group({
      nombre: [this.r.asesor.nombre, Validators.required],
      correo: [this.r.asesor.correo, [Validators.required, Validators.pattern(emailInstitucional)]],
    }),
  });
  protected mform = this.fb.group({
    nombre: ['', Validators.required], correo: ['', [Validators.required, Validators.pattern(emailInstitucional)]], codigo: ['', Validators.required], rol: [''],
  });
  protected ini = computed(() => iniciales(this.reg.proyecto().responsable.nombre));

  protected bad(path: string) { const c = this.form.get(path); return !!c && c.invalid && c.touched; }

  protected abrir(i: number) {
    this.mform.reset({ nombre: '', correo: '', codigo: '', rol: '', ...(i >= 0 ? this.integrantes()[i] : {}) });
    this.modal.set(i);
  }
  protected guardarIntegrante() {
    if (this.mform.invalid) { this.mform.markAllAsTouched(); return; }
    const i = this.modal()!, v = this.mform.getRawValue();
    this.integrantes.update(l => i >= 0 ? l.map((x, k) => (k === i ? v : x)) : [...l, v]);
    this.modal.set(null);
  }
  protected quitar(i: number) { this.integrantes.update(l => l.filter((_, k) => k !== i)); }

  private guardar() { this.reg.proyecto.update(p => ({ ...p, ...this.form.getRawValue(), integrantes: this.integrantes() })); }
  protected borrador() { this.guardar(); this.toast.mostrar('Borrador guardado'); }
  protected volver() { this.guardar(); this.router.navigateByUrl('/feria/proyecto'); }
  protected continuar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardar();
    this.router.navigateByUrl('/feria/proyecto/informacion');
  }
}

/* ---------- Paso 3 ---------- */
@Component({
  selector: 'app-proyecto-info',
  imports: [ReactiveFormsModule, PublicLayoutComponent, EventoAsideComponent, AvisoComponent, OrientacionComponent, IconComponent],
  template: `
    <app-public-layout modo="estudiante" [paso]="3" [pasos]="pasos" [recorrido]="rec" [iniciales]="ini()" titulo="Información del proyecto"
      subtitulo="Describe la propuesta y sus necesidades de exhibición. Revisa los datos antes de enviar la solicitud.">
      <form class="grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-8" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <div class="flex min-w-0 flex-col gap-6">
          <div class="pcard"><h2 class="mb-2 text-2xl">Propuesta académica</h2><p class="mb-3.5 text-xs text-muted">* Campos obligatorios</p>
            <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="pn">Nombre del proyecto <span class="text-brand">*</span></label><input class="pinput" id="pn" formControlName="nombre">@if (bad('nombre')) { <span class="err">Obligatorio</span> }</div>
            <div class="grid gap-x-5 sm:grid-cols-2">
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="pc">Categoría <span class="text-brand">*</span></label><select class="pinput" id="pc" formControlName="categoria">@for (c of categorias; track c) { <option>{{ c }}</option> }</select></div>
              <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="pt">Tipo de propuesta <span class="text-brand">*</span></label><select class="pinput" id="pt" formControlName="tipo">@for (c of tipos; track c) { <option>{{ c }}</option> }</select></div>
            </div>
            <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="pr">Resumen del proyecto <span class="text-brand">*</span></label><textarea class="pinput min-h-20 resize-y" id="pr" rows="4" maxlength="1000" formControlName="resumen"></textarea>
              <span class="text-[13px] text-muted">Incluye el problema, la solución y lo que mostrarás en el evento. Máximo 1.000 caracteres.</span>@if (bad('resumen')) { <span class="err">Describe tu proyecto (mínimo 30 caracteres)</span> }</div>
          </div>

          <div class="pcard"><h2 class="mb-2 text-2xl">Requerimientos para la exhibición</h2><p class="mb-4 text-muted">Indica lo necesario para tu demostración. La disponibilidad se verificará durante la revisión.</p>
            <div class="mb-4.5 flex flex-wrap gap-x-10 gap-y-2.5">
              <label class="flex cursor-pointer items-center gap-2.5"><input class="size-[18px] accent-navy" type="checkbox" formControlName="electrica"> Conexión eléctrica</label>
              <label class="flex cursor-pointer items-center gap-2.5"><input class="size-[18px] accent-navy" type="checkbox" formControlName="internet"> Acceso a internet</label>
              <label class="flex cursor-pointer items-center gap-2.5"><input class="size-[18px] accent-navy" type="checkbox" formControlName="mesa"> Mesa de apoyo</label>
            </div>
            <div class="mb-4 flex flex-col gap-1.5"><label class="plabel" for="pd">Detalle de equipos y necesidades</label><textarea class="pinput min-h-20 resize-y" id="pd" rows="3" formControlName="detalle"></textarea></div>
          </div>

          <div class="pcard"><h2 class="mb-2 text-2xl">Documento del proyecto</h2><p class="mb-4 text-muted">Documento de soporte <span class="text-brand">*</span> · PDF, máximo 10 MB. Incluye la descripción y el aval del asesor.</p>
            @if (archivo(); as a) {
              <div class="grid grid-cols-[24px_1fr_auto] items-center gap-3 rounded-md border border-line bg-surface px-4 py-3.5 sm:grid-cols-[24px_1fr_auto_auto]">
                <app-icon name="file" [size]="22" /><div><strong>{{ a.nombre }}</strong><small class="block text-muted">PDF · {{ mb(a.tamano) }} MB · Archivo cargado</small></div>
                <button type="button" class="pbtn max-sm:col-span-full" (click)="fi.click()">Reemplazar</button>
                <button type="button" class="border-0 bg-transparent text-muted max-sm:col-start-3 max-sm:row-start-1" (click)="archivo.set(null)" aria-label="Quitar archivo"><app-icon name="trash" /></button>
              </div>
            } @else {
              <button type="button" class="flex w-full items-center justify-center gap-2.5 rounded-md border-2 border-dashed border-line bg-surface p-6 font-semibold text-info" (click)="fi.click()"><app-icon name="file" [size]="22" /> Seleccionar archivo PDF</button>
            }
            <input #fi type="file" accept="application/pdf" hidden (change)="elegir($any($event.target))">
            @if (errArchivo()) { <span class="err">{{ errArchivo() }}</span> }
          </div>

          <div class="pcard"><label class="flex cursor-pointer items-start gap-2.5"><input class="mt-0.5 size-[18px] accent-navy" type="checkbox" formControlName="autoriza">
            <span><strong>Autorizo el tratamiento de mis datos personales <span class="text-brand">*</span></strong>
              <small class="mt-1 mb-2 block leading-normal text-muted">Autorizo a la Universidad del Cauca a tratar los datos de esta solicitud para gestionar la inscripción, la evaluación y las comunicaciones del evento, conforme a su política de protección de datos personales.</small>
              <a class="plink" href="https://www.unicauca.edu.co" target="_blank" rel="noopener">Consultar política de protección de datos</a></span></label>
            @if (bad('autoriza')) { <span class="err">Debes autorizar el tratamiento de datos para continuar</span> }
          </div>

          <app-aviso>Al enviar, la solicitud quedará En revisión. El comité comunicará el resultado a tu correo institucional.</app-aviso>
          <div class="flex flex-col justify-between gap-3 sm:flex-row"><button type="button" class="pbtn" (click)="volver()">Volver al equipo</button>
            <div class="flex flex-col gap-3 sm:flex-row"><button type="button" class="pbtn" (click)="borrador()">Guardar borrador</button><button type="submit" class="pbtn pbtn-primary">Enviar solicitud <app-icon class="rotate-180" name="arrow-left" [size]="16" /></button></div></div>
        </div>
        <div class="flex min-w-0 flex-col gap-6">
          <app-evento-aside modalidad="expositor" />
          <div class="pcard"><h2 class="mb-2 text-2xl">Antes de enviar</h2><p class="mb-4 text-muted">Revisa el resumen, los integrantes y el documento adjunto. El comité evaluará la pertinencia académica y las necesidades de exhibición.</p>
            <app-aviso>El envío no implica aprobación ni asignación de un espacio de exhibición.</app-aviso></div>
          <app-orientacion />
        </div>
      </form>
    </app-public-layout>`,
})
export class ProyectoInfoComponent {
  pasos = PASOS; rec = REC;
  private reg = inject(RegistroService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder).nonNullable;

  protected categorias = ['Innovación tecnológica · IoT', 'Telecomunicaciones y redes', 'Software y datos', 'Electrónica y control', 'Energías y sostenibilidad'];
  protected tipos = ['Prototipo de proyecto de grado', 'Proyecto de investigación', 'Proyecto de semillero'];
  private p = this.reg.proyecto().proyecto;
  protected archivo = signal(this.p.archivo);
  protected errArchivo = signal('');
  protected ini = computed(() => iniciales(this.reg.proyecto().responsable.nombre));

  protected form = this.fb.group({
    nombre: [this.p.nombre, Validators.required], categoria: [this.p.categoria], tipo: [this.p.tipo],
    resumen: [this.p.resumen, [Validators.required, Validators.minLength(30), Validators.maxLength(1000)]],
    electrica: [this.p.electrica], internet: [this.p.internet], mesa: [this.p.mesa], detalle: [this.p.detalle],
    autoriza: [this.p.autoriza, Validators.requiredTrue],
  });

  protected bad(c: 'nombre' | 'resumen' | 'autoriza') { const x = this.form.controls[c]; return x.invalid && x.touched; }
  protected mb = (b: number) => (b / 1048576).toFixed(1).replace('.', ',');

  protected elegir(input: HTMLInputElement) {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    if (f.type !== 'application/pdf') { this.errArchivo.set('El documento debe ser un PDF.'); return; }
    if (f.size > 10 * 1048576) { this.errArchivo.set('El archivo supera los 10 MB.'); return; }
    this.errArchivo.set('');
    this.archivo.set({ nombre: f.name, tamano: f.size });
  }

  private guardar() { this.reg.proyecto.update(r => ({ ...r, proyecto: { ...this.form.getRawValue(), archivo: this.archivo() } })); }
  protected borrador() { this.guardar(); this.toast.mostrar('Borrador guardado'); }
  protected volver() { this.guardar(); this.router.navigateByUrl('/feria/proyecto/equipo'); }
  protected enviar() {
    if (!this.archivo()) this.errArchivo.set('Adjunta el documento de soporte en PDF.');
    if (this.form.invalid || !this.archivo()) { this.form.markAllAsTouched(); return; }
    this.guardar();
    this.reg.enviarProyecto();
    this.router.navigateByUrl('/feria/proyecto/enviada');
  }
}

/* ---------- Paso 4 ---------- */
@Component({
  selector: 'app-proyecto-enviada',
  imports: [RouterLink, PublicLayoutComponent, AvisoComponent, IconComponent],
  template: `
    <app-public-layout modo="estudiante" [paso]="4" [pasos]="pasos" [recorrido]="rec" [iniciales]="ini()" titulo="Solicitud enviada"
      subtitulo="Conserva tu referencia y consulta las novedades de la evaluación desde Mis solicitudes.">
      <div class="pcard mb-7 grid items-center gap-5 lg:grid-cols-[1fr_300px] lg:gap-8">
        <div class="flex flex-col items-start gap-3.5 sm:flex-row sm:items-center sm:gap-6"><span class="grid size-[72px] shrink-0 place-items-center rounded-full bg-navy-soft text-info"><app-icon name="send" [size]="32" /></span><div><h2 class="text-2xl">Hemos recibido tu propuesta, {{ nombre() }}</h2><p class="mt-1 leading-relaxed text-muted">Tu proyecto fue enviado al comité del evento. La recepción de la solicitud no equivale a la aprobación de tu participación.</p></div></div>
        <div><span class="kvl">REFERENCIA DE SOLICITUD</span><strong class="mb-2.5 block text-2xl tracking-wide">{{ r().referencia }}</strong><span class="chip">En revisión</span><small class="mt-2.5 block text-muted">Enviada el {{ fecha() }}</small></div>
      </div>
      <div class="grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        <div class="flex min-w-0 flex-col gap-6">
          <div class="pcard"><h2 class="mb-2 text-2xl">Resumen de tu solicitud</h2><p class="mt-2 mb-4.5 text-xs font-semibold text-info">POSTULACIÓN COMO ESTUDIANTE EXPOSITOR</p><h3 class="mb-5 text-[26px]">{{ r().proyecto.nombre }}</h3>
            <div class="grid gap-x-8 sm:grid-cols-2"><div><span class="kvl">Categoría</span><p class="kvv">{{ r().proyecto.categoria }}</p></div><div><span class="kvl">Tipo de propuesta</span><p class="kvv">{{ r().proyecto.tipo }}</p></div></div><hr class="hr">
            <span class="kvl">Evento</span><p class="kvv">Feria de Proyectos de Grado FIET 2026 · 15 de octubre de 2026<br>Centro de Convenciones Casa de la Moneda, Popayán</p>
            <div class="grid gap-x-8 sm:grid-cols-2"><div><span class="kvl">Estudiante responsable</span><p class="kvv">{{ r().responsable.nombre }}<br>{{ r().responsable.correo }}<br>{{ r().responsable.codigo }} · {{ r().responsable.programa }} · {{ r().responsable.semestre }}</p></div>
              <div><span class="kvl">Asesor académico</span><p class="kvv">{{ r().asesor.nombre }}<br>{{ r().asesor.correo }}</p></div></div>
            <span class="kvl">Equipo · {{ r().integrantes.length + 1 }} integrante{{ r().integrantes.length ? 's' : '' }}</span><p class="kvv">{{ equipo() }}</p><hr class="hr">
            <span class="kvl">Requerimientos solicitados</span><p class="kvv">{{ reqs() }}<br>{{ r().proyecto.detalle }}</p>
            <div class="mb-3.5 flex items-center gap-2.5 rounded-md bg-surface px-4 py-3.5 text-info"><app-icon name="file" /> {{ r().proyecto.archivo?.nombre }} · {{ mb() }} MB</div>
            <small class="text-muted">Autorización de tratamiento de datos personales registrada.</small></div>
        </div>
        <div class="flex min-w-0 flex-col gap-6">
          <div class="pcard"><h2 class="mb-2 text-2xl">¿Qué sigue ahora?</h2><ol class="mt-3.5 flex list-none flex-col gap-5 p-0">
            <li class="grid grid-cols-[28px_1fr] gap-3"><span class="grid size-7 place-items-center rounded-full bg-navy-soft text-xs font-bold">1</span><div><b class="mb-1 block">Revisión académica y logística</b><p class="m-0 leading-relaxed text-muted">El comité revisará el proyecto, el aval del asesor y los requerimientos para la exhibición.</p></div></li>
            <li class="grid grid-cols-[28px_1fr] gap-3"><span class="grid size-7 place-items-center rounded-full bg-navy-soft text-xs font-bold">2</span><div><b class="mb-1 block">Notificación del resultado</b><p class="m-0 leading-relaxed text-muted">Recibirás la decisión y cualquier solicitud de ajustes en {{ r().responsable.correo }}. También podrás consultarla en Mis solicitudes.</p></div></li>
            <li class="grid grid-cols-[28px_1fr] gap-3"><span class="grid size-7 place-items-center rounded-full bg-navy-soft text-xs font-bold">3</span><div><b class="mb-1 block">Atención a las indicaciones</b><p class="m-0 leading-relaxed text-muted">Si se solicitan ajustes, consulta las observaciones y el plazo indicado. Si se aprueba, recibirás las instrucciones de participación.</p></div></li></ol></div>
          <app-aviso><b>Importante</b><br>El comprobante confirma el envío, no la aprobación, la asignación de un stand ni la emisión de un certificado.</app-aviso>
          <p class="px-1 text-muted">Para consultas, escribe a bhurtado&#64;unicauca.edu.co e incluye la referencia {{ r().referencia }}.</p>
        </div>
      </div>
      <div class="mt-7 flex flex-col gap-3 sm:flex-row">
        <button class="pbtn pbtn-primary" (click)="pronto()">Ir a Mis solicitudes <app-icon class="rotate-180" name="arrow-left" [size]="16" /></button>
        <button class="pbtn" (click)="comprobante()">Descargar comprobante <app-icon name="download" [size]="16" /></button>
        <a class="pbtn" routerLink="/feria/proyecto" (click)="reg.reiniciarProyecto()">Volver al evento</a>
      </div>
    </app-public-layout>`,
})
export class ProyectoEnviadaComponent {
  pasos = PASOS; rec = REC;
  protected reg = inject(RegistroService);
  private toast = inject(ToastService);
  protected r = this.reg.proyecto;
  protected nombre = computed(() => this.r().responsable.nombre.split(' ').slice(0, 2).join(' '));
  protected ini = computed(() => iniciales(this.r().responsable.nombre));
  protected fecha = computed(() => fechaHoraEs(this.r().enviadaEn));
  protected mb = computed(() => ((this.r().proyecto.archivo?.tamano ?? 0) / 1048576).toFixed(1).replace('.', ','));
  protected equipo = computed(() => [this.r().responsable.nombre, ...this.r().integrantes.map(i => i.nombre)].join(', ').replace(/, ([^,]*)$/, ' y $1'));
  protected reqs = computed(() => {
    const p = this.r().proyecto;
    const l = [p.electrica && 'conexión eléctrica', p.internet && 'acceso a internet', p.mesa && 'mesa de apoyo'].filter(Boolean) as string[];
    return l.length ? l.join(', ').replace(/^./, c => c.toUpperCase()) + '.' : 'Sin requerimientos especiales.';
  });
  protected pronto() { this.toast.mostrar('Mis solicitudes estará disponible próximamente.'); }
  protected comprobante() { window.print(); }
}
