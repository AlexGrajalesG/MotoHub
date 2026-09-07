import { supabase } from './supabase';

export async function marcarCitaLeida(citaId: string, usuarioId: string) {
  await supabase
    .from('cita_lecturas')
    .upsert({ cita_id: citaId, usuario_id: usuarioId, leido_at: new Date().toISOString() }, { onConflict: 'cita_id,usuario_id' });
}

export async function fetchCitasNoLeidas(citaIds: string[], usuarioId: string): Promise<Set<string>> {
  if (citaIds.length === 0) return new Set();

  const [{ data: mensajes }, { data: lecturas }] = await Promise.all([
    supabase
      .from('mensajes_cita')
      .select('cita_id, autor_id, created_at')
      .in('cita_id', citaIds)
      .neq('autor_id', usuarioId)
      .order('created_at', { ascending: false }),
    supabase
      .from('cita_lecturas')
      .select('cita_id, leido_at')
      .eq('usuario_id', usuarioId)
      .in('cita_id', citaIds),
  ]);

  const ultimoMensajePorCita = new Map<string, string>();
  (mensajes ?? []).forEach((m: any) => {
    if (!ultimoMensajePorCita.has(m.cita_id)) ultimoMensajePorCita.set(m.cita_id, m.created_at);
  });

  const leidoAtPorCita = new Map<string, string>();
  (lecturas ?? []).forEach((l: any) => leidoAtPorCita.set(l.cita_id, l.leido_at));

  const noLeidas = new Set<string>();
  ultimoMensajePorCita.forEach((ultimoMensaje, citaId) => {
    const leidoAt = leidoAtPorCita.get(citaId);
    if (!leidoAt || new Date(ultimoMensaje) > new Date(leidoAt)) noLeidas.add(citaId);
  });
  return noLeidas;
}
