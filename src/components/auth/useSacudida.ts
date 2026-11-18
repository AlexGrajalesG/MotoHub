import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { useMovimientoReducido } from './useMovimientoReducido';

const RECORRIDO = [-9, 9, -6, 6, -3, 0];

/** Vibración corta de izquierda a derecha para señalar un error. Con "reducir animaciones" no hace nada. */
export function useSacudida() {
  const desplazamiento = useRef(new Animated.Value(0)).current;
  const reducido = useMovimientoReducido();

  const sacudir = useCallback(() => {
    if (reducido) return;
    Animated.sequence(
      RECORRIDO.map(x => Animated.timing(desplazamiento, { toValue: x, duration: 45, useNativeDriver: true })),
    ).start();
  }, [reducido, desplazamiento]);

  return { sacudir, estilo: { transform: [{ translateX: desplazamiento }] } };
}
