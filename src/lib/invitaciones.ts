import { supabase } from './supabase';

export type InvitacionRecibida = {
  id: string;
  negocio_id: string;
  negocio_nombre: string;
  created_at: string;
};

export type InvitacionEnviada = {
  id: string;
  usuario_id: string;
  nombre: string | null;
  nombre_usuario: string | null;
  created_at: string;
};

type Resultado = { ok: true } | { ok: false; error: string };

export async function invitarMecanico(negocioId: string, usuarioId: string): Promise<Resultado> {
  const { error } = await supabase.rpc('invitar_mecanico', { p_negocio_id: negocioId, p_usuario_id: usuarioId });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function responderInvitacion(invitacionId: string, aceptar: boolean): Promise<Resultado> {
  const { error } = await supabase.rpc('responder_invitacion_equipo', { p_invitacion_id: invitacionId, p_aceptar: aceptar });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function cancelarInvitacion(invitacionId: string): Promise<Resultado> {
  const { error } = await supabase.rpc('cancelar_invitacion_equipo', { p_invitacion_id: invitacionId });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function fetchInvitacionesRecibidas(usuarioId: string): Promise<InvitacionRecibida[]> {
  const { data, error } = await supabase
    .from('invitaciones_equipo')
    .select('id, negocio_id, created_at, negocio:negocios(nombre)')
    .eq('usuario_id', usuarioId)
    .eq('estado', 'pendiente')
    .gt('expira_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) { console.error(error.message); return []; }
  return (data ?? []).map((i: any) => ({
    id: i.id,
    negocio_id: i.negocio_id,
    negocio_nombre: i.negocio?.nombre ?? 'Un taller',
    created_at: i.created_at,
  }));
}

export async function contarInvitacionesRecibidas(usuarioId: string): Promise<number> {
  const { count } = await supabase
    .from('invitaciones_equipo')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
    .eq('estado', 'pendiente')
    .gt('expira_at', new Date().toISOString());
  return count ?? 0;
}

export async function fetchInvitacionesEnviadas(negocioId: string): Promise<InvitacionEnviada[]> {
  const { data, error } = await supabase.rpc('listar_invitaciones_negocio', { p_negocio_id: negocioId });
  if (error) { console.error(error.message); return []; }
  return (data ?? []) as InvitacionEnviada[];
}
