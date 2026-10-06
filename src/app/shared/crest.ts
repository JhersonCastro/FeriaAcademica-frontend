import { Component, input } from '@angular/core';

/** Placeholder del escudo institucional (reemplazar por el escudo oficial en public/img). */
@Component({
  selector: 'app-crest',
  template: `<div class="crest" [style.width.px]="size()" [style.height.px]="size() * 1.45"><span>ESCUDO<br>UNICAUCA</span></div>`,
  styles: [`
    .crest { background: #fff; border: 2px solid #000; outline: 1.5px dotted #000; outline-offset: -6px;
      display: flex; align-items: center; justify-content: center; text-align: center;
      font: 700 8px/1.1 var(--sans); color: #000; flex-shrink: 0; }
  `],
})
export class CrestComponent { size = input(52); }
