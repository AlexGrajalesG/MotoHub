import { PALETAS, TEMA_POR_DEFECTO, type Colores, type NombreTema } from './paletas';

/**
 * `colors` es un objeto único que se actualiza en el sitio al cambiar de tema (`aplicarTema`),
 * así que cualquier `const { colors } = tokens` ve siempre la paleta vigente.
 * Los estilos deben crearse con `estilosTema` para recalcularse al cambiar de tema.
 */
const colors: Colores = { ...PALETAS[TEMA_POR_DEFECTO] };

let temaActual: NombreTema = TEMA_POR_DEFECTO;

export function aplicarTema(nombre: NombreTema): void {
  temaActual = nombre;
  Object.assign(colors, PALETAS[nombre]);
}

export function obtenerTemaActual(): NombreTema {
  return temaActual;
}

export const tokens = {
  colors,
  spacing: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
  },
  radius: {
    sm: 6, md: 10, lg: 14, xl: 20, pill: 999,
  },
  fonts: {
    display: 'SpaceGrotesk_700Bold',   // títulos grandes
    heading: 'Inter_600SemiBold',      // subtítulos, labels
    body:    'Inter_400Regular',       // texto corriente
    bold:    'Inter_700Bold',          // CTAs, nombres
  },
} as const;
