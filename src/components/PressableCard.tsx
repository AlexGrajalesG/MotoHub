import { useEffect, useRef, ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleProp, ViewStyle } from 'react-native';

type Props = {
  index: number;
  reduceMotion: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** Cuanto se desplaza verticalmente al entrar (px). */
  entranceDistance?: number;
  /** Escala al presionar (1 = sin efecto). */
  scaleTo?: number;
};

/**
 * Card grande con animacion de entrada (fade + slide) y feedback de toque (spring scale).
 * Excepcion documentada en la revision UX: las cards de lista usan spring scale,
 * los botones de solo-icono usan IconButton (opacity, sin spring).
 */
export default function PressableCard({
  index, reduceMotion, onPress, style, children, entranceDistance = 20, scaleTo = 0.98,
}: Props) {
  const opacity    = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : entranceDistance)).current;
  const scale      = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 400, delay: index * 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay: index * 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const pressIn  = () => { if (!reduceMotion) Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 60, bounciness: 0 }).start(); };
  const pressOut = () => { if (!reduceMotion) Animated.spring(scale, { toValue: 1,       useNativeDriver: true, speed: 60, bounciness: 0 }).start(); };

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable style={style} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
