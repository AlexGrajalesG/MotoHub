import { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { DURACION_ENTRADA, retrasoEscalonado } from '../../lib/animacionAuth';
import { useMovimientoReducido } from './useMovimientoReducido';

type Props = {
  /** Orden de entrada: 0 aparece primero, los siguientes esperan un poco más. */
  indice?: number;
  /** Cuántos px sube mientras aparece. */
  desde?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Aparece con fundido y un pequeño ascenso. Con "reducir animaciones" aparece sin movimiento. */
export default function Aparece({ indice = 0, desde = 18, style, children }: Props) {
  const reducido = useMovimientoReducido();
  const progreso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducido === null) return;
    if (reducido) { progreso.setValue(1); return; }
    const animacion = Animated.timing(progreso, {
      toValue: 1,
      duration: DURACION_ENTRADA,
      delay: retrasoEscalonado(indice),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animacion.start();
    return () => animacion.stop();
  }, [reducido, indice, progreso]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progreso,
          transform: [{ translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [desde, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
