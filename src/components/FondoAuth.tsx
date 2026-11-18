import { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Polygon, Line } from 'react-native-svg';
import { tokens, obtenerTemaActual } from '../lib/tokens';
import type { NombreTema } from '../lib/paletas';
import { alturaHero, geometriaHero, type VarianteFondo } from '../lib/animacionAuth';
import { useMovimientoReducido } from './auth/useMovimientoReducido';

type Capas = { asfalto: string; verde: string; borde: string; carril: string; tinta: string };

// Colores planos y de bordes definidos: la profundidad sale de las capas, no de difuminados.
const POR_TEMA: Record<NombreTema, Capas> = {
  rodix:  { asfalto: '#0c1a0e', verde: '#133210', borde: '#48975a', carril: '#ffffff', tinta: '#ffffff' },
  oscuro: { asfalto: '#16241a', verde: '#1f3d26', borde: '#5fb374', carril: '#ffffff', tinta: '#ffffff' },
  claro:  { asfalto: '#2f7a42', verde: '#cfe6d5', borde: '#ffffff', carril: '#ffffff', tinta: '#111412' },
};

/** Color del texto y del logo que van sobre el hero (blanco en los temas oscuros, oscuro en el claro). */
export function tintaHero(): string {
  return POR_TEMA[obtenerTemaActual()].tinta;
}

/** Una capa del hero que entra deslizándose desde la izquierda. Con "reducir animaciones" queda fija. */
function CapaEntrante({ retraso, ancho, alto, children }: { retraso: number; ancho: number; alto: number; children: React.ReactNode }) {
  const reducido = useMovimientoReducido();
  const x = useRef(new Animated.Value(-ancho)).current;

  useEffect(() => {
    if (reducido === null) return;
    if (reducido) { x.setValue(0); return; }
    const animacion = Animated.timing(x, {
      toValue: 0, duration: 520, delay: retraso, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animacion.start();
    return () => animacion.stop();
  }, [reducido, retraso, x]);

  return (
    <Animated.View pointerEvents="none" style={[styles.capa, { width: ancho, height: alto, transform: [{ translateX: x }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * Fondo de las pantallas de entrada.
 * - `hero`: bloque grande arriba, para el inicio de sesión.
 * - `compacta`: franja baja con la barra de volver, para formularios largos.
 * - `liso`: solo el color de fondo.
 */
export default function FondoAuth({ children, variante = 'liso' }: { children: React.ReactNode; variante?: VarianteFondo }) {
  const { width, height } = useWindowDimensions();
  const c = POR_TEMA[obtenerTemaActual()];
  const alto = alturaHero(variante, height);
  const g = geometriaHero(width, alto);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.bgPrimary }}>
      {alto > 0 && (
        <>
          <CapaEntrante retraso={0} ancho={width} alto={alto}>
            <Svg width={width} height={alto}>
              <Polygon points={g.asfalto} fill={c.asfalto} />
              <Line {...g.borde} stroke={c.borde} strokeWidth={3} />
            </Svg>
          </CapaEntrante>
          <CapaEntrante retraso={110} ancho={width} alto={alto}>
            <Svg width={width} height={alto}>
              <Polygon points={g.verde} fill={c.verde} />
              <Line {...g.carril} stroke={c.carril} strokeWidth={2.5} strokeDasharray="14 10" />
            </Svg>
          </CapaEntrante>
        </>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  capa: { position: 'absolute', top: 0, left: 0 },
});
