import { Image } from 'react-native';
import { tokens } from '../lib/tokens';

// Logos del paquete de marca (PNG blanco con transparencia); `color` los tiñe con tintColor.
const COMPLETO = require('../../assets/logo-completo.png');
const MONOGRAMA = require('../../assets/logo-monograma.png');

// Proporcion ancho/alto de cada PNG.
const PROPORCION = { completo: 1248 / 280, monograma: 538 / 390 };

type Props = {
  /** `monograma` = solo la R; `completo` = R + RODIX. */
  variante?: 'monograma' | 'completo';
  /** Alto en px; el ancho sale de la proporcion del logo. */
  alto?: number;
  color?: string;
};

export default function RodixLogo({ variante = 'completo', alto = 40, color = tokens.colors.textPrimary }: Props) {
  return (
    <Image
      source={variante === 'completo' ? COMPLETO : MONOGRAMA}
      style={{ width: alto * PROPORCION[variante], height: alto, tintColor: color }}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Rodix"
    />
  );
}
