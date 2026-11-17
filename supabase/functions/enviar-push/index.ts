// Envia una notificacion push a los dispositivos de un usuario, por el servicio de Expo (que usa FCM en Android).
// Lo llama el trigger fn_enviar_push con un secreto compartido; no se expone a la app.
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITULO = 100;
const MAX_CUERPO = 200;

function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function texto(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Metodo no permitido', { status: 405 });

  const esperado = Deno.env.get('PUSH_SECRET') ?? '';
  const recibido = req.headers.get('x-push-secret') ?? '';
  if (!esperado || !iguales(esperado, recibido)) return new Response('No autorizado', { status: 401 });

  let cuerpo: Record<string, unknown>;
  try { cuerpo = await req.json(); } catch { return new Response('JSON no valido', { status: 400 }); }

  const usuarioId = cuerpo.usuario_id;
  if (typeof usuarioId !== 'string' || !UUID.test(usuarioId)) return new Response('usuario_id no valido', { status: 400 });
  const titulo = texto(cuerpo.titulo, MAX_TITULO);
  if (!titulo) return new Response('titulo vacio', { status: 400 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: dispositivos, error } = await supabase
    .from('dispositivos_push').select('token').eq('usuario_id', usuarioId);
  if (error) return new Response('Error al leer dispositivos', { status: 500 });
  if (!dispositivos?.length) return new Response(JSON.stringify({ enviados: 0 }), { status: 200 });

  const mensajes = dispositivos.map((d) => ({
    to: d.token,
    title: titulo,
    body: texto(cuerpo.cuerpo, MAX_CUERPO),
    sound: 'default',
    channelId: 'default',
    data: { tipo: texto(cuerpo.tipo, 40), notificacion_id: texto(cuerpo.notificacion_id, 40) },
  }));

  const r = await fetch(EXPO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(mensajes),
  });
  if (!r.ok) return new Response('Expo rechazo el envio', { status: 502 });

  // Los tokens que Expo marca como no registrados (app desinstalada) se borran.
  const { data: tickets } = await r.json() as { data?: { status: string; details?: { error?: string } }[] };
  const muertos = (tickets ?? [])
    .map((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? dispositivos[i].token : null))
    .filter((t): t is string => t !== null);
  if (muertos.length) await supabase.from('dispositivos_push').delete().in('token', muertos);

  return new Response(JSON.stringify({ enviados: mensajes.length - muertos.length }), { status: 200 });
});
