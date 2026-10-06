import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly mensaje = signal<string | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  mostrar(texto: string) {
    this.mensaje.set(texto);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.mensaje.set(null), 3000);
  }
}
