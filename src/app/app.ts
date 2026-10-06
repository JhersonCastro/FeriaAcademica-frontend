import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from './core/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    @if (toast.mensaje(); as m) {
      <div class="fixed bottom-24 left-1/2 z-300 -translate-x-1/2 rounded-lg bg-navy px-5.5 py-3 text-white shadow-lg lg:bottom-6" role="status">{{ m }}</div>
    }`,
})
export class App { protected toast = inject(ToastService); }
