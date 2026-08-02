import { Linking } from 'react-native';

const ALLOWED_SCHEMES = ['https:', 'tel:'];

export async function openUrl(url: string): Promise<void> {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_SCHEMES.includes(parsed.protocol)) return;
    await Linking.openURL(url);
  } catch {
    // invalid URL or unsupported scheme
  }
}

export function openTel(telefono: string | null | undefined): void {
  if (!telefono) return;
  const clean = telefono.replace(/[^\d\s+\-()]/g, '');
  if (!clean) return;
  Linking.openURL(`tel:${clean}`);
}
