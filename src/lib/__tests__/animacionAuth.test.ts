import {
  ALTO_CABECERA_COMPACTA, PASO_ESCALONADO, alturaHero, geometriaHero, retrasoEscalonado,
} from '../animacionAuth';

describe('retrasoEscalonado', () => {
  it('el primer elemento entra de inmediato y cada uno espera un poco más', () => {
    expect(retrasoEscalonado(0)).toBe(0);
    expect(retrasoEscalonado(1)).toBe(PASO_ESCALONADO);
    expect(retrasoEscalonado(3)).toBe(3 * PASO_ESCALONADO);
  });

  it('tiene un tope para que una pantalla larga no tarde en mostrarse', () => {
    expect(retrasoEscalonado(8)).toBe(retrasoEscalonado(50));
  });

  it('un índice inválido no rompe la animación', () => {
    expect(retrasoEscalonado(-3)).toBe(0);
    expect(retrasoEscalonado(NaN)).toBe(0);
  });
});

describe('alturaHero', () => {
  it('el fondo liso no ocupa espacio y el compacto coincide con la cabecera', () => {
    expect(alturaHero('liso', 800)).toBe(0);
    expect(alturaHero('compacta', 800)).toBe(ALTO_CABECERA_COMPACTA);
  });

  it('el grande se adapta a la pantalla pero dentro de un rango', () => {
    expect(alturaHero('hero', 400)).toBe(250);
    expect(alturaHero('hero', 800)).toBe(272);
    expect(alturaHero('hero', 3000)).toBe(340);
  });
});

describe('geometriaHero', () => {
  const ancho = 400;
  const alto = 300;
  const g = geometriaHero(ancho, alto);
  const puntos = (s: string) => s.split(' ').map(p => p.split(',').map(Number));

  it('todos los puntos caen dentro del área del hero', () => {
    [...puntos(g.asfalto), ...puntos(g.verde)].forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(ancho);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(alto);
    });
  });

  it('la diagonal baja de derecha a izquierda, igual en las dos capas', () => {
    // Los puntos van: arriba izquierda, arriba derecha, abajo derecha, abajo izquierda.
    [g.asfalto, g.verde].forEach(capa => {
      const [, , abajoDerecha, abajoIzquierda] = puntos(capa);
      expect(abajoIzquierda[1]).toBeGreaterThan(abajoDerecha[1]);
    });
  });

  it('el carril queda entre el verde y el borde en ambos extremos', () => {
    const verde = puntos(g.verde);
    expect(g.carril.y1).toBeGreaterThan(verde[3][1]);
    expect(g.carril.y1).toBeLessThan(g.borde.y1);
    expect(g.carril.y2).toBeGreaterThan(verde[2][1]);
    expect(g.carril.y2).toBeLessThan(g.borde.y2);
  });
});
