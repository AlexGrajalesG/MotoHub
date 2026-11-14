import { Alert } from 'react-native';
import { supabase } from './supabase';
import { clasificarErrorCierre, type FaltaCierre, type ResumenCierre } from './cierreCitaTexto';

export type ResultadoFinalizar = { ok: true } | { ok: false; falta: FaltaCierre; mensaje: string };

/** Pasa la cita a completada; la base exige el kilometraje y arma el resumen del cierre. */
export async function finalizarCita(citaId: string): Promise<ResultadoFinalizar> {
  const { error } = await supabase.from('citas').update({ estado: 'completada' }).eq('id', citaId);
  if (!error) return { ok: true };
  return { ok: false, ...clasificarErrorCierre(error.message) };
}

type Navegacion = { navigate: (pantalla: string, params: object) => void };

/**
 * Intenta finalizar. Si falta el kilometraje, lleva a registrar el servicio (que finaliza al guardarse).
 * Devuelve true solo si la cita quedó completada.
 */
export async function finalizarOPedirKm(opciones: {
  citaId: string;
  creadoPor: 'negocio' | 'mecanico';
  navigation: Navegacion;
}): Promise<boolean> {
  const { citaId, creadoPor, navigation } = opciones;
  const resultado = await finalizarCita(citaId);
  if (resultado.ok) return true;

  if (resultado.falta !== 'km') {
    Alert.alert('No se pudo finalizar', resultado.mensaje);
    return false;
  }

  const { data } = await supabase.from('citas').select('vehiculo_id').eq('id', citaId).maybeSingle();
  if (!data?.vehiculo_id) {
    Alert.alert(
      'Falta el vehículo',
      'Esta cita no tiene un vehículo asignado, así que no se puede registrar el kilometraje. Cancela la orden y créala con un vehículo.'
    );
    return false;
  }

  Alert.alert(
    'Falta el kilometraje',
    'Para finalizar, registra el servicio con el kilometraje del tablero.',
    [
      { text: 'Ahora no', style: 'cancel' },
      {
        text: 'Registrar servicio',
        onPress: () => navigation.navigate('RegistrarServicio', {
          citaId, vehiculoId: data.vehiculo_id, creadoPor, finalizar: true,
        }),
      },
    ]
  );
  return false;
}

export type CierreCita = { estado: string; resumen_cierre: ResumenCierre | null; cerrada_at: string | null };

/** Resumen guardado al cerrar la cita; null si la cita sigue abierta o es anterior al cierre con resumen. */
export async function fetchCierreCita(citaId: string): Promise<CierreCita | null> {
  const { data, error } = await supabase
    .from('citas')
    .select('estado, resumen_cierre, cerrada_at')
    .eq('id', citaId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as CierreCita;
}
