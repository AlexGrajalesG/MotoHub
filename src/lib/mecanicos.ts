import { supabase } from './supabase';

export type Mecanico = {
  id: string;
  usuario_id: string;
  negocio_id: string | null;
  especialidades: string[];
  anios_experiencia: number;
  atiende: string[];
  activo: boolean;
  usuario: { nombre: string | null; telefono: string | null } | null;
};

export async function fetchMecanicosDeNegocio(negocioId: string): Promise<Mecanico[]> {
  const { data, error } = await supabase
    .from('mecanicos')
    .select('id, usuario_id, negocio_id, especialidades, anios_experiencia, atiende, activo, usuario:usuarios(nombre, telefono)')
    .eq('negocio_id', negocioId)
    .is('salio_at', null)
    .order('created_at', { ascending: true });
  if (error) { console.error(error.message); return []; }
  return (data ?? []).map((m: any) => ({ ...m, usuario: m.usuario ?? null })) as Mecanico[];
}

export async function fetchMiMecanico(usuarioId: string): Promise<{ id: string; negocio_id: string; negocio_nombre: string } | null> {
  const { data, error } = await supabase
    .from('mecanicos')
    .select('id, negocio_id, negocio:negocios(nombre)')
    .eq('usuario_id', usuarioId)
    .eq('activo', true)
    .maybeSingle();
  if (error || !data || !data.negocio_id) return null;
  return { id: data.id, negocio_id: data.negocio_id, negocio_nombre: (data as any).negocio?.nombre ?? 'Taller' };
}

export type UsuarioBuscado = {
  id: string;
  nombre: string;
  nombre_usuario: string;
  promedio: number | null;
  total_calificaciones: number;
};

export async function buscarUsuarioPorNombreUsuario(nombreUsuario: string): Promise<UsuarioBuscado | null> {
  // RPC (security definer): una consulta directa a `usuarios` no encuentra a nadie
  // fuera de uno mismo o clientes con una cita previa (RLS), y aqui buscamos gente nueva.
  const { data, error } = await supabase
    .rpc('buscar_usuario_por_nombre_usuario', { p_nombre_usuario: nombreUsuario })
    .maybeSingle();
  if (error || !data) return null;
  const d = data as any;
  return {
    id: d.id, nombre: d.nombre, nombre_usuario: d.nombre_usuario,
    promedio: d.promedio === null ? null : Number(d.promedio),
    total_calificaciones: d.total_calificaciones ?? 0,
  };
}

export async function toggleMecanicoActivo(mecanicoId: string, activo: boolean) {
  return supabase.from('mecanicos').update({ activo }).eq('id', mecanicoId);
}

// No borra la fila: se conserva el historial de citas del mecanico en ese taller.
export async function quitarMecanico(mecanicoId: string) {
  return supabase.from('mecanicos').update({ activo: false, salio_at: new Date().toISOString() }).eq('id', mecanicoId);
}

export async function salirDelEquipo(negocioId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc('salir_del_equipo', { p_negocio_id: negocioId });
  return error ? { ok: false, error: error.message } : { ok: true };
}
