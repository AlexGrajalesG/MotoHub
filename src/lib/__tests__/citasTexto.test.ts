import { pasosCita } from '../citasTexto';

describe('pasosCita', () => {
  it('pendiente: el primer paso es el actual, el resto pendiente', () => {
    const pasos = pasosCita('pendiente');
    expect(pasos.map(p => p.estado)).toEqual(['actual', 'pendiente', 'pendiente']);
    expect(pasos.map(p => p.label)).toEqual(['Pendiente', 'Confirmada', 'Completada']);
  });

  it('confirmada: el primero ya paso, el segundo es el actual', () => {
    const pasos = pasosCita('confirmada');
    expect(pasos.map(p => p.estado)).toEqual(['hecho', 'actual', 'pendiente']);
  });

  it('completada es terminal: los tres pasos quedan hechos, ninguno "en curso"', () => {
    const pasos = pasosCita('completada');
    expect(pasos.map(p => p.estado)).toEqual(['hecho', 'hecho', 'hecho']);
  });

  it('cancelada no es un paso mas, es un camino aparte: lista vacia', () => {
    expect(pasosCita('cancelada')).toEqual([]);
  });
});
