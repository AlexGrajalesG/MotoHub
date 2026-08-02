export const tokens = {
  colors: {
    accent:        '#e8522a',
    accentSoft:    '#f0a882',
    bgPrimary:     '#111318',
    bgCard:        '#1c1f27',
    bgSurface:     '#2a2d38',
    bgElevated:    '#33353a',
    bgLight:       '#f4f4f2',
    textPrimary:   '#ffffff',
    textSecondary: 'rgba(255,255,255,0.55)',
    textTertiary:  'rgba(255,255,255,0.5)',
    iconInactive:  'rgba(255,255,255,0.4)',
    iconActive:    '#e8522a',
    success:       '#1a8a3a',
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
