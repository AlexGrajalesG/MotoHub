import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

const TIPOS_LABEL: Record<string, string> = {
  soat: 'SOAT',
  revision_tecnica: 'Rev. Técnica',
  aceite: 'Aceite',
  frenos: 'Frenos',
  cadena: 'Cadena',
  llantas: 'Llantas',
  bateria: 'Batería',
  personalizado: 'Recordatorio',
};

export async function solicitarPermisos(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export function configurarHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function notificarKm(titulo: string, body: string) {
  const ok = await solicitarPermisos();
  if (!ok) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body },
    trigger: null,
  });
}

export async function programarNotificacionFecha(
  id: string,
  titulo: string,
  body: string,
  fecha: Date
) {
  const ok = await solicitarPermisos();
  if (!ok) return;
  if (fecha <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: titulo, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fecha,
    },
  });
}

export async function cancelarNotificacion(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Verifica todos los recordatorios de km de un vehículo contra el nuevo kilometraje
 * y dispara notificaciones según el umbral configurado por el usuario.
 * Llamar tanto desde actualización manual como desde futuros viajes GPS.
 */
export async function verificarRecordatoriosKm(
  vehiculoId: string,
  vehiculoNombre: string,
  nuevoKm: number
) {
  const { data } = await supabase
    .from('recordatorios')
    .select('id, tipo, descripcion, km_limite, km_aviso')
    .eq('vehiculo_id', vehiculoId)
    .eq('estado', 'pendiente')
    .not('km_limite', 'is', null);

  if (!data) return;

  for (const r of data) {
    if (!r.km_limite) continue;
    const label = r.descripcion || TIPOS_LABEL[r.tipo] || r.tipo;
    const umbral = r.km_aviso ?? 1000;
    const restante = r.km_limite - nuevoKm;

    if (nuevoKm >= r.km_limite) {
      await notificarKm(
        `⚠️ ${label} vencido — ${vehiculoNombre}`,
        `Ya superaste el límite de ${r.km_limite.toLocaleString()} km`
      );
    } else if (restante <= umbral) {
      await notificarKm(
        `🔔 ${label} próximo — ${vehiculoNombre}`,
        `Faltan ${restante.toLocaleString()} km para el límite (${r.km_limite.toLocaleString()} km)`
      );
    }
  }
}
