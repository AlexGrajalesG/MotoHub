import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

/**
 * Vuelve a cargar cuando cambia una tabla (Supabase Realtime).
 * `filter` en formato PostgREST (ej. `negocio_id=eq.<id>`); `null` = todavia no hay filtro valido, no se suscribe.
 * Junta rafagas de cambios en una sola recarga.
 */
export function useRealtimeRefresh(table: string, filter: string | null, onChange: () => void) {
  const callback = useRef(onChange);
  callback.current = onChange;
  const sufijo = useRef(Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    if (filter === null) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`rt-${table}-${sufijo.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => callback.current(), 300);
      })
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [table, filter]);
}
