import { formatCOP, formatPrecioServicio } from '../precio';

describe('formatCOP', () => {
  it('formatea numeros con separador de miles al estilo colombiano', () => {
    expect(formatCOP(85000)).toBe('$85.000');
  });

  it('formatea cero', () => {
    expect(formatCOP(0)).toBe('$0');
  });

  it('formatea numeros grandes', () => {
    expect(formatCOP(1500000)).toBe('$1.500.000');
  });
});

describe('formatPrecioServicio', () => {
  it('muestra "A cotizar" cuando el tipo de precio es cotizar', () => {
    const texto = formatPrecioServicio({ tipo_precio: 'cotizar', precio_base: null });
    expect(texto).toBe('A cotizar');
  });

  it('muestra "A cotizar" si no hay precio_base aunque el tipo no sea cotizar', () => {
    const texto = formatPrecioServicio({ tipo_precio: 'fijo', precio_base: null });
    expect(texto).toBe('A cotizar');
  });

  it('muestra el precio fijo formateado', () => {
    const texto = formatPrecioServicio({ tipo_precio: 'fijo', precio_base: 50000 });
    expect(texto).toBe('$50.000');
  });

  it('antepone "Desde" cuando el tipo de precio es desde', () => {
    const texto = formatPrecioServicio({ tipo_precio: 'desde', precio_base: 30000 });
    expect(texto).toBe('Desde $30.000');
  });
});
