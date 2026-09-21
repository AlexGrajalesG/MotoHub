import { supabase } from './supabase';

export type RolAutor = 'propietario' | 'mecanico' | 'negocio';
export type TipoMensaje = 'texto' | 'registro_servicio' | 'sistema';
export type TipoAdjunto = 'foto' | 'factura' | 'documento';

export type Adjunto = { url: string; tipo: TipoAdjunto };

export type HistorialServicio = {
  id: string;
  tipo: string;
  fecha: string;
  km_en_servicio: number | null;
  costo: number | null;
  fotos: string[];
  factura_url: string | null;
  aprobado_propietario: boolean | null;
};

export type MensajeCita = {
  id: string;
  cita_id: string;
  autor_id: string;
  rol_autor: RolAutor;
  tipo_mensaje: TipoMensaje;
  texto: string | null;
  adjuntos: Adjunto[];
  historial_id: string | null;
  created_at: string;
  historial: HistorialServicio | null;
};

export async function fetchMensajes(citaId: string): Promise<MensajeCita[]> {
  const { data, error } = await supabase
    .from('mensajes_cita')
    .select(`
      id, cita_id, autor_id, rol_autor, tipo_mensaje, texto, adjuntos, historial_id, created_at,
      historial:historial_mantenimiento ( id, tipo, fecha, km_en_servicio, costo, fotos, factura_url, aprobado_propietario )
    `)
    .eq('cita_id', citaId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error.message);
    return [];
  }
  return (data ?? []).map((m: any) => ({ ...m, historial: m.historial ?? null })) as MensajeCita[];
}

export async function enviarMensajeTexto(
  citaId: string, autorId: string, rolAutor: RolAutor, texto: string, adjuntos: Adjunto[] = []
) {
  return supabase.from('mensajes_cita').insert({
    cita_id: citaId, autor_id: autorId, rol_autor: rolAutor,
    tipo_mensaje: 'texto', texto: texto.trim() || null, adjuntos,
  });
}

export function subscribeMensajes(citaId: string, onChange: () => void) {
  const channel = supabase
    .channel(`mensajes-cita-${citaId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes_cita', filter: `cita_id=eq.${citaId}` }, onChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'historial_mantenimiento', filter: `cita_id=eq.${citaId}` }, onChange)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export async function uploadAdjuntoCita(uri: string, citaId: string, mimeExt: string): Promise<string | null> {
  const safeExt = mimeExt.toLowerCase();
  const path = `chats/${citaId}/${Date.now()}.${safeExt}`;
  try {
    const response = await fetch(uri);
    const ab = await response.arrayBuffer();
    if (ab.byteLength === 0) { console.warn('uploadAdjuntoCita: archivo vacio'); return null; }
    if (ab.byteLength > MAX_UPLOAD_BYTES) { console.warn('uploadAdjuntoCita: archivo muy grande'); return null; }
    const contentType = safeExt === 'pdf' ? 'application/pdf' : `image/${safeExt}`;
    const { error } = await supabase.storage.from('fotos').upload(path, ab, { contentType });
    if (error) { console.error(error.message); return null; }
    const { data } = supabase.storage.from('fotos').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export type NuevoRegistroServicio = {
  cita_id: string;
  vehiculo_id: string;
  tipo: string;
  descripcion: string | null;
  fecha: string;
  km_en_servicio: number | null;
  costo: number | null;
  notas: string | null;
  fotos: string[];
  factura_url: string | null;
  creado_por: 'negocio' | 'mecanico';
};

export async function registrarServicioPendiente(registro: NuevoRegistroServicio) {
  return supabase.from('historial_mantenimiento').insert({
    ...registro,
    negocio_nombre: null,
    mecanico_nombre: null,
    detalles: null,
    aprobado_propietario: null,
  });
}

export async function resolverRegistroServicio(historialId: string, aceptar: boolean) {
  return supabase
    .from('historial_mantenimiento')
    .update({ aprobado_propietario: aceptar })
    .eq('id', historialId);
}
