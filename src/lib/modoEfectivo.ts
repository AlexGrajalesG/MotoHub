export type ModoEfectivo = 'cliente' | 'taller' | 'mecanico';

type Entrada = {
  tieneNegocio: boolean;
  modoTaller: boolean;
  esMecanico: boolean;
  modoMecanico: boolean;
  esNegocioPuro: boolean;
};

/** Lado en el que el usuario está usando la app ahora mismo. */
export function modoEfectivo(e: Entrada): ModoEfectivo {
  // Cuenta de negocio independiente: siempre Taller, no hay "modo personal" al que volver.
  if (e.esNegocioPuro) return 'taller';
  if (e.tieneNegocio && e.modoTaller) return 'taller';
  if (e.esMecanico && e.modoMecanico) return 'mecanico';
  return 'cliente';
}
