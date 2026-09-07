import { supabase } from './supabase';

export type DestinoTipo = 'negocio' | 'mecanico' | 'usuario';
export type AutorRol = 'propietario' | 'negocio' | 'mecanico';

export type Promedio = { promedio: number; total: number };

export async function fetchPromedio(destinoTipo: DestinoTipo, destinoId: string): Promise<Promedio> {
  const { data, error } = await supabase
    .from('calificaciones')
    .select('estrellas')
    .eq('destino_tipo', destinoTipo)
    .eq('destino_id', destinoId);
  if (error || !data || data.length === 0) return { promedio: 0, total: 0 };
  const total = data.length;
  const suma = data.reduce((acc, r: any) => acc + r.estrellas, 0);
  return { promedio: Math.round((suma / total) * 10) / 10, total };
}

export async function fetchPromediosBatch(destinoTipo: DestinoTipo, destinoIds: string[]): Promise<Record<string, Promedio>> {
  if (destinoIds.length === 0) return {};
  const { data, error } = await supabase
    .from('calificaciones')
    .select('destino_id, estrellas')
    .eq('destino_tipo', destinoTipo)
    .in('destino_id', destinoIds);
  if (error || !data) return {};

  const grupos: Record<string, number[]> = {};
  data.forEach((r: any) => {
    (grupos[r.destino_id] ??= []).push(r.estrellas);
  });

  const result: Record<string, Promedio> = {};
  Object.entries(grupos).forEach(([id, valores]) => {
    const total = valores.length;
    const suma = valores.reduce((a, b) => a + b, 0);
    result[id] = { promedio: Math.round((suma / total) * 10) / 10, total };
  });
  return result;
}

export async function fetchMisCalificacionesDeCita(citaId: string, autorId: string): Promise<DestinoTipo[]> {
  const { data } = await supabase
    .from('calificaciones')
    .select('destino_tipo')
    .eq('cita_id', citaId)
    .eq('autor_id', autorId);
  return (data ?? []).map((r: any) => r.destino_tipo);
}

export async function enviarCalificacion(params: {
  citaId: string; autorId: string; autorRol: AutorRol;
  destinoTipo: DestinoTipo; destinoId: string; estrellas: number; comentario?: string;
}) {
  return supabase.from('calificaciones').insert({
    cita_id: params.citaId,
    autor_id: params.autorId,
    autor_rol: params.autorRol,
    destino_tipo: params.destinoTipo,
    destino_id: params.destinoId,
    estrellas: params.estrellas,
    comentario: params.comentario?.trim() || null,
  });
}
