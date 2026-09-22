// Sin dependencias de red: se puede probar sin inicializar Supabase.

export type FichaSeguridad = {
  numero_motor: string | null;
  numero_chasis: string | null;
  aseguradora: string | null;
  poliza_numero: string | null;
};

export type VehiculoParaFicha = {
  marca: string; modelo: string; anio: number; placa: string; color: string | null;
};

const SIN_DATO = 'No registrado';

/** Texto listo para una denuncia o para mostrarle a la Policía. Sin filtrar nada: aquí es al revés que en Historial, se quiere compartir todo. */
export function formatFichaParaDenuncia(v: VehiculoParaFicha, f: FichaSeguridad): string {
  const lineas = [
    `Ficha de vehículo — ${v.marca} ${v.modelo} ${v.anio}`,
    `Placa: ${v.placa.toUpperCase()}`,
    v.color ? `Color: ${v.color}` : null,
    `Número de motor: ${f.numero_motor?.trim() || SIN_DATO}`,
    `Número de chasis: ${f.numero_chasis?.trim() || SIN_DATO}`,
    f.aseguradora?.trim() || f.poliza_numero?.trim()
      ? `Seguro: ${f.aseguradora?.trim() || SIN_DATO}${f.poliza_numero?.trim() ? ` · Póliza ${f.poliza_numero.trim()}` : ''}`
      : null,
  ];
  return lineas.filter(Boolean).join('\n');
}

export function fichaCompleta(f: FichaSeguridad): boolean {
  return !!(f.numero_motor?.trim() && f.numero_chasis?.trim());
}
