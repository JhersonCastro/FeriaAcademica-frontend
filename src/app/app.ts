import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { inject } from '@angular/core';
import { ToastService } from './core/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />@if (toast.mensaje(); as m) { <div class="toast-pub" role="status">{{ m }}</div> }`,
  styles: [`.toast-pub { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--navy); color: #fff; padding: 12px 22px; border-radius: 8px; z-index: 300; }`],
})
export class App { protected toast = inject(ToastService); }
