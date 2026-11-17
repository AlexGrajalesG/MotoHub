import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

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
