export type TipoVehiculo = 'moto' | 'carro';

/** Los vehículos del Garage usan singular ('moto'/'carro'); atiende/compatible_con/aplica_a usan plural. */
export function tipoVehiculoPlural(tipo: TipoVehiculo): 'motos' | 'carros' {
  return tipo === 'moto' ? 'motos' : 'carros';
}

/** Un arreglo vacío se trata como "sin restricción" (no debería pasar desde la app, pero no hay que esconder el item por eso). */
export function coincideVehiculo(valores: string[] | null | undefined, tipo: TipoVehiculo | null): boolean {
  if (!tipo) return true;
  if (!valores || valores.length === 0) return true;
  return valores.includes(tipoVehiculoPlural(tipo));
}
