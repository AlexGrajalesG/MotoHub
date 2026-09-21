export const tokens = {
  colors: {
    // Paleta de marca (paquete de marca 2026-09-20): #020202, #3e4140, #48975a, #133210.
    // bgCard y bgElevated no vienen en la paleta: son grises neutros intermedios derivados.
    accent:        '#48975a',
    accentSoft:    '#a3d1ae',
    /** Verde oscuro de marca: fondos de énfasis (tarjetas destacadas). */
    accentDark:    '#133210',
    /** Texto e iconos sobre fondo `accent`. El blanco solo da 3.6:1 sobre #48975a; este da 5.2:1. */
    onAccent:      '#020202',
    bgPrimary:     '#020202',
    bgCard:        '#0f1110',
    bgSurface:     '#3e4140',
    bgElevated:    '#1c1f1e',
    bgLight:       '#f4f4f2',
    textPrimary:   '#ffffff',
    textSecondary: 'rgba(255,255,255,0.55)',
    textTertiary:  'rgba(255,255,255,0.5)',
    iconInactive:  'rgba(255,255,255,0.4)',
    iconActive:    '#48975a',
    /** Teal, distinto del verde de marca para que "éxito/abierto" no se confunda con el acento. */
    success:       '#2fa89b',
    danger:        '#c0392b',
    /** Rojo de acciones destructivas (logout, eliminar, cancelar) — distinto del danger de vencimientos. */
    dangerAction:       '#ff453a',
    dangerActionBg:     'rgba(255,69,58,0.25)',
    dangerActionBorder: 'rgba(255,69,58,0.35)',
  },
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
