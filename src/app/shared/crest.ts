import { Component, input } from '@angular/core';

/** Placeholder del escudo institucional (reemplazar por el escudo oficial en public/). */
@Component({
  selector: 'app-crest',
  template: `
    <div class="flex shrink-0 items-center justify-center bg-white text-center text-[8px] leading-[1.1] font-bold text-black outline-[1.5px] -outline-offset-6 outline-black outline-dotted border-2 border-black"
         [style.width.px]="size()" [style.height.px]="size() * 1.45"><span>ESCUDO<br>UNICAUCA</span></div>`,
})
export class CrestComponent { size = input(52); }
