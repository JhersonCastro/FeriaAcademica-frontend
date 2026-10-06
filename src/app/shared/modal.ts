import { Component, input, output } from '@angular/core';
import { IconComponent } from './icon';

@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  template: `
    <div class="backdrop" (click)="cerrar.emit()">
      <div class="dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <header>
          <h2>{{ titulo() }}</h2>
          <button class="close" (click)="cerrar.emit()" aria-label="Cerrar"><app-icon name="x" /></button>
        </header>
        <ng-content />
      </div>
    </div>`,
  styles: [`
    .backdrop { position: fixed; inset: 0; background: rgba(15,31,64,.5); display: flex; align-items: center;
      justify-content: center; padding: 16px; z-index: 100; }
    .dialog { background: #fff; border-radius: 12px; padding: 24px; width: 100%; max-width: 560px; max-height: 90vh; overflow: auto; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    h2 { font-size: 22px; }
    .close { background: none; border: 0; color: var(--muted); }
  `],
})
export class ModalComponent {
  titulo = input.required<string>();
  cerrar = output<void>();
}
