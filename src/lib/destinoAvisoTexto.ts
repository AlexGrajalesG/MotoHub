import type { Notificacion } from "./notificacionesApp";

export type AvisoAbrible = Pick<Notificacion, 'tipo' | 'cita_id' | 'conversacion_id'>;

export type Destino =
  | { tipo: 'ruta'; nombre: string; params?: Record<string, unknown> }
  | { tipo: 'negocio'; luego: 'equipo' | 'citas' };

/** Decide a qué pantalla lleva un aviso. Pura: no navega ni consulta nada. */
export function destinoAviso(a: AvisoAbrible): Destino {
  if (a.tipo === 'cita_estado') return { tipo: 'ruta', nombre: 'Servicios', params: { screen: 'MisCitas' } };
  if (a.tipo === 'invitacion_equipo') return { tipo: 'ruta', nombre: 'Perfil', params: { screen: 'InvitacionesEquipo' } };
  if (a.tipo === 'invitacion_respuesta') return { tipo: 'negocio', luego: 'equipo' };
  if ((a.tipo === 'mensaje_chat' || a.tipo === 'solicitud_chat') && a.conversacion_id) {
    return { tipo: 'ruta', nombre: 'Mensajes', params: { screen: 'ChatConversacion', params: { conversacionId: a.conversacion_id } } };
  }
  if (a.tipo === 'registro_servicio_nuevo' && a.cita_id) {
    return { tipo: 'ruta', nombre: 'Servicios', params: { screen: 'ChatCita', params: { citaId: a.cita_id } } };
  }
  if (a.tipo === 'registro_servicio_resuelto' && a.cita_id) {
    return { tipo: 'ruta', nombre: 'ChatCita', params: { citaId: a.cita_id } };
  }
  return { tipo: 'negocio', luego: 'citas' };
}
