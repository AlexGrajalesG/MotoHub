import { supabase } from './supabase';
import type { ComoBandeja, ConversacionBandeja } from './bandejaTexto';

/** Conversaciones del usuario según el lado en que usa la app; la base aplica RLS. */
export async function fetchBandeja(como: ComoBandeja): Promise<ConversacionBandeja[]> {
  const { data, error } = await supabase.rpc('bandeja_mensajes', { p_como: como });
  if (error) {
    console.error(error.message);
    return [];
  }
  return (data ?? []) as ConversacionBandeja[];
}
