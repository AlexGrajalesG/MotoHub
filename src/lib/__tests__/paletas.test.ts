import { PALETAS, TEMAS, TEMA_POR_DEFECTO, esTemaValido, temaDesdeGuardado, type NombreTema } from '../paletas';
import { aplicarTema, obtenerTemaActual, tokens } from '../tokens';
import { estilosTema } from '../estilosTema';

type Rgb = [number, number, number, number];

function aRgb(color: string): Rgb {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(color.replace(/\s/g, ''));
  if (!m) throw new Error(`Color no soportado: ${color}`);
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
}

/** Mezcla un color con transparencia sobre un fondo opaco. */
function sobreFondo(color: string, fondo: string): [number, number, number] {
  const [r, g, b, a] = aRgb(color);
  const [fr, fg, fb] = aRgb(fondo);
  return [r * a + fr * (1 - a), g * a + fg * (1 - a), b * a + fb * (1 - a)];
}

function luminancia([r, g, b]: [number, number, number]): number {
  const [R, G, B] = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contraste(texto: string, fondo: string): number {
  const a = luminancia(sobreFondo(texto, fondo));
  const b = luminancia(sobreFondo(fondo, '#ffffff'));
  const [claro, oscuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (oscuro + 0.05);
}

describe('paletas', () => {
  it('los tres temas definen exactamente las mismas claves', () => {
    const base = Object.keys(PALETAS.rodix).sort();
    for (const tema of TEMAS) expect(Object.keys(PALETAS[tema]).sort()).toEqual(base);
  });

  it('el tema por defecto es el de la marca', () => {
    expect(TEMA_POR_DEFECTO).toBe('rodix');
    expect(PALETAS.rodix.bgPrimary).toBe('#020202');
    expect(PALETAS.rodix.accent).toBe('#48975a');
  });

  it.each(TEMAS)('%s: el texto principal se lee sobre fondo y tarjeta (mínimo 7:1)', tema => {
    const p = PALETAS[tema];
    expect(contraste(p.textPrimary, p.bgPrimary)).toBeGreaterThanOrEqual(7);
    expect(contraste(p.textPrimary, p.bgCard)).toBeGreaterThanOrEqual(7);
  });

  it.each(TEMAS)('%s: texto secundario y terciario cumplen 4.5:1 sobre fondo y tarjeta', tema => {
    const p = PALETAS[tema];
    for (const fondo of [p.bgPrimary, p.bgCard]) {
      expect(contraste(p.textSecondary, fondo)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.textTertiary, fondo)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(TEMAS)('%s: el acento se lee como texto sobre fondo y tarjeta, y el texto sobre el acento también', tema => {
    const p = PALETAS[tema];
    expect(contraste(p.accent, p.bgPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(p.accent, p.bgCard)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEMAS)('%s: la acción destructiva se lee sobre el fondo', tema => {
    const p = PALETAS[tema];
    expect(contraste(p.dangerAction, p.bgPrimary)).toBeGreaterThanOrEqual(4.5);
  });

  it('la barra de estado contrasta con el fondo de cada tema', () => {
    expect(PALETAS.rodix.barraEstado).toBe('light');
    expect(PALETAS.oscuro.barraEstado).toBe('light');
    expect(PALETAS.claro.barraEstado).toBe('dark');
  });
});

describe('tema guardado', () => {
  it('reconoce solo los nombres válidos', () => {
    expect(esTemaValido('claro')).toBe(true);
    expect(esTemaValido('azul')).toBe(false);
    expect(esTemaValido(null)).toBe(false);
  });

  it('cae al tema de la marca si el valor guardado es inválido o falta', () => {
    expect(temaDesdeGuardado('oscuro')).toBe('oscuro');
    expect(temaDesdeGuardado('basura')).toBe('rodix');
    expect(temaDesdeGuardado(null)).toBe('rodix');
    expect(temaDesdeGuardado(undefined)).toBe('rodix');
  });
});

describe('aplicarTema y estilosTema', () => {
  afterEach(() => aplicarTema('rodix'));

  it('actualiza en el sitio el objeto de colores compartido', () => {
    const { colors } = tokens;
    aplicarTema('claro');
    expect(obtenerTemaActual()).toBe('claro');
    expect(colors.bgPrimary).toBe(PALETAS.claro.bgPrimary);
    aplicarTema('oscuro');
    expect(colors.bgPrimary).toBe(PALETAS.oscuro.bgPrimary);
  });

  it('los estilos se recalculan al cambiar de tema sin recrear la hoja', () => {
    const { colors } = tokens;
    const hoja = estilosTema(() => ({ caja: { backgroundColor: colors.bgPrimary, padding: 8 } }));
    const fondos: Record<NombreTema, string> = { rodix: '', oscuro: '', claro: '' };
    for (const tema of TEMAS) {
      aplicarTema(tema);
      fondos[tema] = hoja.caja.backgroundColor;
    }
    expect(fondos.rodix).toBe(PALETAS.rodix.bgPrimary);
    expect(fondos.oscuro).toBe(PALETAS.oscuro.bgPrimary);
    expect(fondos.claro).toBe(PALETAS.claro.bgPrimary);
    expect(hoja.caja.padding).toBe(8);
  });

  it('guarda el resultado por tema y no ejecuta la fábrica de nuevo', () => {
    const fabrica = jest.fn(() => ({ a: { margin: 1 } }));
    const hoja = estilosTema(fabrica);
    aplicarTema('claro');
    void hoja.a; void hoja.a;
    aplicarTema('oscuro');
    void hoja.a;
    aplicarTema('claro');
    void hoja.a;
    expect(fabrica).toHaveBeenCalledTimes(2);
  });

  it('funciona en arreglos de estilo y con spread', () => {
    const hoja = estilosTema(() => ({ a: { margin: 1 }, b: { padding: 2 } }));
    expect([hoja.a, false && hoja.b]).toEqual([{ margin: 1 }, false]);
    expect({ ...hoja.b, color: 'x' }).toEqual({ padding: 2, color: 'x' });
    expect(Object.keys(hoja).sort()).toEqual(['a', 'b']);
  });
});
