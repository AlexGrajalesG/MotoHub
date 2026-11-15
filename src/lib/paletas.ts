/** Paletas de color de la app. Lógica pura, sin React ni almacenamiento. */

export type NombreTema = 'rodix' | 'oscuro' | 'claro';

export const TEMAS: readonly NombreTema[] = ['rodix', 'oscuro', 'claro'];

export const TEMA_POR_DEFECTO: NombreTema = 'rodix';

export type Colores = {
  accent: string;
  accentSoft: string;
  accentDark: string;
  onAccent: string;
  bgPrimary: string;
  bgCard: string;
  bgSurface: string;
  bgElevated: string;
  bgLight: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  iconInactive: string;
  iconActive: string;
  success: string;
  danger: string;
  dangerAction: string;
  dangerActionBg: string;
  dangerActionBorder: string;
  /** Capas translúcidas sobre el fondo: de más sutil a más marcada. */
  veloSutil: string;
  veloLeve: string;
  velo: string;
  /** Tinte del verde de marca para fondos de énfasis y bordes suaves. */
  accentTenue: string;
  accentTinte: string;
  accentBorde: string;
  /** Texto e iconos blancos fijos (sobre fotos o fondos oscuros siempre). */
  blancoFijo: string;
  /** Fondo oscuro translúcido sobre fotos. */
  sombra: string;
  sombraFuerte: string;
  /** Aviso/advertencia. */
  aviso: string;
  /** Estilo de la barra de estado que contrasta con bgPrimary. */
  barraEstado: 'light' | 'dark';
};

// Paleta de marca (paquete de marca 2026-09-20): #020202, #3e4140, #48975a, #133210.
const rodix: Colores = {
  accent: '#48975a',
  accentSoft: '#a3d1ae',
  accentDark: '#133210',
  onAccent: '#020202',
  bgPrimary: '#020202',
  bgCard: '#0f1110',
  bgSurface: '#3e4140',
  bgElevated: '#1c1f1e',
  bgLight: '#f4f4f2',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.55)',
  textTertiary: 'rgba(255,255,255,0.5)',
  iconInactive: 'rgba(255,255,255,0.4)',
  iconActive: '#48975a',
  success: '#2fa89b',
  danger: '#c0392b',
  dangerAction: '#ff453a',
  dangerActionBg: 'rgba(255,69,58,0.25)',
  dangerActionBorder: 'rgba(255,69,58,0.35)',
  veloSutil: 'rgba(255,255,255,0.05)',
  veloLeve: 'rgba(255,255,255,0.08)',
  velo: 'rgba(255,255,255,0.1)',
  accentTenue: 'rgba(72,151,90,0.12)',
  accentTinte: 'rgba(72,151,90,0.2)',
  accentBorde: 'rgba(72,151,90,0.35)',
  blancoFijo: '#ffffff',
  sombra: 'rgba(0,0,0,0.6)',
  sombraFuerte: 'rgba(0,0,0,0.7)',
  aviso: '#f5a623',
  barraEstado: 'light',
};

// Oscuro neutro: grises sin tinte verde, el verde queda solo como acento.
const oscuro: Colores = {
  ...rodix,
  accent: '#5fb374',
  accentSoft: '#a8d8b4',
  accentDark: '#1f3d26',
  bgPrimary: '#121212',
  bgCard: '#1c1c1e',
  bgSurface: '#3a3a3c',
  bgElevated: '#2c2c2e',
  iconActive: '#5fb374',
  accentTenue: 'rgba(95,179,116,0.14)',
  accentTinte: 'rgba(95,179,116,0.22)',
  accentBorde: 'rgba(95,179,116,0.38)',
};

// Claro: verde más profundo para que el texto del acento llegue a 4.5:1 sobre blanco.
const claro: Colores = {
  ...rodix,
  accent: '#2f7a42',
  accentSoft: '#2f7a42',
  accentDark: '#e3f1e6',
  onAccent: '#ffffff',
  bgPrimary: '#f4f4f2',
  bgCard: '#ffffff',
  bgSurface: '#dcdcd8',
  bgElevated: '#ebebe8',
  textPrimary: '#111412',
  textSecondary: 'rgba(17,20,18,0.66)',
  textTertiary: 'rgba(17,20,18,0.64)',
  iconInactive: 'rgba(17,20,18,0.42)',
  iconActive: '#2f7a42',
  success: '#1c7f74',
  dangerAction: '#c4271b',
  dangerActionBg: 'rgba(196,39,27,0.12)',
  dangerActionBorder: 'rgba(196,39,27,0.3)',
  veloSutil: 'rgba(17,20,18,0.04)',
  veloLeve: 'rgba(17,20,18,0.06)',
  velo: 'rgba(17,20,18,0.08)',
  accentTenue: 'rgba(47,122,66,0.1)',
  accentTinte: 'rgba(47,122,66,0.16)',
  accentBorde: 'rgba(47,122,66,0.35)',
  sombra: 'rgba(0,0,0,0.5)',
  sombraFuerte: 'rgba(0,0,0,0.65)',
  aviso: '#b36b00',
  barraEstado: 'dark',
};

export const PALETAS: Record<NombreTema, Colores> = { rodix, oscuro, claro };

export const ETIQUETA_TEMA: Record<NombreTema, { titulo: string; detalle: string }> = {
  rodix: { titulo: 'Rodix', detalle: 'Negro y verde de la marca' },
  oscuro: { titulo: 'Oscuro', detalle: 'Grises neutros, más descansado' },
  claro: { titulo: 'Claro', detalle: 'Fondo claro para usar de día' },
};

export function esTemaValido(valor: unknown): valor is NombreTema {
  return typeof valor === 'string' && (TEMAS as readonly string[]).includes(valor);
}

/** Devuelve el tema guardado si es válido; si no, el de la marca. */
export function temaDesdeGuardado(valor: string | null | undefined): NombreTema {
  return esTemaValido(valor) ? valor : TEMA_POR_DEFECTO;
}
