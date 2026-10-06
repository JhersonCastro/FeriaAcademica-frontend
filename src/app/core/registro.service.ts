import { Injectable, signal } from '@angular/core';

export interface Integrante { nombre: string; correo: string; codigo: string; rol: string; }

export interface RegistroProyecto {
  responsable: { nombre: string; correo: string; codigo: string; programa: string; semestre: string; telefono: string };
  integrantes: Integrante[];
  asesor: { nombre: string; correo: string };
  proyecto: {
    nombre: string; categoria: string; tipo: string; resumen: string;
    electrica: boolean; internet: boolean; mesa: boolean; detalle: string;
    archivo: { nombre: string; tamano: number } | null; autoriza: boolean;
  };
  referencia: string;
  enviadaEn: Date | null;
}

export interface RegistroEspectador {
  nombre: string; tipoId: string; numId: string; correo: string; telefono: string;
  vinculacion: string; accesibilidad: string; autoriza: boolean;
  referencia: string; confirmadoEn: Date | null;
}

const proyectoVacio = (): RegistroProyecto => ({
  responsable: { nombre: '', correo: '', codigo: '', programa: 'Ingeniería Electrónica', semestre: 'Décimo semestre', telefono: '' },
  integrantes: [],
  asesor: { nombre: '', correo: '' },
  proyecto: { nombre: '', categoria: 'Innovación tecnológica · IoT', tipo: 'Prototipo de proyecto de grado', resumen: '',
    electrica: false, internet: false, mesa: false, detalle: '', archivo: null, autoriza: false },
  referencia: '', enviadaEn: null,
});

const espectadorVacio = (): RegistroEspectador => ({
  nombre: '', tipoId: 'Cédula de ciudadanía', numId: '', correo: '', telefono: '',
  vinculacion: 'Estudiante', accesibilidad: '', autoriza: false, referencia: '', confirmadoEn: null,
});

@Injectable({ providedIn: 'root' })
export class RegistroService {
  readonly proyecto = signal<RegistroProyecto>(proyectoVacio());
  readonly espectador = signal<RegistroEspectador>(espectadorVacio());
  readonly cuposEspectador = signal(124);
  private nProyecto = 48;
  private nEspectador = 127;

  enviarProyecto() {
    const ref = `FE-2026-${String(this.nProyecto++).padStart(4, '0')}`;
    this.proyecto.update(p => ({ ...p, referencia: ref, enviadaEn: new Date() }));
  }

  confirmarEspectador() {
    const ref = `FE-2026-ESP-${String(this.nEspectador++).padStart(4, '0')}`;
    this.espectador.update(e => ({ ...e, referencia: ref, confirmadoEn: new Date() }));
    this.cuposEspectador.update(c => Math.max(0, c - 1));
  }

  reiniciarProyecto() { this.proyecto.set(proyectoVacio()); }
  reiniciarEspectador() { this.espectador.set(espectadorVacio()); }
}

export function fechaHoraEs(d: Date | null): string {
  if (!d) return '';
  const f = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  const h = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d)
    .replace(/\s/g, ' ').replace(/a\.\s?m\./i, 'a. m.').replace(/p\.\s?m\./i, 'p. m.');
  return `${f} · ${h}`;
}

export const emailInstitucional = /^[^\s@]+@unicauca\.edu\.co$/i;
