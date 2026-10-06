import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CATEGORIAS, Evento } from '../core/models';
import { ModalComponent } from './modal';

@Component({
  selector: 'app-evento-form',
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal [titulo]="evento() ? 'Editar evento' : 'Crear nuevo evento'" (cerrar)="cerrar.emit()">
      <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <div class="mb-4 flex flex-col gap-1.5"><label class="lbl" for="t">Título</label><input class="input" id="t" formControlName="titulo">
          @if (inv('titulo')) { <span class="err">El título es obligatorio</span> }</div>
        <div class="grid gap-x-3.5 sm:grid-cols-2">
          <div class="mb-4 flex flex-col gap-1.5"><label class="lbl" for="c">Categoría</label>
            <select class="input" id="c" formControlName="categoria">@for (c of categorias; track c) { <option>{{ c }}</option> }</select></div>
          <div class="mb-4 flex flex-col gap-1.5"><label class="lbl" for="r">Responsable</label><input class="input" id="r" formControlName="responsable">
            @if (inv('responsable')) { <span class="err">Obligatorio</span> }</div>
          <div class="mb-4 flex flex-col gap-1.5"><label class="lbl" for="f">Fecha</label><input class="input" id="f" type="date" formControlName="fecha">
            @if (inv('fecha')) { <span class="err">Obligatoria</span> }</div>
          <div class="mb-4 flex flex-col gap-1.5"><label class="lbl" for="h">Horario</label><input class="input" id="h" formControlName="hora" placeholder="08:00 AM - 05:00 PM"></div>
          <div class="mb-4 flex flex-col gap-1.5"><label class="lbl" for="l">Lugar</label><input class="input" id="l" formControlName="lugar"></div>
          <div class="mb-4 flex flex-col gap-1.5"><label class="lbl" for="cu">Cupos</label><input class="input" id="cu" type="number" min="1" formControlName="cupos">
            @if (inv('cupos')) { <span class="err">Mínimo 1</span> }</div>
        </div>
        <div class="mb-4 flex flex-col gap-1.5"><label class="lbl" for="d">Descripción</label><textarea class="input" id="d" rows="3" formControlName="descripcion"></textarea></div>
        <div class="flex justify-end gap-2.5">
          <button type="button" class="btn" (click)="cerrar.emit()">Cancelar</button>
          <button type="submit" class="btn btn-primary">{{ evento() ? 'Guardar cambios' : 'Crear evento' }}</button>
        </div>
      </form>
    </app-modal>`,
})
export class EventoFormComponent {
  evento = input<Evento>();
  guardar = output<Omit<Evento, 'id'> & { id?: number }>();
  cerrar = output<void>();

  protected categorias = CATEGORIAS;
  protected form = inject(FormBuilder).nonNullable.group({
    titulo: ['', Validators.required], categoria: [CATEGORIAS[0]], responsable: ['', Validators.required],
    fecha: ['', Validators.required], hora: ['08:00 AM - 05:00 PM'], lugar: [''],
    cupos: [50, [Validators.required, Validators.min(1)]], descripcion: [''],
  });

  ngOnInit() {
    const e = this.evento();
    if (e) this.form.patchValue(e);
  }

  protected inv(c: 'titulo' | 'responsable' | 'fecha' | 'cupos') {
    const ctl = this.form.controls[c];
    return ctl.invalid && ctl.touched;
  }

  protected enviar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const e = this.evento();
    this.guardar.emit({
      inscritos: 0, estado: 'En Revisión', agenda: [], responsables: [],
      ...e, ...this.form.getRawValue(),
    });
  }
}
