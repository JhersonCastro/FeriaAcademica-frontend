import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Usuario } from './models';

const KEY = 'fiet_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  readonly usuario = signal<Usuario | null>(this.cargar());

  private cargar(): Usuario | null {
    try {
      const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  /** Autenticación simulada: requiere correo institucional y contraseña de al menos 6 caracteres. */
  login(correo: string, password: string, recordar: boolean): string | null {
    if (!/^[^\s@]+@unicauca\.edu\.co$/i.test(correo)) return 'Usa tu correo institucional @unicauca.edu.co';
    if (password.length < 6) return 'Correo o contraseña incorrectos';
    this.iniciar(correo.toLowerCase(), recordar);
    return null;
  }

  loginGoogle() { this.iniciar('admin.fiet@unicauca.edu.co', true); }

  private iniciar(correo: string, recordar: boolean) {
    const esAdmin = correo.startsWith('admin.fiet');
    const nombre = esAdmin ? 'Administrador FIET' : correo.split('@')[0];
    const u: Usuario = { nombre, correo, iniciales: esAdmin ? 'AD' : nombre.slice(0, 2).toUpperCase() };
    try { (recordar ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(u)); } catch { /* sin almacenamiento */ }
    this.usuario.set(u);
    this.router.navigateByUrl('/dashboard');
  }

  logout() {
    try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch { /* noop */ }
    this.usuario.set(null);
    this.router.navigateByUrl('/login');
  }
}
