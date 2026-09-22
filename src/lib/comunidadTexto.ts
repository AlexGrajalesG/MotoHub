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
