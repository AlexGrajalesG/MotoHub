import { useRef } from 'react';
import { Animated, Pressable, Text, ActivityIndicator } from 'react-native';
import { tokens } from '../../lib/tokens';
import { estilosTema } from '../../lib/estilosTema';
import { useMovimientoReducido } from './useMovimientoReducido';

const { colors, radius, fonts } = tokens;

type Props = {
  texto: string;
  cargando?: boolean;
  onPress: () => void;
};

/** Botón principal de las pantallas de entrada: se hunde al tocarlo y muestra el progreso sin cambiar de tamaño. */
export default function BotonAuth({ texto, cargando = false, onPress }: Props) {
  const escala = useRef(new Animated.Value(1)).current;
  const reducido = useMovimientoReducido();

  const mover = (hacia: number) => {
    if (reducido) return;
    Animated.spring(escala, { toValue: hacia, speed: 40, bounciness: 5, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => mover(0.97)}
        onPressOut={() => mover(1)}
        disabled={cargando}
        style={[s.boton, cargando && s.ocupado]}
        accessibilityRole="button"
        accessibilityLabel={texto}
        accessibilityState={{ busy: cargando, disabled: cargando }}
      >
        {cargando ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.texto}>{texto}</Text>}
      </Pressable>
    </Animated.View>
  );
}

const s = estilosTema(() => ({
  boton: {
    backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 54,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  ocupado: { opacity: 0.7 },
  texto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
}));
