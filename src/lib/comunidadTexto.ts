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

const REGEX_TIKTOK = /^https:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i;
const REGEX_INSTAGRAM = /^https:\/\/(www\.)?instagram\.com\/(reel|p)\//i;

/** Detecta la plataforma de un enlace pegado, o null si no es un enlace admitido. */
export function detectarPlataforma(url: string): VideoPlataforma | null {
  const limpio = url.trim();
  if (REGEX_TIKTOK.test(limpio)) return 'tiktok';
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
