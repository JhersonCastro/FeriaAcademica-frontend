import { Injectable, computed, signal } from '@angular/core';
import { Actividad, Certificado, Evento, EstadoRevision, Inscripcion } from './models';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function fechaCorta(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  const mes = MESES[m - 1];
  return `${mes[0].toUpperCase()}${mes.slice(1)} ${String(d).padStart(2, '0')}`;
}

export function fechaMedia(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const mes = MESES[m - 1];
  return `${mes[0].toUpperCase()}${mes.slice(1)} ${d}, ${y}`;
}

export function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dia = DIAS[new Date(y, m - 1, d).getDay()];
  const mes = MESES[m - 1];
  return `${dia} ${d} de ${mes[0].toUpperCase()}${mes.slice(1)}, ${y}`;
}

export function fechaDMA(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

/** "08:00 AM - 05:00 PM" -> "8:00 a. m. – 5:00 p. m." */
export function horaEs(h: string): string {
  return h.replace(/\b0(\d:)/g, '$1').replace(/AM/g, 'a. m.').replace(/PM/g, 'p. m.').replace(' - ', ' – ');
}

export function fechaCert(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3).replace(/^./, c => c.toUpperCase())} ${y}`;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  readonly eventos = signal<Evento[]>([
    {
      id: 1, categoria: 'Feria Académica', titulo: 'Feria de Proyectos de Grado FIET 2026',
      responsable: 'Coord. Telecomunicaciones', fecha: '2026-10-15', hora: '08:00 AM - 05:00 PM',
      lugar: 'Centro de Convenciones Casa de la Moneda, Popayán', cupos: 120, inscritos: 94, estado: 'Aprobado',
      descripcion: 'Espacio institucional donde los estudiantes de último semestre de Ingeniería Electrónica, Telecomunicaciones y Sistemas exponen sus prototipos y proyectos de investigación ante el sector productivo de Popayán y la región.',
      agenda: [
        { hora: '08:00 AM', titulo: 'Apertura y Registro de Asistentes' },
        { hora: '09:30 AM', titulo: 'Recorrido de Evaluadores por Stands de Proyectos' },
        { hora: '12:00 PM', titulo: 'Panel: Innovación Tecnológica frente a la Paz Territorial' },
        { hora: '02:00 PM', titulo: 'Reuniones de Vinculación y Empleo (Graduados)' },
        { hora: '04:30 PM', titulo: 'Ceremonia de Premiación e Inscripción de Certificados' },
      ],
      responsables: [
        { nombre: 'Dr. Alvaro Rendón', cargo: 'Coordinador de Investigaciones', correo: 'arendon@unicauca.edu.co' },
        { nombre: 'Ing. Beatriz Hurtado', cargo: 'Comité de Relación con el Sector Externo', correo: 'bhurtado@unicauca.edu.co' },
      ],
    },
    {
      id: 2, categoria: 'Simposio', titulo: 'Simposio de Telecomunicaciones & Paz Territorial',
      responsable: 'Dra. Martha Gómez', fecha: '2026-10-18', hora: '09:00 AM - 04:00 PM',
      lugar: 'Auditorio Facultad de Ingeniería Electrónica, Popayán', cupos: 80, inscritos: 41, estado: 'En Revisión',
      descripcion: 'Encuentro académico sobre el rol de las telecomunicaciones en la conectividad rural y la construcción de paz en el territorio caucano.',
      agenda: [
        { hora: '09:00 AM', titulo: 'Instalación del Simposio' },
        { hora: '10:30 AM', titulo: 'Conferencia: Conectividad Rural en el Cauca' },
        { hora: '02:00 PM', titulo: 'Mesa de Trabajo con Comunidades' },
      ],
      responsables: [{ nombre: 'Dra. Martha Gómez', cargo: 'Docente Investigadora', correo: 'mgomez@unicauca.edu.co' }],
    },
    {
      id: 3, categoria: 'Feria Empresarial', titulo: 'Encuentro de Graduados y Empleadores',
      responsable: 'Oficina de Graduados', fecha: '2026-10-22', hora: '02:00 PM - 06:00 PM',
      lugar: 'Claustro de Santo Domingo, Popayán', cupos: 200, inscritos: 112, estado: 'Aprobado con Cambios',
      descripcion: 'Espacio de networking entre graduados de la Facultad y empresas aliadas de la región.',
      agenda: [
        { hora: '02:00 PM', titulo: 'Registro y Bienvenida' },
        { hora: '03:00 PM', titulo: 'Speed Networking' },
        { hora: '05:00 PM', titulo: 'Cóctel de Cierre' },
      ],
      responsables: [{ nombre: 'Lic. Sandra Ortega', cargo: 'Oficina de Graduados', correo: 'graduados@unicauca.edu.co' }],
    },
    {
      id: 4, categoria: 'Taller', titulo: 'Taller Práctico de IoT con Redes 5G',
      responsable: 'Ing. Javier Bravo', fecha: '2026-11-02', hora: '08:00 AM - 12:00 PM',
      lugar: 'Laboratorio de Telecomunicaciones, FIET', cupos: 35, inscritos: 28, estado: 'Aprobado',
      descripcion: 'Taller práctico de integración de dispositivos IoT sobre redes móviles de quinta generación.',
      agenda: [
        { hora: '08:00 AM', titulo: 'Fundamentos de 5G para IoT' },
        { hora: '10:00 AM', titulo: 'Práctica de laboratorio' },
      ],
      responsables: [{ nombre: 'Ing. Javier Bravo', cargo: 'Docente de Telecomunicaciones', correo: 'jbravo@unicauca.edu.co' }],
    },
    {
      id: 5, categoria: 'Hackatón', titulo: 'Hackatón FIET: Soluciones de Software Libre',
      responsable: 'Club de Programación', fecha: '2026-11-09', hora: '08:00 AM - 08:00 PM',
      lugar: 'Sala de Sistemas, Edificio FIET', cupos: 150, inscritos: 63, estado: 'En Revisión',
      descripcion: 'Maratón de desarrollo de soluciones tecnológicas basadas en software libre para problemáticas regionales.',
      agenda: [
        { hora: '08:00 AM', titulo: 'Apertura y conformación de equipos' },
        { hora: '08:00 PM', titulo: 'Presentación de soluciones y premiación' },
      ],
      responsables: [{ nombre: 'Club de Programación', cargo: 'Organizador', correo: 'clubprog@unicauca.edu.co' }],
    },
    {
      id: 6, categoria: 'Conferencia', titulo: 'Workshop: Redes Definidas por Software',
      responsable: 'Departamento de Electrónica', fecha: '2026-11-20', hora: '10:00 AM - 01:00 PM',
      lugar: 'Aula Magna FIET', cupos: 50, inscritos: 12, estado: 'Rechazado',
      descripcion: 'Workshop sobre arquitectura y despliegue de redes definidas por software (SDN).',
      agenda: [{ hora: '10:00 AM', titulo: 'Introducción a SDN' }],
      responsables: [{ nombre: 'Dr. Carlos Muñoz', cargo: 'Departamento de Electrónica', correo: 'cmunoz@unicauca.edu.co' }],
    },
  ]);

  readonly inscripciones = signal<Inscripcion[]>([
    { id: 1, eventoId: 1, nombre: 'Juan Carlos Palacios', detalle: 'Estudiante de Ingeniería Sistemas', documento: '1061738221', tipo: 'Expositor', estado: 'Aprobado', correo: 'jpalacios@unicauca.edu.co' },
    { id: 2, eventoId: 1, nombre: 'TechCauca S.A.S', detalle: 'Empresa de Desarrollo de Software', documento: '800.123.456-1', tipo: 'Empresa Aliada', estado: 'En Revisión', correo: 'contacto@techcauca.co' },
    { id: 3, eventoId: 1, nombre: 'Ana Maria Burbano', detalle: 'Ponente Externa - UniValle', documento: '34.521.890', tipo: 'Conferencista', estado: 'Aprobado con Cambios', correo: 'aburbano@univalle.edu.co' },
    { id: 4, eventoId: 1, nombre: 'Esteban Grijalba Ortiz', detalle: 'Estudiante de Electrónica', documento: '1061928373', tipo: 'Expositor', estado: 'En Revisión', correo: 'egrijalba@unicauca.edu.co' },
    { id: 5, eventoId: 1, nombre: 'Ing. Pedro Patiño', detalle: 'Asesor Independiente', documento: '10.543.123', tipo: 'Evaluador', estado: 'Rechazado', correo: 'ppatino@gmail.com' },
    { id: 6, eventoId: 2, nombre: 'Diana Carolina Vivas', detalle: 'Estudiante de Telecomunicaciones', documento: '1061880012', tipo: 'Conferencista', estado: 'En Revisión', correo: 'dvivas@unicauca.edu.co' },
    { id: 7, eventoId: 3, nombre: 'Sistemas & Redes Popayán', detalle: 'Empresa de Servicios TI', documento: '900.456.789-2', tipo: 'Empresa Aliada', estado: 'Rechazado', correo: 'info@sistemasyredes.co' },
  ]);

  readonly certificados = signal<Certificado[]>([
    { id: 1, participante: 'Juan Carlos Palacios', evento: 'Feria de Proyectos de Grado FIET', tipo: 'EXPOSITOR', estado: 'Aprobado', emitido: '2026-10-18' },
    { id: 2, participante: 'Diana Carolina Vivas', evento: 'Simposio de Telecomunicaciones', tipo: 'CONFERENCISTA', estado: 'En Revisión' },
    { id: 3, participante: 'Andrés Felipe Ruiz', evento: 'Feria de Proyectos de Grado FIET', tipo: 'EXPOSITOR', estado: 'Aprobado', emitido: '2026-10-18' },
    { id: 4, participante: 'Laura Mejía Cerón', evento: 'Taller Práctico de IoT con Redes 5G', tipo: 'ASISTENTE', estado: 'Aprobado' },
    { id: 5, participante: 'Sistemas & Redes Popayán', evento: 'Encuentro de Empleadores', tipo: 'EMPRESA ALIADA', estado: 'Rechazado' },
  ]);

  readonly actividad = signal<Actividad[]>([
    { texto: "Nueva empresa inscrita: 'TechCauca Soluciones'", hace: 'Hace 10 min' },
    { texto: "Aprobación de evento: 'Taller IoT y Redes 5G'", hace: 'Hace 1 hora', rojo: true },
    { texto: 'Certificado generado para Est. Carlos Realpe', hace: 'Hace 3 horas' },
    { texto: "Inscripción en revisión: 'Conferencia IA'", hace: 'Hace 5 horas', rojo: true },
  ]);

  readonly stats = computed(() => ({
    eventosActivos: 8,
    programadosSemana: 2,
    inscritos: 342,
    nuevosHoy: 45,
    certificados: 189,
    tasaEntrega: 98,
    empresas: 24,
    empresasNuevas: 6,
  }));

  readonly proximos = computed(() =>
    [...this.eventos()].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 3));

  evento(id: number): Evento | undefined {
    return this.eventos().find(e => e.id === id);
  }

  guardarEvento(e: Omit<Evento, 'id'> & { id?: number }): Evento {
    if (e.id) {
      const actualizado = e as Evento;
      this.eventos.update(l => l.map(x => (x.id === e.id ? actualizado : x)));
      return actualizado;
    }
    const nuevo: Evento = { ...e, id: Math.max(0, ...this.eventos().map(x => x.id)) + 1 };
    this.eventos.update(l => [...l, nuevo]);
    this.registrarActividad(`Nuevo evento creado: '${nuevo.titulo}'`);
    return nuevo;
  }

  cambiarEstadoEvento(id: number, estado: EstadoRevision) {
    this.eventos.update(l => l.map(e => (e.id === id ? { ...e, estado } : e)));
    const ev = this.evento(id);
    if (ev) this.registrarActividad(`${estado === 'Rechazado' ? 'Rechazo' : 'Aprobación'} de evento: '${ev.titulo}'`, true);
  }

  cambiarEstadoInscripcion(id: number, estado: EstadoRevision) {
    this.inscripciones.update(l => l.map(i => (i.id === id ? { ...i, estado } : i)));
  }

  emitirCertificados(ids: number[]): number {
    const hoy = new Date().toISOString().slice(0, 10);
    let n = 0;
    this.certificados.update(l => l.map(c => {
      if (ids.includes(c.id) && c.estado === 'Aprobado' && !c.emitido) { n++; return { ...c, emitido: hoy }; }
      return c;
    }));
    if (n) this.registrarActividad(`${n} certificado(s) emitido(s)`);
    return n;
  }

  marcarEnviado(id: number) {
    this.certificados.update(l => l.map(c => (c.id === id ? { ...c, enviado: true } : c)));
  }

  private registrarActividad(texto: string, rojo = false) {
    this.actividad.update(l => [{ texto, hace: 'Hace un momento', rojo }, ...l].slice(0, 6));
  }
}
