import { supabase } from './supabase';
import {
  mensajeErrorChat, normalizarUsuario, usuarioBuscable,
  type ComoBandeja, type ConversacionBandeja, type EstadoConversacion, type Relacion,
  type RolConversacion, type TipoConversacion,
} from './conversacionesTexto';

export type Resultado<T> = { ok: true; data: T } | { ok: false; mensaje: string };

export type CuentaEncontrada = { id: string; nombre: string; nombre_usuario: string; foto_url: string | null };

export type Conversacion = {
  id: string;
  tipo: TipoConversacion;
  estado: EstadoConversacion;
  iniciada_por: string;
  negocio_id: string | null;
};

export type ParticipanteConversacion = {
  usuario_id: string;
  nombre: string;
  nombre_usuario: string | null;
  foto_url: string | null;
  rol: RolConversacion;
};

export type MensajeConversacion = {
  id: string;
  conversacion_id: string;
  autor_id: string;
  texto: string;
  eliminado_at: string | null;
  created_at: string;
};

type ErrorSupabase = { message?: string } | null;

function fallo(error: ErrorSupabase): { ok: false; mensaje: string } {
  if (error?.message) console.error(error.message);
  return { ok: false, mensaje: mensajeErrorChat(error?.message) };
}

async function llamar<T>(rpc: string, args: Record<string, unknown>, vacio: T): Promise<Resultado<T>> {
  const { data, error } = await supabase.rpc(rpc, args);
  if (error) return fallo(error);
  return { ok: true, data: (data ?? vacio) as T };
}

// ─── Buscar y relacionarse ──────────────────────────────────────────────────

export async function buscarCuenta(entrada: string): Promise<Resultado<CuentaEncontrada | null>> {
  if (!usuarioBuscable(entrada)) return { ok: true, data: null };
  const { data, error } = await supabase.rpc('buscar_cuenta', { p_nombre_usuario: normalizarUsuario(entrada) });
  if (error) return fallo(error);
  const fila = ((data ?? []) as CuentaEncontrada[])[0];
  return { ok: true, data: fila ?? null };
}

export async function fetchRelacion(otroId: string): Promise<Resultado<Relacion>> {
  const { data, error } = await supabase.rpc('estado_relacion', { p_otro: otroId });
  if (error) return fallo(error);
  const fila = ((data ?? []) as Relacion[])[0];
  return { ok: true, data: fila ?? {
    yo_sigo: false, me_sigue: false, amigos: false, yo_bloquee: false, conversacion_id: null, conversacion_estado: null,
  } };
}

export const seguirUsuario = (id: string) => llamar<null>('seguir_usuario', { p_usuario_id: id }, null);
export const dejarDeSeguir = (id: string) => llamar<null>('dejar_de_seguir', { p_usuario_id: id }, null);

// ─── Iniciar conversaciones ─────────────────────────────────────────────────

export const iniciarChatDirecto = (otroId: string) => llamar<string>('iniciar_chat_directo', { p_otro: otroId }, '');
export const iniciarConsultaNegocio = (negocioId: string) => llamar<string>('iniciar_consulta_negocio', { p_negocio_id: negocioId }, '');

// ─── Dentro de una conversación ─────────────────────────────────────────────

export async function fetchConversacion(id: string): Promise<Conversacion | null> {
  const { data, error } = await supabase
    .from('conversaciones')
    .select('id, tipo, estado, iniciada_por, negocio_id')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error(error.message);
    return null;
  }
  return (data as Conversacion | null) ?? null;
}

export async function fetchMensajesConversacion(id: string): Promise<MensajeConversacion[]> {
  const { data, error } = await supabase
    .from('mensajes_conversacion')
    .select('id, conversacion_id, autor_id, texto, eliminado_at, created_at')
    .eq('conversacion_id', id)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) {
    console.error(error.message);
    return [];
  }
  return (data ?? []) as MensajeConversacion[];
}

export async function fetchParticipantes(id: string): Promise<ParticipanteConversacion[]> {
  const { data, error } = await supabase.rpc('participantes_conversacion', { p_conversacion: id });
  if (error) {
    console.error(error.message);
    return [];
  }
  return (data ?? []) as ParticipanteConversacion[];
}

export const enviarMensajeConversacion = (id: string, texto: string) =>
  llamar<string>('enviar_mensaje_conversacion', { p_conversacion: id, p_texto: texto }, '');

export const responderSolicitud = (id: string, aceptar: boolean) =>
  llamar<null>('responder_solicitud', { p_conversacion: id, p_aceptar: aceptar }, null);

export async function marcarConversacionLeida(id: string): Promise<void> {
  const { error } = await supabase.rpc('marcar_conversacion_leida', { p_conversacion: id });
  if (error) console.error(error.message);
}

export const reportarMensaje = (mensajeId: string, motivo: string) =>
  llamar<null>('reportar_mensaje', { p_mensaje_id: mensajeId, p_motivo: motivo }, null);

export const agregarMecanicoAConsulta = (conversacionId: string, usuarioId: string) =>
  llamar<null>('agregar_mecanico_a_consulta', { p_conversacion: conversacionId, p_usuario_id: usuarioId }, null);

// ─── Moderación de mensajes reportados ──────────────────────────────────────

export type MensajeReportado = {
  mensaje_id: string;
  texto: string;
  autor_nombre: string | null;
  autor_usuario: string | null;
  tipo_conversacion: TipoConversacion;
  created_at: string;
  total_reportes: number;
  motivos: string[];
};

/** Solo devuelve los mensajes reportados, nunca la conversación completa. */
export async function fetchColaChat(): Promise<MensajeReportado[]> {
  const { data, error } = await supabase.rpc('cola_moderacion_chat');
  if (error) {
    console.error(error.message);
    return [];
  }
  return (data ?? []) as MensajeReportado[];
}

export const moderarMensaje = (mensajeId: string, accion: 'descartar' | 'eliminar') =>
  llamar<null>('moderar_mensaje', { p_mensaje_id: mensajeId, p_accion: accion }, null);

// ─── Bandeja ────────────────────────────────────────────────────────────────

export async function fetchBandejaChats(como: ComoBandeja): Promise<ConversacionBandeja[]> {
  const { data, error } = await supabase.rpc('bandeja_conversaciones', { p_como: como });
  if (error) {
    console.error(error.message);
    return [];
  }
  return (data ?? []) as ConversacionBandeja[];
}
