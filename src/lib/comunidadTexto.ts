// Sin dependencias de red: se puede probar sin inicializar Supabase.

export type Categoria = 'ruta' | 'tip' | 'taller' | 'evento' | 'general';
export type VideoPlataforma = 'tiktok' | 'instagram';
export type RolAutor = 'propietario' | 'negocio' | 'mecanico';

export const CATEGORIAS: { key: Categoria; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'ruta', label: 'Ruta' },
  { key: 'tip', label: 'Tip' },
  { key: 'taller', label: 'Taller' },
  { key: 'evento', label: 'Evento' },
];

// Solo enlaces con forma de video, nunca otras rutas del dominio (por ejemplo páginas de redirección).
// Estas mismas reglas están en la restricción posts_video_dominio_check de la base de datos.
const FIN = String.raw`/?([?#].*)?$`;
const REGEX_TIKTOK = [
  new RegExp(String.raw`^https://(www\.)?tiktok\.com/@[A-Za-z0-9._-]+/video/[0-9]+` + FIN, 'i'),
  new RegExp(String.raw`^https://(vm|vt)\.tiktok\.com/[A-Za-z0-9_-]+` + FIN, 'i'),
  new RegExp(String.raw`^https://(www\.)?tiktok\.com/t/[A-Za-z0-9_-]+` + FIN, 'i'),
];
const REGEX_INSTAGRAM = new RegExp(String.raw`^https://(www\.)?instagram\.com/(reel|p)/[A-Za-z0-9_-]+` + FIN, 'i');

export const LARGO_MAXIMO_ENLACE_VIDEO = 300;

/** Detecta la plataforma de un enlace pegado, o null si no es un enlace de video admitido. */
export function detectarPlataforma(url: string): VideoPlataforma | null {
  const limpio = url.trim();
  if (limpio.length > LARGO_MAXIMO_ENLACE_VIDEO || /\s/.test(limpio)) return null;
  if (REGEX_TIKTOK.some(r => r.test(limpio))) return 'tiktok';
  if (REGEX_INSTAGRAM.test(limpio)) return 'instagram';
  return null;
}

const REGEX_HASHTAG = /#[\p{L}\p{N}_]+/gu;

/** Saca los #hashtags del texto de una publicación, sin duplicados, en minúscula. */
export function extraerHashtags(contenido: string | null | undefined): string[] {
  if (!contenido) return [];
  const encontrados = contenido.match(REGEX_HASHTAG) ?? [];
  return [...new Set(encontrados.map(h => h.toLowerCase()))];
}
