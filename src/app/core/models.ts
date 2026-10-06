export type EstadoRevision = 'Aprobado' | 'En Revisión' | 'Aprobado con Cambios' | 'Rechazado';

export const ESTADOS: EstadoRevision[] = ['Aprobado', 'En Revisión', 'Aprobado con Cambios', 'Rechazado'];

export const CATEGORIAS = ['Feria Académica', 'Taller', 'Simposio', 'Hackatón', 'Feria Empresarial', 'Conferencia'];

export interface AgendaItem { hora: string; titulo: string; }
export interface Responsable { nombre: string; cargo: string; correo: string; }

export interface Evento {
  id: number;
  categoria: string;
  titulo: string;
  responsable: string;
  fecha: string; // ISO yyyy-mm-dd
  hora: string;
  lugar: string;
  cupos: number;
  inscritos: number;
  estado: EstadoRevision;
  descripcion: string;
  agenda: AgendaItem[];
  responsables: Responsable[];
}

export type TipoParticipante = 'Expositor' | 'Empresa Aliada' | 'Conferencista' | 'Evaluador' | 'Asistente';

export interface Inscripcion {
  id: number;
  eventoId: number;
  nombre: string;
  detalle: string;
  documento: string;
  tipo: TipoParticipante;
  estado: EstadoRevision;
  correo: string;
}

export interface Certificado {
  id: number;
  participante: string;
  evento: string;
  tipo: string;
  estado: EstadoRevision;
  emitido?: string; // ISO date
  enviado?: boolean;
}

export interface Actividad { texto: string; hace: string; rojo?: boolean; }

export interface Usuario { nombre: string; correo: string; iniciales: string; }
