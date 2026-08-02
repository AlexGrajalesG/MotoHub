import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { contarNoLeidas, type Notificacion } from '../lib/notificacionesApp';
import { notificarKm } from '../lib/notificaciones';

type NotificacionesContextType = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
};

const NotificacionesContext = createContext<NotificacionesContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
});

export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!session?.user.id) { setUnreadCount(0); return; }
    setUnreadCount(await contarNoLeidas(session.user.id));
  }, [session?.user.id]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!session?.user.id) return;

    const channel = supabase
      .channel(`notificaciones-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${session.user.id}`,
        },
        (payload) => {
          const n = payload.new as Notificacion;
          setUnreadCount(c => c + 1);
          notificarKm(n.titulo, n.cuerpo);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user.id]);

  return (
    <NotificacionesContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </NotificacionesContext.Provider>
  );
}

export const useNotificaciones = () => useContext(NotificacionesContext);
