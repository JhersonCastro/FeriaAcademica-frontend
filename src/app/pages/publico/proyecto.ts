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
      <div class="pub-cols" style="margin-top:28px">
        <div class="pub-main">
          <div class="pcard"><h2>¿Quiénes pueden postular su proyecto?</h2>
            <p>Estudiantes de último semestre de la FIET con un prototipo o proyecto de investigación vinculado a su programa y acompañado por un asesor académico.</p>
            <div class="ck"><span><app-icon name="check" [size]="16" /> Matrícula activa y correo institucional</span><span><app-icon name="check" [size]="16" /> Equipo identificado y documento del proyecto</span></div>
          </div>
          <app-agenda-publica />
        </div>
        <div class="pub-side">
          <div class="pcard dest">
            <p class="et"><app-icon name="presentation" [size]="16" /> ESTUDIANTE EXPOSITOR</p>
            <h2>Postula tu proyecto</h2>
            <p class="muted">Presenta tu propuesta, registra a tu equipo y envía la documentación para revisión del comité.</p>
            <a class="pbtn primary block" routerLink="/feria/proyecto/equipo">Participar con mi proyecto <app-icon name="arrow-left" [size]="16" class="fl" /></a>
            <div style="margin-top:16px"><app-aviso>La postulación está sujeta a revisión. No garantiza un stand ni la participación aprobada.</app-aviso></div>
          </div>
          <div class="pcard"><h2>¿Solo deseas asistir?</h2><p class="muted">Como espectador puedes conocer los proyectos y asistir a la agenda, sin presentar una propuesta.</p>
            <a class="pbtn block" routerLink="/feria/espectador">Registrarme como espectador</a></div>
        </div>
      </div>
    </app-public-layout>`,
  styles: [`.ck { display: flex; gap: 40px; flex-wrap: wrap; margin-top: 12px; span { display: inline-flex; gap: 8px; align-items: center; } }
    .dest { border: 2px solid #1e4a96; } .et { color: #1e4a96; font-size: 12px; font-weight: 600; display: flex; gap: 8px; align-items: center; margin: 0 0 10px; }
    .fl { transform: rotate(180deg); }`],
})
export class ProyectoDescubrirComponent { pasos = PASOS; rec = REC; }

/* ---------- Paso 2 ---------- */
@Component({
  selector: 'app-proyecto-equipo',
  imports: [ReactiveFormsModule, PublicLayoutComponent, EventoAsideComponent, AvisoComponent, OrientacionComponent, IconComponent, ModalComponent],
  template: `
    <app-public-layout modo="estudiante" [paso]="2" [pasos]="pasos" [recorrido]="rec" [iniciales]="ini()" titulo="Datos del estudiante y equipo"
      subtitulo="Identifica a la persona responsable de la solicitud, a los integrantes y al asesor académico.">
      <form class="pub-cols" [formGroup]="form" (ngSubmit)="continuar()" novalidate>
        <div class="pub-main">
          <div class="pcard" formGroupName="responsable">
            <div class="hd"><h2>Estudiante responsable</h2><span class="req-note">* Campos obligatorios</span></div>
            <p class="muted">Esta persona recibirá las comunicaciones del comité sobre el proyecto.</p>
            <div class="pf-2">
              <div class="pf"><label for="n">Nombre completo <span class="req">*</span></label><input id="n" formControlName="nombre" autocomplete="name">@if (bad('responsable.nombre')) { <span class="err">Obligatorio</span> }</div>
              <div class="pf"><label for="c">Correo institucional <span class="req">*</span></label><input id="c" type="email" formControlName="correo" placeholder="usuario@unicauca.edu.co">@if (bad('responsable.correo')) { <span class="err">Usa tu correo &#64;unicauca.edu.co</span> }</div>
              <div class="pf"><label for="cd">Código estudiantil <span class="req">*</span></label><input id="cd" formControlName="codigo" inputmode="numeric">@if (bad('responsable.codigo')) { <span class="err">Obligatorio</span> }</div>
              <div class="pf"><label for="pr">Programa académico <span class="req">*</span></label><select id="pr" formControlName="programa">@for (p of programas; track p) { <option>{{ p }}</option> }</select></div>
              <div class="pf"><label for="se">Semestre actual <span class="req">*</span></label><select id="se" formControlName="semestre">@for (s of semestres; track s) { <option>{{ s }}</option> }</select></div>
              <div class="pf"><label for="tl">Teléfono de contacto</label><input id="tl" formControlName="telefono" inputmode="tel"></div>
            </div>
          </div>

          <div class="pcard">
            <div class="hd"><h2>Equipo del proyecto</h2><span class="chip">{{ integrantes().length + 1 }} integrante{{ integrantes().length ? 's' : '' }}</span></div>
            <p class="muted">{{ form.controls.responsable.controls.nombre.value || 'El estudiante responsable' }} está incluida como responsable del equipo.</p>
            @for (i of integrantes(); track $index) {
              <div class="mi"><div><strong>{{ i.nombre }}</strong><small>{{ i.correo }}</small></div><div class="c2">{{ i.codigo }}<small>{{ i.rol }}</small></div>
                <span class="ac"><button type="button" class="plink" (click)="abrir($index)">Editar</button><button type="button" class="plink del" (click)="quitar($index)" aria-label="Quitar"><app-icon name="trash" [size]="14" /></button></span></div>
            }
            <button type="button" class="pbtn" style="margin-top:14px" (click)="abrir(-1)">Agregar integrante <app-icon name="plus" [size]="16" /></button>
          </div>

          <div class="pcard" formGroupName="asesor"><h2>Asesor académico</h2>
            <div class="pf-2">
              <div class="pf"><label for="an">Nombre del asesor <span class="req">*</span></label><input id="an" formControlName="nombre">@if (bad('asesor.nombre')) { <span class="err">Obligatorio</span> }</div>
              <div class="pf"><label for="ac">Correo institucional del asesor <span class="req">*</span></label><input id="ac" type="email" formControlName="correo">@if (bad('asesor.correo')) { <span class="err">Usa el correo &#64;unicauca.edu.co</span> }</div>
            </div></div>

          <div class="pactions"><a class="pbtn" href="/feria/proyecto" (click)="$event.preventDefault(); volver()">Volver al evento</a>
            <div class="right"><button type="button" class="pbtn" (click)="borrador()">Guardar borrador</button><button type="submit" class="pbtn primary">Continuar al proyecto <app-icon name="arrow-left" [size]="16" class="fl" /></button></div></div>
          <p class="muted">El borrador permite retomar el registro desde Mis solicitudes. Aún no se ha enviado al comité.</p>
        </div>
        <div class="pub-side">
          <app-evento-aside modalidad="expositor" />
          <div class="pcard"><h2>Tu equipo, una solicitud</h2><p class="muted">Registra a todos los integrantes y designa un estudiante responsable. Usaremos su correo institucional para las notificaciones.</p>
            <app-aviso>El envío no implica aprobación ni asignación de un espacio de exhibición.</app-aviso></div>
          <app-orientacion />
        </div>
      </form>

      @if (modal() !== null) {
        <app-modal [titulo]="modal()! >= 0 ? 'Editar integrante' : 'Agregar integrante'" (cerrar)="modal.set(null)">
          <form [formGroup]="mform" (ngSubmit)="guardarIntegrante()" novalidate>
            <div class="pf"><label for="mn">Nombre completo <span class="req">*</span></label><input id="mn" formControlName="nombre"></div>
            <div class="pf"><label for="mc">Correo institucional <span class="req">*</span></label><input id="mc" type="email" formControlName="correo">@if (mform.controls.correo.touched && mform.controls.correo.invalid) { <span class="err">Usa un correo &#64;unicauca.edu.co</span> }</div>
            <div class="pf-2"><div class="pf"><label for="mk">Código <span class="req">*</span></label><input id="mk" formControlName="codigo"></div>
              <div class="pf"><label for="mr">Aporte al proyecto</label><input id="mr" formControlName="rol" placeholder="Hardware y sensores"></div></div>
            <div class="pactions"><button type="button" class="pbtn" (click)="modal.set(null)">Cancelar</button><button type="submit" class="pbtn primary">Guardar</button></div>
          </form>
        </app-modal>
      }
    </app-public-layout>`,
  styles: [`.hd { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .mi { display: grid; grid-template-columns: 1fr 160px 90px; gap: 12px; align-items: center; padding: 14px 0; border-top: 1px solid var(--border);
      small { display: block; color: var(--muted); } .c2 { font-size: 14px; } .ac { display: flex; gap: 14px; justify-content: flex-end; } .del { color: var(--muted); } }
    .fl { transform: rotate(180deg); }
    @media (max-width: 640px) { .mi { grid-template-columns: 1fr auto; .c2 { grid-column: 1; } .ac { grid-row: 1; grid-column: 2; } } }`],
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
      <form class="pub-cols" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <div class="pub-main">
          <div class="pcard"><h2>Propuesta académica</h2><p class="req-note">* Campos obligatorios</p>
            <div class="pf"><label for="pn">Nombre del proyecto <span class="req">*</span></label><input id="pn" formControlName="nombre">@if (bad('nombre')) { <span class="err">Obligatorio</span> }</div>
            <div class="pf-2">
              <div class="pf"><label for="pc">Categoría <span class="req">*</span></label><select id="pc" formControlName="categoria">@for (c of categorias; track c) { <option>{{ c }}</option> }</select></div>
              <div class="pf"><label for="pt">Tipo de propuesta <span class="req">*</span></label><select id="pt" formControlName="tipo">@for (c of tipos; track c) { <option>{{ c }}</option> }</select></div>
            </div>
            <div class="pf"><label for="pr">Resumen del proyecto <span class="req">*</span></label><textarea id="pr" rows="4" maxlength="1000" formControlName="resumen"></textarea>
              <span class="hint">Incluye el problema, la solución y lo que mostrarás en el evento. Máximo 1.000 caracteres.</span>@if (bad('resumen')) { <span class="err">Describe tu proyecto (mínimo 30 caracteres)</span> }</div>
          </div>

          <div class="pcard"><h2>Requerimientos para la exhibición</h2><p class="muted">Indica lo necesario para tu demostración. La disponibilidad se verificará durante la revisión.</p>
            <div class="checks"><label class="chk"><input type="checkbox" formControlName="electrica"> Conexión eléctrica</label><label class="chk"><input type="checkbox" formControlName="internet"> Acceso a internet</label><label class="chk"><input type="checkbox" formControlName="mesa"> Mesa de apoyo</label></div>
            <div class="pf"><label for="pd">Detalle de equipos y necesidades</label><textarea id="pd" rows="3" formControlName="detalle"></textarea></div>
          </div>

          <div class="pcard"><h2>Documento del proyecto</h2><p class="muted">Documento de soporte <span class="req">*</span> · PDF, máximo 10 MB. Incluye la descripción y el aval del asesor.</p>
            @if (archivo(); as a) {
              <div class="file"><app-icon name="file" [size]="22" /><div><strong>{{ a.nombre }}</strong><small>PDF · {{ mb(a.tamano) }} MB · Archivo cargado</small></div>
                <button type="button" class="pbtn" (click)="fi.click()">Reemplazar</button><button type="button" class="tr" (click)="archivo.set(null)" aria-label="Quitar archivo"><app-icon name="trash" /></button></div>
            } @else {
              <button type="button" class="drop" (click)="fi.click()"><app-icon name="file" [size]="22" /> Seleccionar archivo PDF</button>
            }
            <input #fi type="file" accept="application/pdf" hidden (change)="elegir($any($event.target))">
            @if (errArchivo()) { <span class="err">{{ errArchivo() }}</span> }
          </div>

          <div class="pcard"><label class="chk top"><input type="checkbox" formControlName="autoriza">
            <span><strong>Autorizo el tratamiento de mis datos personales <span class="req">*</span></strong>
              <small>Autorizo a la Universidad del Cauca a tratar los datos de esta solicitud para gestionar la inscripción, la evaluación y las comunicaciones del evento, conforme a su política de protección de datos personales.</small>
              <a class="plink" href="https://www.unicauca.edu.co" target="_blank" rel="noopener">Consultar política de protección de datos</a></span></label>
            @if (bad('autoriza')) { <span class="err">Debes autorizar el tratamiento de datos para continuar</span> }
          </div>

          <app-aviso>Al enviar, la solicitud quedará En revisión. El comité comunicará el resultado a tu correo institucional.</app-aviso>
          <div class="pactions"><button type="button" class="pbtn" (click)="volver()">Volver al equipo</button>
            <div class="right"><button type="button" class="pbtn" (click)="borrador()">Guardar borrador</button><button type="submit" class="pbtn primary">Enviar solicitud <app-icon name="arrow-left" [size]="16" class="fl" /></button></div></div>
        </div>
        <div class="pub-side">
          <app-evento-aside modalidad="expositor" />
          <div class="pcard"><h2>Antes de enviar</h2><p class="muted">Revisa el resumen, los integrantes y el documento adjunto. El comité evaluará la pertinencia académica y las necesidades de exhibición.</p>
            <app-aviso>El envío no implica aprobación ni asignación de un espacio de exhibición.</app-aviso></div>
          <app-orientacion />
        </div>
      </form>
    </app-public-layout>`,
  styles: [`.checks { display: flex; gap: 40px; flex-wrap: wrap; margin-bottom: 18px; }
    .file { display: grid; grid-template-columns: 24px 1fr auto auto; gap: 12px; align-items: center; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 14px 16px;
      small { display: block; color: var(--muted); } .tr { background: none; border: 0; color: var(--muted); } }
    .drop { width: 100%; border: 2px dashed var(--border); background: var(--bg); border-radius: 6px; padding: 24px; display: flex; gap: 10px; justify-content: center; align-items: center; color: #1e4a96; font-weight: 600; }
    .top { align-items: flex-start; small { display: block; color: var(--muted); margin: 4px 0 8px; line-height: 1.5; } input { margin-top: 3px; } }
    .fl { transform: rotate(180deg); }
    @media (max-width: 640px) { .file { grid-template-columns: 24px 1fr auto; .pbtn { grid-column: 1 / -1; } } }`],
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
      <div class="pcard recibo" style="margin-bottom:28px">
        <div class="l"><span class="ico"><app-icon name="send" [size]="32" /></span><div><h2>Hemos recibido tu propuesta, {{ nombre() }}</h2><p>Tu proyecto fue enviado al comité del evento. La recepción de la solicitud no equivale a la aprobación de tu participación.</p></div></div>
        <div class="ref"><span class="kv-l">REFERENCIA DE SOLICITUD</span><strong>{{ r().referencia }}</strong><span class="chip">En revisión</span><small>Enviada el {{ fecha() }}</small></div>
      </div>
      <div class="pub-cols">
        <div class="pub-main">
          <div class="pcard"><h2>Resumen de tu solicitud</h2><p class="cat">POSTULACIÓN COMO ESTUDIANTE EXPOSITOR</p><h3 class="pn">{{ r().proyecto.nombre }}</h3>
            <div class="kv-grid"><div><span class="kv-l">Categoría</span><p class="kv-v">{{ r().proyecto.categoria }}</p></div><div><span class="kv-l">Tipo de propuesta</span><p class="kv-v">{{ r().proyecto.tipo }}</p></div></div><hr class="sep">
            <span class="kv-l">Evento</span><p class="kv-v">Feria de Proyectos de Grado FIET 2026 · 15 de octubre de 2026<br>Centro de Convenciones Casa de la Moneda, Popayán</p>
            <div class="kv-grid"><div><span class="kv-l">Estudiante responsable</span><p class="kv-v">{{ r().responsable.nombre }}<br>{{ r().responsable.correo }}<br>{{ r().responsable.codigo }} · {{ r().responsable.programa }} · {{ r().responsable.semestre }}</p></div>
              <div><span class="kv-l">Asesor académico</span><p class="kv-v">{{ r().asesor.nombre }}<br>{{ r().asesor.correo }}</p></div></div>
            <span class="kv-l">Equipo · {{ r().integrantes.length + 1 }} integrante{{ r().integrantes.length ? 's' : '' }}</span><p class="kv-v">{{ equipo() }}</p><hr class="sep">
            <span class="kv-l">Requerimientos solicitados</span><p class="kv-v">{{ reqs() }}<br>{{ r().proyecto.detalle }}</p>
            <div class="arch"><app-icon name="file" /> {{ r().proyecto.archivo?.nombre }} · {{ mb() }} MB</div>
            <small class="muted">Autorización de tratamiento de datos personales registrada.</small></div>
        </div>
        <div class="pub-side">
          <div class="pcard"><h2>¿Qué sigue ahora?</h2><ol class="steps-list">
            <li><span class="n">1</span><div><b>Revisión académica y logística</b><p>El comité revisará el proyecto, el aval del asesor y los requerimientos para la exhibición.</p></div></li>
            <li><span class="n">2</span><div><b>Notificación del resultado</b><p>Recibirás la decisión y cualquier solicitud de ajustes en {{ r().responsable.correo }}. También podrás consultarla en Mis solicitudes.</p></div></li>
            <li><span class="n">3</span><div><b>Atención a las indicaciones</b><p>Si se solicitan ajustes, consulta las observaciones y el plazo indicado. Si se aprueba, recibirás las instrucciones de participación.</p></div></li></ol></div>
          <app-aviso><b>Importante</b><br>El comprobante confirma el envío, no la aprobación, la asignación de un stand ni la emisión de un certificado.</app-aviso>
          <p class="muted" style="padding:0 4px">Para consultas, escribe a bhurtado&#64;unicauca.edu.co e incluye la referencia {{ r().referencia }}.</p>
        </div>
      </div>
      <div class="pactions" style="justify-content:flex-start;margin-top:28px">
        <button class="pbtn primary" (click)="pronto()">Ir a Mis solicitudes <app-icon name="arrow-left" [size]="16" class="fl" /></button>
        <button class="pbtn" (click)="comprobante()">Descargar comprobante <app-icon name="download" [size]="16" /></button>
        <a class="pbtn" routerLink="/feria/proyecto" (click)="reg.reiniciarProyecto()">Volver al evento</a>
      </div>
    </app-public-layout>`,
  styles: [`.cat { color: #1e4a96; font-size: 12px; font-weight: 600; margin: 8px 0 18px; } .pn { font-size: 26px; margin-bottom: 20px; }
    .arch { display: flex; gap: 10px; align-items: center; background: var(--bg); border-radius: 6px; padding: 14px 16px; margin-bottom: 14px; color: #1e4a96; }
    .fl { transform: rotate(180deg); }`],
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
