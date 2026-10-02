import { supabase } from './supabase';
import { mensajeError } from './errores';
import { CATEGORIAS, detectarPlataforma, extraerHashtags, type Categoria, type VideoPlataforma, type RolAutor } from './comunidadTexto';

export { CATEGORIAS, detectarPlataforma, extraerHashtags };
export type { Categoria, VideoPlataforma, RolAutor };

export type Post = {
  id: string;
  autor_id: string;
  contenido: string;
  fotos_urls: string[] | null;
  video_url: string | null;
  video_plataforma: VideoPlataforma | null;
  categoria: Categoria;
  ciudad: string | null;
  marca: string | null;
  rol_autor: RolAutor;
  negocio_id: string | null;
  created_at: string;
  likes_count: number;
  comentarios_count: number;
  autor: { nombre: string | null; nombre_usuario: string | null; foto_url: string | null } | null;
  negocio: { nombre: string } | null;
};

const SELECT_POST = `
  id, autor_id, contenido, fotos_urls, video_url, video_plataforma, categoria, ciudad, marca,
  rol_autor, negocio_id, created_at, likes_count, comentarios_count,
  negocio:negocios ( nombre )
`;

/** posts.autor_id referencia usuarios directo (a diferencia de citas), el embed si funciona. */
async function conAutores(filas: any[]): Promise<Post[]> {
  const ids = [...new Set(filas.map(f => f.autor_id))];
  if (ids.length === 0) return [];
  const { data: autores } = await supabase.from('usuarios').select('id, nombre, nombre_usuario, foto_url').in('id', ids);
  const mapa = new Map((autores ?? []).map((a: any) => [a.id, a]));
  return filas.map(f => ({ ...f, negocio: f.negocio ?? null, autor: mapa.get(f.autor_id) ?? null })) as Post[];
}

export type Pestana = 'cerca' | 'moto' | 'talleres';
const PAGINA = 20;

export async function fetchFeed(pestana: Pestana, opciones: { ciudad?: string | null; marcas?: string[]; pagina?: number; busqueda?: string } = {}): Promise<{ posts: Post[]; hayMas: boolean }> {
  const desde = (opciones.pagina ?? 0) * PAGINA;
  let query = supabase.from('posts').select(SELECT_POST).order('created_at', { ascending: false }).range(desde, desde + PAGINA - 1);

  if (pestana === 'cerca') {
    if (opciones.ciudad) query = query.eq('ciudad', opciones.ciudad);
  } else if (pestana === 'moto') {
    if (!opciones.marcas || opciones.marcas.length === 0) return { posts: [], hayMas: false };
    query = query.in('marca', opciones.marcas);
  } else {
    query = query.eq('rol_autor', 'negocio');
  }

  const q = opciones.busqueda?.trim();
  if (q) query = query.ilike('contenido', `%${q}%`);

  const { data, error } = await query;
  if (error) { console.error(error.message); return { posts: [], hayMas: false }; }
  const posts = await conAutores(data ?? []);
  return { posts, hayMas: (data ?? []).length === PAGINA };
}

export type NuevoPost = {
  contenido: string;
  fotosUrls: string[];
  videoUrl: string | null;
  videoPlataforma: VideoPlataforma | null;
  categoria: Categoria;
  ciudad: string | null;
  marca: string | null;
  negocioId: string | null;
  rolAutor: RolAutor;
};

export async function crearPost(autorId: string, p: NuevoPost): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { error } = await supabase.from('posts').insert({
    autor_id: autorId,
    contenido: p.contenido.trim(),
    fotos_urls: p.fotosUrls.length > 0 ? p.fotosUrls : null,
    video_url: p.videoUrl,
    video_plataforma: p.videoPlataforma,
    categoria: p.categoria,
    ciudad: p.ciudad,
    marca: p.marca,
    negocio_id: p.negocioId,
    rol_autor: p.rolAutor,
  });
  if (error) {
    if (error.message.includes('posts_contenido_o_video_check')) return { ok: false, mensaje: 'Escribe algo o agrega un enlace.' };
    if (error.message.includes('fn_conteo_posts_recientes') || error.message.includes('posts_insert_propio')) {
      return { ok: false, mensaje: 'Ya publicaste bastante hoy. Intenta más tarde.' };
    }
    return { ok: false, mensaje: mensajeError(error) };
  }
  return { ok: true };
}

export async function eliminarPost(id: string): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  return error ? { ok: false, mensaje: mensajeError(error) } : { ok: true };
}

// ─── Likes ──────────────────────────────────────────────────────────────────
// posts.likes_count se mantiene solo con triggers (fn_sync_likes_count), nunca se escribe desde el cliente.

/** De esta lista de posts, cuáles ya tienen like del usuario actual (RLS solo deja ver los propios). */
export async function misLikes(postIds: string[], usuarioId: string): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const { data, error } = await supabase.from('post_likes').select('post_id').eq('usuario_id', usuarioId).in('post_id', postIds);
  if (error) { console.error(error.message); return new Set(); }
  return new Set((data ?? []).map((r: any) => r.post_id as string));
}

export async function darLike(postId: string, usuarioId: string): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { error } = await supabase.from('post_likes').insert({ post_id: postId, usuario_id: usuarioId });
  if (error && !error.message.includes('duplicate key')) return { ok: false, mensaje: mensajeError(error) };
  return { ok: true };
}

export async function quitarLike(postId: string, usuarioId: string): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('usuario_id', usuarioId);
  return error ? { ok: false, mensaje: mensajeError(error) } : { ok: true };
}

// ─── Comentarios ────────────────────────────────────────────────────────────
// comentarios_count del post se mantiene con trigger (fn_sync_comentarios_count).

export type Comentario = {
  id: string;
  post_id: string;
  autor_id: string;
  contenido: string;
  created_at: string;
  autor: { nombre: string | null; nombre_usuario: string | null; foto_url: string | null } | null;
};

export async function fetchComentarios(postId: string): Promise<Comentario[]> {
  const { data, error } = await supabase
    .from('comentarios')
    .select('id, post_id, autor_id, contenido, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) { console.error(error.message); return []; }
  const filas = data ?? [];
  const ids = [...new Set(filas.map((f: any) => f.autor_id))];
  if (ids.length === 0) return [];
  const { data: autores } = await supabase.from('usuarios').select('id, nombre, nombre_usuario, foto_url').in('id', ids);
  const mapa = new Map((autores ?? []).map((a: any) => [a.id, a]));
  return filas.map((f: any) => ({ ...f, autor: mapa.get(f.autor_id) ?? null })) as Comentario[];
}

export async function crearComentario(postId: string, autorId: string, contenido: string): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const texto = contenido.trim();
  if (!texto) return { ok: false, mensaje: 'Escribe algo primero.' };
  const { error } = await supabase.from('comentarios').insert({ post_id: postId, autor_id: autorId, contenido: texto });
  return error ? { ok: false, mensaje: mensajeError(error) } : { ok: true };
}

export async function eliminarComentario(id: string): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { error } = await supabase.from('comentarios').delete().eq('id', id);
  return error ? { ok: false, mensaje: mensajeError(error) } : { ok: true };
}

export async function subirFotoComunidad(uri: string, uid: string): Promise<string | null> {
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  const path = `comunidad/${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${safeExt}`;
  try {
    const response = await fetch(uri);
    const ab = await response.arrayBuffer();
    if (ab.byteLength === 0) return null;
    const { error } = await supabase.storage.from('fotos').upload(path, ab, { contentType: `image/${safeExt}` });
    if (error) { console.error(error.message); return null; }
    return supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// ─── Reportar y bloquear ────────────────────────────────────────────────────

export async function reportarPost(postId: string, motivo?: string): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { error } = await supabase.rpc('reportar_post', { p_post_id: postId, p_motivo: motivo ?? null });
  if (!error) return { ok: true };
  if (error.message.includes('Ya reportaste')) return { ok: false, mensaje: 'Ya habías reportado esta publicación.' };
  if (error.message.includes('propia')) return { ok: false, mensaje: 'No puedes reportar tu propia publicación.' };
  return { ok: false, mensaje: mensajeError(error) };
}

export async function bloquearUsuario(usuarioId: string): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { error } = await supabase.rpc('bloquear_usuario', { p_usuario_id: usuarioId });
  return error ? { ok: false, mensaje: mensajeError(error) } : { ok: true };
}

// ─── Moderacion ─────────────────────────────────────────────────────────────

export type PostReportado = {
  id: string;
  contenido: string;
  fotos_urls: string[] | null;
  video_url: string | null;
  autor_nombre: string | null;
  autor_usuario: string | null;
  created_at: string;
  total_reportes: number;
  motivos: string[];
};

export async function fetchColaModeracion(): Promise<PostReportado[]> {
  const { data, error } = await supabase.rpc('cola_moderacion');
  if (error) { console.error(error.message); return []; }
  return (data ?? []) as PostReportado[];
}

export async function moderarPost(postId: string, accion: 'restaurar' | 'eliminar'): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { error } = await supabase.rpc('moderar_post', { p_post_id: postId, p_accion: accion });
  return error ? { ok: false, mensaje: mensajeError(error) } : { ok: true };
}
