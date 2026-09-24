import { detectarPlataforma, type VideoPlataforma } from './comunidadTexto';

export type VideoResuelto = { embedUrl: string; miniatura: string | null };

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

async function resolverTikTok(url: string): Promise<VideoResuelto | null> {
  let id = url.match(/\/video\/(\d+)/)?.[1] ?? null;
  let miniatura: string | null = null;
  try {
    // Sirve también con enlaces cortos (vm.tiktok.com, vt.tiktok.com): devuelve el id real y la portada.
    const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (r.ok) {
      const j = await r.json();
      miniatura = typeof j.thumbnail_url === 'string' ? j.thumbnail_url : null;
      id = (typeof j.html === 'string' ? j.html.match(/data-video-id="(\d+)"/)?.[1] : null) ?? id;
    }
  } catch {
    // sin red o sin oEmbed: se intenta con el id del enlace, si lo trae
  }
  return id ? { embedUrl: `https://www.tiktok.com/embed/v2/${id}`, miniatura } : null;
}

function resolverInstagram(url: string): VideoResuelto | null {
  const m = url.match(/instagram\.com\/(reel|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const tipo = m[1].toLowerCase() === 'p' ? 'p' : 'reel';
  return { embedUrl: `https://www.instagram.com/${tipo}/${m[2]}/embed/`, miniatura: null };
}

/** Convierte el enlace que pegó la persona en la dirección que se puede reproducir dentro de la app. */
export function resolverVideo(url: string, plataforma?: VideoPlataforma | null): Promise<VideoResuelto | null> {
  const clave = url.trim();
  const p = plataforma ?? detectarPlataforma(clave);
  if (!p) return Promise.resolve(null);
  let pendiente = cache.get(clave);
  if (!pendiente) {
    pendiente = p === 'tiktok' ? resolverTikTok(clave) : Promise.resolve(resolverInstagram(clave));
    cache.set(clave, pendiente);
  }
  return pendiente;
}
