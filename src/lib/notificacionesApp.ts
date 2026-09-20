import { supabase } from './supabase';

export type TipoNotificacion =
  | 'cita_nueva' | 'cita_estado' | 'registro_servicio_nuevo' | 'registro_servicio_resuelto'
  | 'invitacion_equipo' | 'invitacion_respuesta';

export type Notificacion = {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  cita_id: string | null;
  leida: boolean;
  created_at: string;
};

export async function fetchNotificaciones(usuarioId: string): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error(error.message);
    return [];
  }
  return (data ?? []) as Notificacion[];
}

export async function contarNoLeidas(usuarioId: string): Promise<number> {
  const { count } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
    .eq('leida', false);
  return count ?? 0;
}

export async function marcarLeida(id: string) {
  await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
}

export async function marcarTodasLeidas(usuarioId: string) {
  await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('usuario_id', usuarioId)
    .eq('leida', false);
}
