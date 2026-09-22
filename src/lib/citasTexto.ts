// Sin dependencias de red: se puede probar sin inicializar Supabase.

export type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
export type PasoEstado = 'hecho' | 'actual' | 'pendiente';
export type PasoCita = { key: string; label: string; estado: PasoEstado };

const ORDEN: readonly EstadoCita[] = ['pendiente', 'confirmada', 'completada'];
const LABEL: Record<string, string> = { pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Completada' };

/**
 * Pasos de la linea de tiempo de una cita (Uniform Connectedness: se ven conectados,
 * no como insignias sueltas). 'cancelada' es un camino aparte, no un paso mas: se
 * devuelve una lista vacia y quien use esto muestra el estado cancelado por separado.
 */
export function pasosCita(estado: EstadoCita): PasoCita[] {
  if (estado === 'cancelada') return [];
  const idxActual = ORDEN.indexOf(estado);
  if (idxActual === -1) return [];
  // El ultimo paso (completada) es terminal: al llegar ahi todo queda "hecho",
  // no tiene sentido mostrarlo como "en curso" si ya no hay un paso siguiente.
  const esFinal = idxActual === ORDEN.length - 1;
  return ORDEN.map((key, i) => ({
    key,
    label: LABEL[key],
    estado: esFinal || i < idxActual ? 'hecho' : i === idxActual ? 'actual' : 'pendiente',
  }));
}
