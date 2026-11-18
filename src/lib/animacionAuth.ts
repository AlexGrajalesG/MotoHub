/** Medidas y tiempos de las pantallas de entrada. Lógica pura, sin React. */

export type VarianteFondo = 'hero' | 'compacta' | 'liso';

export const DURACION_ENTRADA = 420;
export const PASO_ESCALONADO = 70;
const MAX_ESCALON = 8;

/** Alto de la barra con el botón de volver y el logo; el fondo compacto termina justo debajo. */
export const ALTO_CABECERA_COMPACTA = 108;

const HERO_MIN = 250;
const HERO_MAX = 340;
const HERO_FRACCION = 0.34;

/** Retraso de entrada del elemento n de una pantalla: sube de a poco y se detiene en un tope. */
export function retrasoEscalonado(indice: number): number {
  const i = Math.max(0, Math.min(Math.floor(indice) || 0, MAX_ESCALON));
  return i * PASO_ESCALONADO;
}

export function alturaHero(variante: VarianteFondo, altoPantalla: number): number {
  if (variante === 'liso') return 0;
  if (variante === 'compacta') return ALTO_CABECERA_COMPACTA;
  return Math.round(Math.min(HERO_MAX, Math.max(HERO_MIN, altoPantalla * HERO_FRACCION)));
}

type Linea = { x1: number; y1: number; x2: number; y2: number };

export type GeometriaHero = {
  /** Banda oscura inferior. */
  asfalto: string;
  /** Bloque verde superior. */
  verde: string;
  /** Línea nítida sobre el borde inferior del asfalto. */
  borde: Linea;
  /** Línea discontinua del carril, entre el verde y el borde. */
  carril: Linea;
};

const r = (n: number) => Math.round(n * 10) / 10;

/** Puntos del hero: dos capas con la misma diagonal, que baja de izquierda a derecha. */
export function geometriaHero(ancho: number, alto: number): GeometriaHero {
  return {
    asfalto: `0,0 ${r(ancho)},0 ${r(ancho)},${r(alto * 0.58)} 0,${r(alto)}`,
    verde: `0,0 ${r(ancho)},0 ${r(ancho)},${r(alto * 0.38)} 0,${r(alto * 0.78)}`,
    borde: { x1: 0, y1: r(alto), x2: r(ancho), y2: r(alto * 0.58) },
    carril: { x1: 0, y1: r(alto * 0.89), x2: r(ancho), y2: r(alto * 0.48) },
  };
}
