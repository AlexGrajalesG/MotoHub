import { supabase } from './supabase';
import { mensajeErrorAuth } from './errores';

export const FORMATO_USUARIO = /^[a-z0-9_]{3,20}$/;
export const DIAS_DE_GRACIA = 30;

type Resultado<T = void> = { ok: true; valor: T } | { ok: false; mensaje: string };

export async function cambiarContrasena(nueva: string): Promise<Resultado> {
  const { error } = await supabase.auth.updateUser({ password: nueva });
  return error ? { ok: false, mensaje: mensajeErrorAuth(error).mensaje } : { ok: true, valor: undefined };
}

/** Cierra la sesion en este y en todos los demas dispositivos. */
export async function cerrarSesionEnTodos(): Promise<Resultado> {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  return error ? { ok: false, mensaje: mensajeErrorAuth(error).mensaje } : { ok: true, valor: undefined };
}

/** Devuelve la fecha en que se borrara la cuenta (hoy + 30 dias). */
export async function solicitarEliminacion(): Promise<Resultado<Date>> {
  const { data, error } = await supabase.rpc('solicitar_eliminacion_cuenta');
  if (error || !data) return { ok: false, mensaje: mensajeErrorAuth(error).mensaje };
  return { ok: true, valor: new Date(data as string) };
}

export async function cancelarEliminacion(): Promise<Resultado> {
  const { error } = await supabase.rpc('cancelar_eliminacion_cuenta');
  return error ? { ok: false, mensaje: mensajeErrorAuth(error).mensaje } : { ok: true, valor: undefined };
}

/** Fecha de borrado si la cuenta tiene una eliminacion pendiente; null si no. */
export async function fechaDeBorrado(userId: string): Promise<Date | null> {
  const { data } = await supabase.from('usuarios').select('eliminacion_solicitada_at').eq('id', userId).maybeSingle();
  const solicitada = (data as { eliminacion_solicitada_at: string | null } | null)?.eliminacion_solicitada_at;
  if (!solicitada) return null;
  const d = new Date(solicitada);
  d.setDate(d.getDate() + DIAS_DE_GRACIA);
  return d;
}

/** Todos mis datos como texto JSON legible (derecho de acceso). */
export async function exportarMisDatos(): Promise<Resultado<string>> {
  const { data, error } = await supabase.rpc('exportar_mis_datos');
  if (error || !data) return { ok: false, mensaje: mensajeErrorAuth(error).mensaje };
  return { ok: true, valor: JSON.stringify(data, null, 2) };
}

export async function usuarioDisponible(nuevo: string): Promise<boolean | null> {
  const { data, error } = await supabase.rpc('nombre_usuario_disponible', { p_nombre_usuario: nuevo });
  return error ? null : (data as boolean);
}

export function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}
