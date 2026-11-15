import type { ComoBandeja } from './bandejaTexto';

/** Lógica pura de los chats fuera de las citas (directo y consulta a un negocio). Sin React ni Supabase. */

export type { ComoBandeja };
export type TipoConversacion = 'directa' | 'consulta_negocio';
export type EstadoConversacion = 'solicitud' | 'activa' | 'rechazada';
export type RolConversacion = 'par' | 'cliente' | 'negocio' | 'mecanico';

export type ConversacionBandeja = {
  conversacion_id: string;
  tipo: TipoConversacion;
  estado: EstadoConversacion;
  contraparte_nombre: string | null;
  contraparte_usuario: string | null;
  ultimo_texto: string | null;
  ultimo_at: string | null;
  ultimo_autor_id: string | null;
  no_leido: boolean;
  solicitud_recibida: boolean;
  orden_at: string;
};

export type Relacion = {
  yo_sigo: boolean;
  me_sigue: boolean;
  amigos: boolean;
  yo_bloquee: boolean;
  conversacion_id: string | null;
  conversacion_estado: EstadoConversacion | null;
};

/** Qué se le muestra a la persona en la parte de abajo del chat. */
export type EstadoComposer = 'escribir' | 'esperando_respuesta' | 'responder_solicitud' | 'rechazada';

export function estadoComposer(p: {
  tipo: TipoConversacion;
  estado: EstadoConversacion;
  iniciadaPorMi: boolean;
  yaEnvieMensaje: boolean;
}): EstadoComposer {
  if (p.tipo !== 'directa' || p.estado === 'activa') return 'escribir';
  if (p.estado === 'solicitud') {
    if (!p.iniciadaPorMi) return 'responder_solicitud';
    return p.yaEnvieMensaje ? 'esperando_respuesta' : 'escribir';
  }
  // rechazada: quien la inició ya no puede escribir; quien la rechazó puede retomarla
  return p.iniciadaPorMi ? 'rechazada' : 'escribir';
}

/** Aviso sobre el campo de texto cuando todavía es una solicitud y falta el primer mensaje. */
export function avisoPrimerMensaje(p: { tipo: TipoConversacion; estado: EstadoConversacion; iniciadaPorMi: boolean; yaEnvieMensaje: boolean }): string | null {
  if (p.tipo === 'directa' && p.estado === 'solicitud' && p.iniciadaPorMi && !p.yaEnvieMensaje) {
    return 'Todavía no se siguen. Puedes enviar un solo mensaje y podrás seguir escribiendo cuando acepte tu solicitud.';
  }
  return null;
}

export function textoEsperandoRespuesta(nombre: string): string {
  return `Esperando a que ${nombre} acepte tu solicitud. Mientras tanto no puedes enviar más mensajes.`;
}

export function textoSolicitudRecibida(nombre: string): string {
  return `${nombre} quiere escribirte. Si aceptas, podrán conversar. Si rechazas, no podrá enviarte más mensajes.`;
}

export const TEXTO_RECHAZADA = 'Esta persona no aceptó tu solicitud, por eso no puedes enviar más mensajes.';

export const LARGO_MAXIMO_MENSAJE = 2000;

/** Traduce el error de la base a un mensaje claro y con una salida. */
export function mensajeErrorChat(crudo: string | null | undefined): string {
  const t = crudo ?? '';
  if (t.includes('SOLICITUD_PENDIENTE')) return 'Ya enviaste tu mensaje. Podrás seguir escribiendo cuando acepte tu solicitud.';
  if (t.includes('SOLICITUD_RECHAZADA')) return TEXTO_RECHAZADA;
  if (t.includes('BLOQUEADO')) return 'No puedes enviar mensajes en esta conversación.';
  if (t.includes('LIMITE_DIARIO')) return 'Llegaste al límite de conversaciones nuevas por hoy. Intenta de nuevo mañana.';
  if (t.includes('MENSAJE_INVALIDO')) return `Escribe un mensaje de entre 1 y ${LARGO_MAXIMO_MENSAJE} caracteres.`;
  if (t.includes('No puedes escribirle')) return 'No puedes escribirle a esta cuenta.';
  if (t.includes('No puedes consultar tu propio negocio')) return 'Este es tu propio negocio, no puedes enviarte una consulta.';
  if (t.includes('Negocio no disponible')) return 'Este negocio ya no está disponible.';
  if (t.includes('Cuenta no disponible')) return 'Esta cuenta no está disponible.';
  if (t.includes('Ya reportaste')) return 'Ya reportaste este mensaje. Lo revisaremos.';
  if (t.includes('No puedes reportar tu propio')) return 'No puedes reportar tus propios mensajes.';
  if (t.includes('mecanico activo')) return 'Esa persona no es mecánico activo de tu equipo.';
  if (t.includes('No autorizado')) return 'No tienes permiso para hacer esto.';
  return 'No se pudo completar la acción. Revisa tu conexión e intenta de nuevo.';
}

/** Limpia lo que escribe la persona al buscar: sin @, sin espacios, en minúsculas. */
export function normalizarUsuario(entrada: string): string {
  return entrada.trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
}

export const LARGO_MINIMO_USUARIO = 3;

export function usuarioBuscable(entrada: string): boolean {
  return normalizarUsuario(entrada).length >= LARGO_MINIMO_USUARIO;
}

export function etiquetaRelacion(r: Pick<Relacion, 'yo_sigo' | 'me_sigue' | 'amigos'>): string | null {
  if (r.amigos) return 'Amigos';
  if (r.me_sigue) return 'Te sigue';
  if (r.yo_sigo) return 'Siguiendo';
  return null;
}

export function textoBotonSeguir(r: Pick<Relacion, 'yo_sigo' | 'me_sigue'>): string {
  if (r.yo_sigo) return 'Siguiendo';
  return r.me_sigue ? 'Seguir también' : 'Seguir';
}

/** Cómo se explica la regla de escribir según la relación, antes de abrir el chat. */
export function avisoEscribir(r: Pick<Relacion, 'amigos' | 'conversacion_estado'>): string | null {
  if (r.amigos || r.conversacion_estado === 'activa') return null;
  return 'Si no se siguen, tu primer mensaje le llegará como solicitud.';
}

export function repartirChats(lista: ConversacionBandeja[]): { solicitudes: ConversacionBandeja[]; conversaciones: ConversacionBandeja[] } {
  const solicitudes: ConversacionBandeja[] = [];
  const conversaciones: ConversacionBandeja[] = [];
  for (const c of lista) (c.solicitud_recibida ? solicitudes : conversaciones).push(c);
  return { solicitudes, conversaciones };
}

export function contarNoLeidasChats(lista: ConversacionBandeja[]): number {
  return lista.filter(c => c.no_leido).length;
}

export function vistaPreviaChat(c: ConversacionBandeja, miId: string | undefined): string {
  if (c.solicitud_recibida) return `Solicitud: ${c.ultimo_texto ?? 'quiere escribirte'}`;
  const texto = c.ultimo_texto ?? '';
  if (!texto) return 'Sin mensajes';
  return c.ultimo_autor_id && c.ultimo_autor_id === miId ? `Tú: ${texto}` : texto;
}

export function subtituloChat(c: Pick<ConversacionBandeja, 'tipo' | 'contraparte_usuario'>): string | null {
  if (c.tipo === 'consulta_negocio') return 'Consulta';
  return c.contraparte_usuario ? `@${c.contraparte_usuario}` : null;
}

export function textoVacioChats(como: ComoBandeja): { titulo: string; texto: string } {
  return como === 'negocio'
    ? { titulo: 'Aún no hay consultas', texto: 'Cuando alguien le escriba a tu negocio, la conversación aparecerá aquí.' }
    : { titulo: 'Sin chats todavía', texto: 'Busca a una persona por su @usuario o haz una consulta desde el perfil de un negocio.' };
}
