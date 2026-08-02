export const TIPO_LABEL: Record<string, string> = {
  aceite:           'Cambio de aceite',
  frenos:           'Frenos',
  cadena:           'Cadena',
  llantas:          'Llantas',
  bateria:          'Batería',
  revision_tecnica: 'Rev. Técnica',
  soat:             'SOAT',
  lavado:           'Lavado',
  personalizado:    'Personalizado',
};

export function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

type RegistroCompartible = {
  tipo: string;
  descripcion: string | null;
  fecha: string;
  km_en_servicio: number | null;
  notas: string | null;
  recomendaciones?: string[] | null;
};

/**
 * Texto para compartir el historial sin datos sensibles: nunca incluye
 * taller/negocio_nombre, mecanico_nombre ni costo — solo qué se hizo y notas.
 */
export function formatHistorialCompartible(
  vehiculo: { marca: string; modelo: string; placa?: string },
  registros: RegistroCompartible[]
): string {
  const encabezado = `Historial de mantenimiento — ${vehiculo.marca} ${vehiculo.modelo}` +
    (vehiculo.placa ? ` (${vehiculo.placa.toUpperCase()})` : '');

  const cuerpo = registros.map(r => formatRegistroCompartible(r)).join('\n\n');

  return `${encabezado}\n\n${cuerpo}\n\n— Compartido desde Rodix`;
}

export function formatRegistroCompartible(r: RegistroCompartible): string {
  const titulo = r.tipo === 'personalizado' && r.descripcion
    ? r.descripcion
    : (TIPO_LABEL[r.tipo] ?? r.tipo);

  const lineas = [`📅 ${formatFecha(r.fecha)} — ${titulo}`];
  if (r.km_en_servicio) lineas.push(`   ${r.km_en_servicio.toLocaleString('es-CO')} km`);
  if (r.notas) lineas.push(`   "${r.notas}"`);
  if (r.recomendaciones && r.recomendaciones.length > 0) {
    r.recomendaciones.forEach(rec => lineas.push(`   → ${rec}`));
  }
  return lineas.join('\n');
}
