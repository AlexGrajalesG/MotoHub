import { tokens } from './tokens';

const { colors } = tokens;

const DIAS_PROXIMO = 30;

export type DocEstado = 'al_dia' | 'proximo' | 'vencido';

export type DocStatus = {
  estado: DocEstado;
  label: string;
  color: string;
  diasRestantes: number;
};

/**
 * Calcula el estado de vencimiento de un documento (SOAT, Tecnomecánica).
 * Retorna null si no hay fecha de vencimiento capturada.
 */
export function getDocStatus(fechaVencimiento: string | null | undefined): DocStatus | null {
  if (!fechaVencimiento) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  // new Date('YYYY-MM-DD') parsea como medianoche UTC; construir con
  // componentes locales evita que se corra un dia en timezones detras de UTC
  // (Colombia -5), que era exactamente el caso de toda la base de usuarios.
  const [y, m, d] = fechaVencimiento.split('-').map(Number);
  const venc = new Date(y, m - 1, d);
  venc.setHours(0, 0, 0, 0);

  const diasRestantes = Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    return { estado: 'vencido', label: 'Vencido', color: colors.danger, diasRestantes };
  }
  if (diasRestantes <= DIAS_PROXIMO) {
    return { estado: 'proximo', label: 'Próximo', color: colors.accentSoft, diasRestantes };
  }
  return { estado: 'al_dia', label: 'Al día', color: colors.success, diasRestantes };
}

export function formatFechaCorta(fecha: string): string {
  // Mismo cuidado que en getDocStatus: parsear con componentes locales para
  // no mostrar un dia antes en timezones detras de UTC (Colombia -5).
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}
