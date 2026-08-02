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

export async function buscarUsuarioPorTelefono(telefono: string): Promise<{ id: string; nombre: string } | null> {
  // RPC (security definer): una consulta directa a `usuarios` no encuentra a nadie
  // fuera de uno mismo o clientes con una cita previa (RLS), y aqui buscamos gente nueva.
  const { data, error } = await supabase
    .rpc('buscar_usuario_por_telefono', { p_telefono: telefono.trim() })
    .maybeSingle();
  if (error || !data) return null;
  return { id: (data as any).id, nombre: (data as any).nombre };
}

export async function agregarMecanico(usuarioId: string, negocioId: string) {
  return supabase.from('mecanicos').insert({ usuario_id: usuarioId, negocio_id: negocioId });
}

export async function toggleMecanicoActivo(mecanicoId: string, activo: boolean) {
  return supabase.from('mecanicos').update({ activo }).eq('id', mecanicoId);
}

export async function quitarMecanico(mecanicoId: string) {
  return supabase.from('mecanicos').delete().eq('id', mecanicoId);
}
