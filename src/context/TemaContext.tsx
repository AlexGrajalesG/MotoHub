import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { aplicarTema, tokens } from '../lib/tokens';
import { TEMA_POR_DEFECTO, temaDesdeGuardado, type NombreTema } from '../lib/paletas';

const CLAVE_TEMA = 'rodix_tema';

type Valor = {
  tema: NombreTema;
  cambiarTema: (nuevo: NombreTema) => void;
};

const Ctx = createContext<Valor>({ tema: TEMA_POR_DEFECTO, cambiarTema: () => {} });

/** Carga el tema guardado antes de dibujar nada y lo aplica a toda la app. */
export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<NombreTema | null>(null);

  useEffect(() => {
    let vigente = true;
    SecureStore.getItemAsync(CLAVE_TEMA)
      .catch(() => null)
      .then(guardado => {
        const elegido = temaDesdeGuardado(guardado);
        aplicarTema(elegido);
        if (vigente) setTema(elegido);
      });
    return () => { vigente = false; };
  }, []);

  const cambiarTema = useCallback((nuevo: NombreTema) => {
    aplicarTema(nuevo);
    setTema(nuevo);
    SecureStore.setItemAsync(CLAVE_TEMA, nuevo).catch(() => {});
  }, []);

  const valor = useMemo<Valor>(() => ({ tema: tema ?? TEMA_POR_DEFECTO, cambiarTema }), [tema, cambiarTema]);

  if (!tema) return <View style={{ flex: 1, backgroundColor: '#020202' }} />;

  return (
    <Ctx.Provider value={valor}>
      <StatusBar style={tokens.colors.barraEstado} />
      {children}
    </Ctx.Provider>
  );
}

export function useTema(): Valor {
  return useContext(Ctx);
}
