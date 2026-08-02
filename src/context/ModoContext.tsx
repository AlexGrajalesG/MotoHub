import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { fetchMiMecanico } from '../lib/mecanicos';

const STORAGE_KEY = 'modo_taller';
const STORAGE_KEY_MECANICO = 'modo_mecanico';

type MiMecanico = { id: string; negocio_id: string; negocio_nombre: string };

type ModoContextType = {
  tieneNegocio: boolean;
  modoTaller: boolean;
  esMecanico: boolean;
  miMecanico: MiMecanico | null;
  modoMecanico: boolean;
  loadingModo: boolean;
  setModoTaller: (v: boolean) => void;
  setModoMecanico: (v: boolean) => void;
  refreshTieneNegocio: () => Promise<void>;
  refreshEsMecanico: () => Promise<void>;
};

const ModoContext = createContext<ModoContextType>({
  tieneNegocio: false,
  modoTaller: false,
  esMecanico: false,
  miMecanico: null,
  modoMecanico: false,
  loadingModo: true,
  setModoTaller: () => {},
  setModoMecanico: () => {},
  refreshTieneNegocio: async () => {},
  refreshEsMecanico: async () => {},
});

export function ModoProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [tieneNegocio, setTieneNegocio] = useState(false);
  const [modoTaller, setModoTallerState] = useState(false);
  const [miMecanico, setMiMecanico] = useState<MiMecanico | null>(null);
  const [modoMecanico, setModoMecanicoState] = useState(false);
  const [loadingModo, setLoadingModo] = useState(true);

  const refreshTieneNegocio = useCallback(async () => {
    if (!session?.user.id) { setTieneNegocio(false); return; }
    const { data } = await supabase
      .from('usuarios')
      .select('roles')
      .eq('id', session.user.id)
      .maybeSingle();
    setTieneNegocio(((data?.roles as string[]) ?? []).includes('negocio'));
  }, [session?.user.id]);

  const refreshEsMecanico = useCallback(async () => {
    if (!session?.user.id) { setMiMecanico(null); return; }
    setMiMecanico(await fetchMiMecanico(session.user.id));
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id) {
      setTieneNegocio(false);
      setModoTallerState(false);
      setMiMecanico(null);
      setModoMecanicoState(false);
      setLoadingModo(false);
      return;
    }
    (async () => {
      setLoadingModo(true);
      await Promise.all([refreshTieneNegocio(), refreshEsMecanico()]);
      const [storedTaller, storedMecanico] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEY),
        SecureStore.getItemAsync(STORAGE_KEY_MECANICO),
      ]);
      setModoTallerState(storedTaller === 'true');
      setModoMecanicoState(storedMecanico === 'true');
      setLoadingModo(false);
    })();
  }, [session?.user.id]);

  // Si el usuario deja de tener negocio/ser mecanico mientras estaba en ese modo, vuelve a Modo Cliente
  useEffect(() => {
    if (!tieneNegocio && modoTaller) setModoTaller(false);
  }, [tieneNegocio]);

  useEffect(() => {
    if (!miMecanico && modoMecanico) setModoMecanico(false);
  }, [miMecanico]);

  function setModoTaller(v: boolean) {
    setModoTallerState(v);
    SecureStore.setItemAsync(STORAGE_KEY, v ? 'true' : 'false');
  }

  function setModoMecanico(v: boolean) {
    setModoMecanicoState(v);
    SecureStore.setItemAsync(STORAGE_KEY_MECANICO, v ? 'true' : 'false');
  }

  return (
    <ModoContext.Provider value={{
      tieneNegocio, modoTaller, esMecanico: !!miMecanico, miMecanico, modoMecanico, loadingModo,
      setModoTaller, setModoMecanico, refreshTieneNegocio, refreshEsMecanico,
    }}>
      {children}
    </ModoContext.Provider>
  );
}

export const useModo = () => useContext(ModoContext);
