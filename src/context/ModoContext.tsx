import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { fetchMiMecanico } from '../lib/mecanicos';
import { useRealtimeRefresh } from '../lib/useRealtimeRefresh';

const STORAGE_KEY = 'modo_taller';
const STORAGE_KEY_MECANICO = 'modo_mecanico';

type MiMecanico = { id: string; negocio_id: string; negocio_nombre: string };

type ModoContextType = {
  tieneNegocio: boolean;
  negocioId: string | null;
  citasPendientes: number;
  modoTaller: boolean;
  esMecanico: boolean;
  miMecanico: MiMecanico | null;
  modoMecanico: boolean;
  loadingModo: boolean;
  setModoTaller: (v: boolean) => void;
  setModoMecanico: (v: boolean) => void;
  refreshTieneNegocio: () => Promise<void>;
  refreshEsMecanico: () => Promise<void>;
  refreshCitasPendientes: () => Promise<void>;
};

const ModoContext = createContext<ModoContextType>({
  tieneNegocio: false,
  negocioId: null,
  citasPendientes: 0,
  modoTaller: false,
  esMecanico: false,
  miMecanico: null,
  modoMecanico: false,
  loadingModo: true,
  setModoTaller: () => {},
  setModoMecanico: () => {},
  refreshTieneNegocio: async () => {},
  refreshEsMecanico: async () => {},
  refreshCitasPendientes: async () => {},
});

export function ModoProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [tieneNegocio, setTieneNegocio] = useState(false);
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [citasPendientes, setCitasPendientes] = useState(0);
  const [modoTaller, setModoTallerState] = useState(false);
  const [miMecanico, setMiMecanico] = useState<MiMecanico | null>(null);
  const [modoMecanico, setModoMecanicoState] = useState(false);
  const [loadingModo, setLoadingModo] = useState(true);

  const refreshTieneNegocio = useCallback(async () => {
    if (!session?.user.id) { setTieneNegocio(false); setNegocioId(null); return; }
    const [{ data: usuario }, { data: negocio }] = await Promise.all([
      supabase.from('usuarios').select('roles').eq('id', session.user.id).maybeSingle(),
      supabase.from('negocios').select('id').eq('propietario_id', session.user.id).maybeSingle(),
    ]);
    setTieneNegocio(((usuario?.roles as string[]) ?? []).includes('negocio'));
    setNegocioId(negocio?.id ?? null);
  }, [session?.user.id]);

  const refreshCitasPendientes = useCallback(async () => {
    if (!negocioId) { setCitasPendientes(0); return; }
    const { count } = await supabase
      .from('citas')
      .select('*', { count: 'exact', head: true })
      .eq('negocio_id', negocioId)
      .eq('estado', 'pendiente');
    setCitasPendientes(count ?? 0);
  }, [negocioId]);

  useEffect(() => { refreshCitasPendientes(); }, [refreshCitasPendientes]);
  useRealtimeRefresh('citas', negocioId ? `negocio_id=eq.${negocioId}` : null, refreshCitasPendientes);

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
      tieneNegocio, negocioId, citasPendientes, modoTaller, esMecanico: !!miMecanico, miMecanico, modoMecanico, loadingModo,
      setModoTaller, setModoMecanico, refreshTieneNegocio, refreshEsMecanico, refreshCitasPendientes,
    }}>
      {children}
    </ModoContext.Provider>
  );
}

export const useModo = () => useContext(ModoContext);
