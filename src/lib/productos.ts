import { supabase } from './supabase';

export type Producto = {
  id: string;
  negocio_id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  fotos: string[];
  compatible_con: string[];
  activo: boolean;
};

export async function fetchProductosDeNegocio(negocioId: string, soloActivos = true): Promise<Producto[]> {
  let query = supabase.from('productos').select('*').eq('negocio_id', negocioId).order('created_at', { ascending: false });
  if (soloActivos) query = query.eq('activo', true);
  const { data, error } = await query;
  if (error) { console.error(error.message); return []; }
  return (data ?? []) as Producto[];
}

const MAX_FOTO_BYTES = 10 * 1024 * 1024; // 10 MB

export async function uploadFotoProducto(uri: string, negocioId: string): Promise<string | null> {
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  const path = `productos/${negocioId}/${Date.now()}.${safeExt}`;
  try {
    const response = await fetch(uri);
    const ab = await response.arrayBuffer();
    if (ab.byteLength === 0) { console.warn('uploadFotoProducto: imagen vacia'); return null; }
    if (ab.byteLength > MAX_FOTO_BYTES) { console.warn('uploadFotoProducto: imagen muy grande'); return null; }
    const { error } = await supabase.storage.from('fotos').upload(path, ab, { contentType: `image/${safeExt}` });
    if (error) { console.error(error.message); return null; }
    const { data } = supabase.storage.from('fotos').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function crearProducto(p: Omit<Producto, 'id' | 'activo'>) {
  return supabase.from('productos').insert(p);
}

export async function actualizarProducto(id: string, p: Partial<Omit<Producto, 'id' | 'negocio_id'>>) {
  return supabase.from('productos').update(p).eq('id', id);
}

export async function eliminarProducto(id: string) {
  return supabase.from('productos').delete().eq('id', id);
}
