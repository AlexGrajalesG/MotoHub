import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { ModoEfectivo } from './modoEfectivo';
import { claveTutorial, debeMostrarTutorial, VALOR_VISTO } from './tutorialTexto';

/**
 * Controla el tutorial de un usuario en un modo: se abre solo la primera vez
 * y se puede volver a abrir a mano. Si el almacenamiento falla, no se molesta al usuario.
 */
export function useTutorial(usuarioId: string | undefined, modo: ModoEfectivo) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!usuarioId) return;
    let vigente = true;
    SecureStore.getItemAsync(claveTutorial(usuarioId, modo))
      .then(valor => { if (vigente && debeMostrarTutorial(valor)) setVisible(true); })
      .catch(() => {});
    return () => { vigente = false; };
  }, [usuarioId, modo]);

  const abrir = useCallback(() => setVisible(true), []);

  const cerrar = useCallback(() => {
    setVisible(false);
    if (usuarioId) SecureStore.setItemAsync(claveTutorial(usuarioId, modo), VALOR_VISTO).catch(() => {});
  }, [usuarioId, modo]);

  return { visible, abrir, cerrar };
}
