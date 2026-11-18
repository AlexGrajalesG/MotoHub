import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** true si el celular pide menos animaciones; null mientras se consulta (un instante al abrir la pantalla). */
export function useMovimientoReducido(): boolean | null {
  const [reducido, setReducido] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(v => { if (vivo) setReducido(v); })
      .catch(() => { if (vivo) setReducido(false); });
    const suscripcion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducido);
    return () => { vivo = false; suscripcion.remove(); };
  }, []);

  return reducido;
}
