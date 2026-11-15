import { PASOS_TUTORIAL, claveTutorial, debeMostrarTutorial, limitarPaso, textoBotonTutorial, VALOR_VISTO } from '../tutorialTexto';
import { modoEfectivo, type ModoEfectivo } from '../modoEfectivo';

const MODOS: ModoEfectivo[] = ['cliente', 'taller', 'mecanico'];
const GUION_LARGO = String.fromCharCode(0x2014);

describe('PASOS_TUTORIAL', () => {
  it.each(MODOS)('%s: tiene entre 3 y 6 pasos con título y texto', modo => {
    const pasos = PASOS_TUTORIAL[modo];
    expect(pasos.length).toBeGreaterThanOrEqual(3);
    expect(pasos.length).toBeLessThanOrEqual(6);
    for (const p of pasos) {
      expect(p.titulo.trim().length).toBeGreaterThan(0);
      expect(p.texto.trim().length).toBeGreaterThan(20);
    }
  });

  it.each(MODOS)('%s: los títulos no se repiten y no usan guiones largos', modo => {
    const titulos = PASOS_TUTORIAL[modo].map(p => p.titulo);
    expect(new Set(titulos).size).toBe(titulos.length);
    for (const p of PASOS_TUTORIAL[modo]) expect(`${p.titulo} ${p.texto}`).not.toContain(GUION_LARGO);
  });

  it('cada modo explica el cierre del servicio', () => {
    expect(PASOS_TUTORIAL.cliente.some(p => /resumen/i.test(p.texto))).toBe(true);
    expect(PASOS_TUTORIAL.taller.some(p => /kilometraje obligatorio/i.test(p.texto))).toBe(true);
    expect(PASOS_TUTORIAL.mecanico.some(p => /kilometraje \(obligatorio\)/i.test(p.texto))).toBe(true);
  });
});

describe('claveTutorial', () => {
  it('es distinta por usuario y por modo', () => {
    expect(claveTutorial('u1', 'cliente')).not.toBe(claveTutorial('u2', 'cliente'));
    expect(claveTutorial('u1', 'cliente')).not.toBe(claveTutorial('u1', 'taller'));
  });
  it('solo contiene caracteres que acepta SecureStore', () => {
    expect(claveTutorial('3f2a-91bc/..:x y', 'taller')).toMatch(/^[A-Za-z0-9._-]+$/);
  });
});

describe('debeMostrarTutorial', () => {
  it('muestra si no hay nada guardado o el valor es desconocido', () => {
    expect(debeMostrarTutorial(null)).toBe(true);
    expect(debeMostrarTutorial(undefined)).toBe(true);
    expect(debeMostrarTutorial('otra cosa')).toBe(true);
  });
  it('no muestra si ya se vio', () => {
    expect(debeMostrarTutorial(VALOR_VISTO)).toBe(false);
  });
});

describe('navegación del tutorial', () => {
  it('el último paso dice Empezar y los demás Siguiente', () => {
    expect(textoBotonTutorial(0, 3)).toBe('Siguiente');
    expect(textoBotonTutorial(1, 3)).toBe('Siguiente');
    expect(textoBotonTutorial(2, 3)).toBe('Empezar');
  });
  it('limita el índice al rango válido', () => {
    expect(limitarPaso(-2, 4)).toBe(0);
    expect(limitarPaso(9, 4)).toBe(3);
    expect(limitarPaso(2, 4)).toBe(2);
    expect(limitarPaso(1, 0)).toBe(0);
  });
});

describe('modoEfectivo', () => {
  const base = { tieneNegocio: false, modoTaller: false, esMecanico: false, modoMecanico: false, esNegocioPuro: false };
  it('cliente por defecto', () => expect(modoEfectivo(base)).toBe('cliente'));
  it('taller si tiene negocio y activó el modo', () =>
    expect(modoEfectivo({ ...base, tieneNegocio: true, modoTaller: true })).toBe('taller'));
  it('taller siempre para cuenta de negocio independiente', () =>
    expect(modoEfectivo({ ...base, esNegocioPuro: true })).toBe('taller'));
  it('mecánico si lo es y activó el modo', () =>
    expect(modoEfectivo({ ...base, esMecanico: true, modoMecanico: true })).toBe('mecanico'));
  it('no entra a taller si tiene negocio pero no activó el modo', () =>
    expect(modoEfectivo({ ...base, tieneNegocio: true })).toBe('cliente'));
});
