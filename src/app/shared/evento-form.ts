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
        <div class="field"><label for="t">Título</label><input id="t" formControlName="titulo">
          @if (inv('titulo')) { <span class="error">El título es obligatorio</span> }</div>
        <div class="two">
          <div class="field"><label for="c">Categoría</label>
            <select id="c" formControlName="categoria">@for (c of categorias; track c) { <option>{{ c }}</option> }</select></div>
          <div class="field"><label for="r">Responsable</label><input id="r" formControlName="responsable">
            @if (inv('responsable')) { <span class="error">Obligatorio</span> }</div>
        </div>
        <div class="two">
          <div class="field"><label for="f">Fecha</label><input id="f" type="date" formControlName="fecha">
            @if (inv('fecha')) { <span class="error">Obligatoria</span> }</div>
          <div class="field"><label for="h">Horario</label><input id="h" formControlName="hora" placeholder="08:00 AM - 05:00 PM"></div>
        </div>
        <div class="two">
          <div class="field"><label for="l">Lugar</label><input id="l" formControlName="lugar"></div>
          <div class="field"><label for="cu">Cupos</label><input id="cu" type="number" min="1" formControlName="cupos">
            @if (inv('cupos')) { <span class="error">Mínimo 1</span> }</div>
        </div>
        <div class="field"><label for="d">Descripción</label><textarea id="d" rows="3" formControlName="descripcion"></textarea></div>
        <div class="actions">
          <button type="button" class="btn" (click)="cerrar.emit()">Cancelar</button>
          <button type="submit" class="btn primary">{{ evento() ? 'Guardar cambios' : 'Crear evento' }}</button>
        </div>
      </form>
    </app-modal>`,
  styles: [`
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; }
    @media (max-width: 560px) { .two { grid-template-columns: 1fr; } }
  `],
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
