import { Component, input, output } from '@angular/core';
import { IconComponent } from './icon';

@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  template: `
    <div class="fixed inset-0 z-100 flex items-center justify-center bg-navy/50 p-4" (click)="cerrar.emit()">
      <div class="max-h-[90vh] w-full max-w-[560px] overflow-auto rounded-xl bg-white p-6" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <header class="mb-4.5 flex items-center justify-between">
          <h2 class="text-[22px]">{{ titulo() }}</h2>
          <button class="border-0 bg-transparent text-muted" (click)="cerrar.emit()" aria-label="Cerrar"><app-icon name="x" /></button>
        </header>
        <ng-content />
      </div>
    </div>`,
})
export class ModalComponent {
  titulo = input.required<string>();
  cerrar = output<void>();
}
