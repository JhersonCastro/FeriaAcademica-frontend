import { Component, input } from '@angular/core';

@Component({
  selector: 'app-crest',
  template: `<img class="shrink-0 rounded-sm bg-white object-contain" src="img/escudo.png" alt="Escudo Universidad del Cauca" [style.height.px]="size() * 1.3">`,
})
export class CrestComponent { size = input(52); }
