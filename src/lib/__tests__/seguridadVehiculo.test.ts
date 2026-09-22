import { formatFichaParaDenuncia, fichaCompleta, type FichaSeguridad } from '../seguridadVehiculoTexto';

const vehiculo = { marca: 'Yamaha', modelo: 'MT-07', anio: 2022, placa: 'abc12d', color: 'Negro' };
const vacia: FichaSeguridad = { numero_motor: null, numero_chasis: null, aseguradora: null, poliza_numero: null };

describe('formatFichaParaDenuncia', () => {
  it('con todos los datos', () => {
    const texto = formatFichaParaDenuncia(vehiculo, {
      numero_motor: 'ABC123', numero_chasis: 'XYZ789', aseguradora: 'Sura', poliza_numero: 'P-001',
    });
    expect(texto).toContain('Yamaha MT-07 2022');
    expect(texto).toContain('Placa: ABC12D');
    expect(texto).toContain('Color: Negro');
    expect(texto).toContain('Número de motor: ABC123');
    expect(texto).toContain('Número de chasis: XYZ789');
    expect(texto).toContain('Seguro: Sura · Póliza P-001');
  });

  it('sin datos de seguridad avisa que no estan registrados', () => {
    const texto = formatFichaParaDenuncia(vehiculo, vacia);
    expect(texto).toContain('Número de motor: No registrado');
    expect(texto).toContain('Número de chasis: No registrado');
    expect(texto).not.toContain('Seguro:');
  });

  it('sin color no agrega la linea', () => {
    const texto = formatFichaParaDenuncia({ ...vehiculo, color: null }, vacia);
    expect(texto).not.toContain('Color:');
  });

  it('con solo aseguradora, sin poliza', () => {
    const texto = formatFichaParaDenuncia(vehiculo, { ...vacia, aseguradora: 'Sura' });
    expect(texto).toContain('Seguro: Sura');
    expect(texto).not.toContain('Póliza');
  });
});

describe('fichaCompleta', () => {
  it('vacia no esta completa', () => {
    expect(fichaCompleta(vacia)).toBe(false);
  });
  it('con motor y chasis si esta completa', () => {
    expect(fichaCompleta({ ...vacia, numero_motor: 'X', numero_chasis: 'Y' })).toBe(true);
  });
  it('solo con motor no basta', () => {
    expect(fichaCompleta({ ...vacia, numero_motor: 'X' })).toBe(false);
  });
});
