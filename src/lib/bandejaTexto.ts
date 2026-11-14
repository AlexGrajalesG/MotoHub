export type ComoBandeja = 'cliente' | 'negocio';

export type ConversacionBandeja = {
  cita_id: string;
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  contraparte_nombre: string | null;
  vehiculo_texto: string | null;
  ultimo_texto: string | null;
  ultimo_tipo: string | null;
  ultimo_tiene_adjuntos: boolean;
  ultimo_at: string | null;
  ultimo_autor_id: string | null;
  no_leido: boolean;
  orden_at: string;
};

export type PestanaBandeja = 'activas' | 'cerradas';

/** Qué lado de la cita ve el usuario según el modo en que está usando la app. */
export function comoSegunModo(modo: 'cliente' | 'taller' | 'mecanico'): ComoBandeja {
  return modo === 'cliente' ? 'cliente' : 'negocio';
}

export function esConversacionCerrada(c: Pick<ConversacionBandeja, 'estado'>): boolean {
  return c.estado === 'completada' || c.estado === 'cancelada';
}

/** Separa en activas y cerradas, conservando el orden recibido (más reciente primero). */
export function repartirConversaciones(lista: ConversacionBandeja[]): Record<PestanaBandeja, ConversacionBandeja[]> {
  const activas: ConversacionBandeja[] = [];
  const cerradas: ConversacionBandeja[] = [];
  for (const c of lista) (esConversacionCerrada(c) ? cerradas : activas).push(c);
  return { activas, cerradas };
}

export function contarNoLeidas(lista: ConversacionBandeja[]): number {
  return lista.filter(c => c.no_leido).length;
}

/** Línea de vista previa del último mensaje. */
export function vistaPreviaUltimo(c: ConversacionBandeja, miUsuarioId: string | undefined): string {
  if (c.ultimo_tipo === 'registro_servicio') return 'Se registró un servicio';
  if (c.ultimo_tipo === 'sistema') return c.ultimo_texto?.trim() || 'Aviso del sistema';

  const base = c.ultimo_texto?.trim() || (c.ultimo_tiene_adjuntos ? 'Archivo adjunto' : '');
  if (!base) return c.ultimo_at ? 'Mensaje' : 'Aún no hay mensajes';
  return c.ultimo_autor_id && c.ultimo_autor_id === miUsuarioId ? `Tú: ${base}` : base;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "14:05" si es de hoy, "Ayer", "12 nov" este año, "12 nov 2025" antes. */
export function etiquetaFecha(iso: string | null, ahora: Date = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (mismoDia(d, ahora)) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  if (mismoDia(d, ayer)) return 'Ayer';
  const base = `${d.getDate()} ${MESES[d.getMonth()]}`;
  return d.getFullYear() === ahora.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function inicialDe(nombre: string | null | undefined): string {
  const t = (nombre ?? '').trim();
  return t ? t[0].toUpperCase() : '?';
}

export function textoVacioBandeja(pestana: PestanaBandeja, como: ComoBandeja): string {
  if (pestana === 'cerradas') return 'Aquí quedan las conversaciones de servicios finalizados o cancelados.';
  return como === 'cliente'
    ? 'Cuando pidas una cita, la conversación con el negocio aparece aquí.'
    : 'Cuando un cliente pida una cita, la conversación aparece aquí.';
}
