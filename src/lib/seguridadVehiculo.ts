import { supabase } from './supabase';
import { mensajeError } from './errores';
import {
  formatFichaParaDenuncia, fichaCompleta, type FichaSeguridad, type VehiculoParaFicha,
} from './seguridadVehiculoTexto';

export { formatFichaParaDenuncia, fichaCompleta };
export type { FichaSeguridad, VehiculoParaFicha };

// motor/chasis/poliza son mas sensibles que placa o kilometraje: se leen y guardan por RPC,
// no por select/update directo, para que un mecanico o taller con una cita no pueda pedirlas
// (la RLS por fila no basta aqui, ver Decisiones Tecnicas 2026-09-22).

export async function fetchFichaSeguridad(vehiculoId: string): Promise<FichaSeguridad | null> {
  const { data, error } = await supabase.rpc('fn_ficha_seguridad_vehiculo', { p_vehiculo_id: vehiculoId }).maybeSingle();
  if (error || !data) return null;
  return data as FichaSeguridad;
}

export async function guardarFichaSeguridad(vehiculoId: string, ficha: FichaSeguridad): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { error } = await supabase.rpc('actualizar_ficha_seguridad_vehiculo', {
    p_vehiculo_id: vehiculoId,
    p_numero_motor: ficha.numero_motor,
    p_numero_chasis: ficha.numero_chasis,
    p_aseguradora: ficha.aseguradora,
    p_poliza_numero: ficha.poliza_numero,
  });
  return error ? { ok: false, mensaje: mensajeError(error) } : { ok: true };
}
