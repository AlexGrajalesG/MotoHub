import { detectarPlataforma, type VideoPlataforma } from './comunidadTexto';

/**
 * `miniatura` y `autor` solo vienen cuando la propia plataforma confirmó el enlace (oEmbed);
 * si no, el enlace sigue siendo válido por su forma pero no se muestra nada que no se haya confirmado.
 */
export type VideoResuelto = { embedUrl: string; miniatura: string | null; autor: string | null };

const cache = new Map<string, Promise<VideoResuelto | null>>();

const DOMINIOS_PERMITIDOS = ['tiktok.com', 'tiktokcdn.com', 'tiktokv.com', 'instagram.com', 'cdninstagram.com', 'fbcdn.net'];

/** Solo se carga contenido de TikTok o Instagram (y sus redes de entrega), nunca una dirección cualquiera. */
export function hostPermitido(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && DOMINIOS_PERMITIDOS.some(d => u.hostname === d || u.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Devuelve la dirección solo si es de una red permitida; si no, null. */
export function urlPermitidaOnull(url: unknown): string | null {
  return typeof url === 'string' && hostPermitido(url) ? url : null;
}

/** Nombre de autor que se muestra: sin arroba, sin espacios y con un largo razonable. */
export function limpiarAutor(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim().replace(/^@+/, '');
  if (!limpio || limpio.length > 40 || /\s/.test(limpio)) return null;
  return limpio;
}

async function resolverTikTok(url: string): Promise<VideoResuelto | null> {
  let id = url.match(/\/video\/(\d+)/)?.[1] ?? null;
  let miniatura: string | null = null;
  let autor: string | null = null;
  try {
    // Sirve también con enlaces cortos (vm.tiktok.com, vt.tiktok.com): devuelve el id real, la portada y el autor.
    const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (r.ok) {
      const j = await r.json();
      miniatura = urlPermitidaOnull(j.thumbnail_url);
      autor = limpiarAutor(j.author_unique_id);
      id = (typeof j.html === 'string' ? j.html.match(/data-video-id="(\d+)"/)?.[1] : null) ?? id;
    }
  } catch {
    // sin red o sin oEmbed: se intenta con el id del enlace, si lo trae
  }
  return id ? { embedUrl: `https://www.tiktok.com/embed/v2/${id}`, miniatura, autor } : null;
}

function resolverInstagram(url: string): VideoResuelto | null {
  const m = url.match(/^https:\/\/(?:www\.)?instagram\.com\/(reel|p)\/([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const tipo = m[1].toLowerCase() === 'p' ? 'p' : 'reel';
  // Instagram solo da portada y autor con una credencial de Meta, que debe guardarse en el servidor, no en la app.
  return { embedUrl: `https://www.instagram.com/${tipo}/${m[2]}/embed/`, miniatura: null, autor: null };
}

/** Convierte el enlace que pegó la persona en la dirección que se puede reproducir dentro de la app. */
export function resolverVideo(url: string, plataforma?: VideoPlataforma | null): Promise<VideoResuelto | null> {
  const clave = url.trim();
  const p = detectarPlataforma(clave);
  if (!p || (plataforma && plataforma !== p)) return Promise.resolve(null);
  let pendiente = cache.get(clave);
  if (!pendiente) {
    pendiente = p === 'tiktok' ? resolverTikTok(clave) : Promise.resolve(resolverInstagram(clave));
    cache.set(clave, pendiente);
  }
  return pendiente;
}
