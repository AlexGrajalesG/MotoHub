export type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada';

export type AnexoResumen = { url: string; tipo: string };

export type ResumenCierre = {
  estado: 'completada' | 'cancelada';
  fecha_servicio: string | null;
  fecha_cita: string | null;
  hora_cita: string | null;
  negocio: string | null;
  mecanico: string | null;
  vehiculo: { marca: string; modelo: string; placa: string | null } | null;
  km: number | null;
  costo: number | null;
  precio_acordado: number | null;
  tipo_servicio: string | null;
  descripcion: string | null;
  notas_servicio: string | null;
  notas_negocio: string | null;
  total_mensajes: number;
  anexos: AnexoResumen[];
};

export function citaCerrada(estado: string | null | undefined): boolean {
  return estado === 'completada' || estado === 'cancelada';
}

/** Valida el kilometraje del servicio; devuelve el error o undefined si es válido. */
export function validarKm(km: number | null, kmActual: number | null, esServicioDeHoy: boolean): string | undefined {
  if (!km || km <= 0) return 'El kilometraje es obligatorio';
  if (esServicioDeHoy && kmActual && km < kmActual) {
    return `No puede ser menor al último registrado (${kmActual.toLocaleString('es-CO')} km)`;
  }
  return undefined;
}

export type FaltaCierre = 'km' | 'cerrada' | 'otro';

/** Traduce el error de la base al motivo por el que no se pudo finalizar. */
export function clasificarErrorCierre(mensaje: string): { falta: FaltaCierre; mensaje: string } {
  if (mensaje.includes('KM_OBLIGATORIO')) {
    return { falta: 'km', mensaje: 'Falta registrar el servicio con su kilometraje.' };
  }
  if (mensaje.includes('CITA_CERRADA')) {
    return { falta: 'cerrada', mensaje: 'Esta cita ya está cerrada y no se puede modificar.' };
  }
  return { falta: 'otro', mensaje: 'No se pudo finalizar. Intenta de nuevo.' };
}

export function tituloCierre(estado: 'completada' | 'cancelada'): string {
  return estado === 'completada' ? 'Servicio finalizado' : 'Cita cancelada';
}

export function avisoChatCerrado(estado: 'completada' | 'cancelada'): string {
  return estado === 'completada'
    ? 'Este chat quedó cerrado. Abajo está el resumen del servicio.'
    : 'Esta cita fue cancelada, por eso el chat quedó cerrado.';
}

/** Anexos del resumen sin URLs repetidas, separados por tipo. */
export function separarAnexos(anexos: AnexoResumen[] | null | undefined): { fotos: string[]; documentos: AnexoResumen[] } {
  const vistos = new Set<string>();
  const fotos: string[] = [];
  const documentos: AnexoResumen[] = [];
  for (const a of anexos ?? []) {
    if (!a?.url || vistos.has(a.url)) continue;
    vistos.add(a.url);
    if (a.tipo === 'foto') fotos.push(a.url);
    else documentos.push(a);
  }
  return { fotos, documentos };
}
