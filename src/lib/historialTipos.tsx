import {
  IconDroplet, IconCircleDot, IconLink, IconWheel, IconBattery, IconClipboardCheck,
  IconShieldCheck, IconSparkles, IconTool,
} from '@tabler/icons-react-native';

export type TipoServicio = {
  key: string;
  label: string;
  /** Nombre corto para tarjetas pequeñas. */
  corto: string;
  color: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  /** Cuándo toca repetirlo; solo para ofrecer el recordatorio. */
  intervalo?: { tipo: 'km' | 'dias'; valor: number; etiqueta: string };
};

export const TIPOS_SERVICIO: TipoServicio[] = [
  { key: 'aceite', label: 'Cambio de aceite', corto: 'Aceite', color: '#48975a', Icon: IconDroplet, intervalo: { tipo: 'km', valor: 2500, etiqueta: 'cambio de aceite' } },
  { key: 'frenos', label: 'Frenos', corto: 'Frenos', color: '#e05555', Icon: IconCircleDot, intervalo: { tipo: 'km', valor: 10000, etiqueta: 'revisión de frenos' } },
  { key: 'cadena', label: 'Cadena', corto: 'Cadena', color: '#d48b24', Icon: IconLink, intervalo: { tipo: 'km', valor: 2000, etiqueta: 'servicio de cadena' } },
  { key: 'llantas', label: 'Llantas', corto: 'Llantas', color: '#5b8dd9', Icon: IconWheel, intervalo: { tipo: 'km', valor: 20000, etiqueta: 'cambio de llantas' } },
  { key: 'bateria', label: 'Batería', corto: 'Batería', color: '#59a45c', Icon: IconBattery, intervalo: { tipo: 'dias', valor: 365, etiqueta: 'revisión de batería' } },
  { key: 'revision_tecnica', label: 'Revisión técnico-mecánica', corto: 'Tecno', color: '#9b6de0', Icon: IconClipboardCheck, intervalo: { tipo: 'dias', valor: 365, etiqueta: 'revisión técnico-mecánica' } },
  { key: 'soat', label: 'SOAT', corto: 'SOAT', color: '#3badd4', Icon: IconShieldCheck, intervalo: { tipo: 'dias', valor: 365, etiqueta: 'renovación del SOAT' } },
  { key: 'lavado', label: 'Lavado', corto: 'Lavado', color: '#4fb8b0', Icon: IconSparkles },
  { key: 'personalizado', label: 'Otro servicio', corto: 'Otro', color: '#8a8f8d', Icon: IconTool },
];

const POR_CLAVE = new Map(TIPOS_SERVICIO.map(t => [t.key, t]));

export function metaTipo(key: string): TipoServicio {
  return POR_CLAVE.get(key) ?? TIPOS_SERVICIO[TIPOS_SERVICIO.length - 1];
}

/** Título del registro: para "Otro servicio" manda la descripción que escribió la persona. */
export function tituloRegistro(r: { tipo: string; descripcion: string | null }): string {
  if (r.tipo === 'personalizado' && r.descripcion) return r.descripcion;
  return metaTipo(r.tipo).label;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function partes(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

/** "23 sep 2026". */
export function fechaCorta(iso: string): string {
  const [y, m, d] = partes(iso);
  return `${d} ${MESES[m - 1]} ${y}`;
}

/** "23 de septiembre de 2026". */
export function fechaLarga(iso: string): string {
  const [y, m, d] = partes(iso);
  return `${d} de ${MESES_LARGOS[m - 1]} de ${y}`;
}

/** "Septiembre 2026", para agrupar la lista. */
export function mesAnio(iso: string): string {
  const [y, m] = partes(iso);
  const nombre = MESES_LARGOS[m - 1];
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${y}`;
}

export function fechaAISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function isoAFecha(iso: string): Date {
  const [y, m, d] = partes(iso);
  return new Date(y, m - 1, d);
}

/** "hace 12 días" respecto a hoy, para la fecha de un servicio. */
export function haceDias(iso: string): string {
  const dias = Math.floor((Date.now() - isoAFecha(iso).getTime()) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  const años = Math.floor(meses / 12);
  return `hace ${años} ${años === 1 ? 'año' : 'años'}`;
}

/** "12500" -> "12.500", para campos de dinero y kilometraje mientras se escribe. */
export function conMiles(texto: string): string {
  const digitos = texto.replace(/\D/g, '');
  return digitos ? Number(digitos).toLocaleString('es-CO') : '';
}

export function soloDigitos(texto: string): number | null {
  const d = texto.replace(/\D/g, '');
  return d ? Number(d) : null;
}
