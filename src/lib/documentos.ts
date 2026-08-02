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
  const venc = new Date(fechaVencimiento);
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
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}
