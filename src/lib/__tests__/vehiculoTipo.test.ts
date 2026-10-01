import { coincideVehiculo, tipoVehiculoPlural } from '../vehiculoTipo';

describe('tipoVehiculoPlural', () => {
  it('convierte el singular del Garage al plural de atiende/compatible_con/aplica_a', () => {
    expect(tipoVehiculoPlural('moto')).toBe('motos');
    expect(tipoVehiculoPlural('carro')).toBe('carros');
  });
});

describe('coincideVehiculo', () => {
  it('sin filtro de vehículo, todo coincide', () => {
    expect(coincideVehiculo(['motos'], null)).toBe(true);
    expect(coincideVehiculo([], null)).toBe(true);
  });

  it('un arreglo vacío no esconde el item (sin restricción real)', () => {
    expect(coincideVehiculo([], 'moto')).toBe(true);
    expect(coincideVehiculo(null, 'carro')).toBe(true);
  });

  it('filtra por el tipo correcto', () => {
    expect(coincideVehiculo(['motos'], 'moto')).toBe(true);
    expect(coincideVehiculo(['motos'], 'carro')).toBe(false);
    expect(coincideVehiculo(['motos', 'carros'], 'carro')).toBe(true);
  });
});
