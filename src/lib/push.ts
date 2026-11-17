import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { navigationRef } from './navegacionRaiz';
import { abrirAviso } from './destinoAviso';
import type { AvisoAbrible } from './destinoAvisoTexto';
import { marcarLeida } from './notificacionesApp';

// Token de este celular una vez registrado en el servidor; null si no hay push (sin permiso, sin red o sin Firebase).
let tokenActual: string | null = null;

/** Con push activo el aviso llega por el sistema; si no, la app muestra el aviso local. */
export function pushActivo(): boolean {
  return tokenActual !== null;
}

/** Pide permiso, saca el token del celular y lo guarda en el servidor. Nunca lanza error. */
export async function registrarPush(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos de Rodix',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc('registrar_token_push', { p_token: token, p_plataforma: Platform.OS });
    if (!error) tokenActual = token;
  } catch {
    // Sin Firebase, sin red o sin Play Services: la app sigue con los avisos de dentro.
  }
}

const atendidos = new Set<string>();

function notificacionDe(r: Notifications.NotificationResponse): string | null {
  const id = r.notification.request.content.data?.notificacion_id;
  return typeof id === 'string' && id ? id : null;
}

/** Al abrir la app desde un aviso, la navegación puede no estar lista aún: se espera hasta unos segundos. */
async function esperarNavegacion(): Promise<boolean> {
  for (let i = 0; i < 20; i++) {
    if (navigationRef.isReady() && navigationRef.getRootState()?.routeNames?.length) {
      await new Promise(r => setTimeout(r, 300));
      return true;
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

async function abrirDesdePush(usuarioId: string, notificacionId: string): Promise<void> {
  if (atendidos.has(notificacionId)) return;
  atendidos.add(notificacionId);
  // Se lee de la base con el filtro del usuario: un push de otra cuenta en este celular no abre nada.
  const { data } = await supabase
    .from('notificaciones')
    .select('id, tipo, cita_id, conversacion_id')
    .eq('id', notificacionId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (!data || !(await esperarNavegacion())) return;
  marcarLeida(data.id);
  await abrirAviso((nombre, params) => navigationRef.navigate(nombre, params), usuarioId, data as AvisoAbrible);
}

/** Abre la pantalla del aviso al tocar un push, con la app abierta, en segundo plano o cerrada. Devuelve cómo dejar de escuchar. */
export function escucharToquesDePush(usuarioId: string): () => void {
  const suscripcion = Notifications.addNotificationResponseReceivedListener(r => {
    const id = notificacionDe(r);
    if (id) abrirDesdePush(usuarioId, id);
  });
  // App cerrada: el toque que la abrió se consulta al arrancar.
  Notifications.getLastNotificationResponseAsync().then(r => {
    const id = r ? notificacionDe(r) : null;
    if (id) abrirDesdePush(usuarioId, id);
  });
  return () => suscripcion.remove();
}

/** Desvincula este celular de la cuenta. Llamar antes de cerrar sesión, mientras aún hay sesión. */
export async function quitarPush(): Promise<void> {
  const token = tokenActual;
  tokenActual = null;
  if (!token) return;
  try {
    await supabase.rpc('borrar_token_push', { p_token: token });
  } catch {
    // Si falla, el token se reasigna solo cuando otra cuenta inicie sesión en este celular.
  }
}
