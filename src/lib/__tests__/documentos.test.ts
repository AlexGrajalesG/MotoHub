import { getDocStatus } from '../documentos';

function fechaEnDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  // Construir el string en componentes locales -- toISOString() convierte a
  // UTC y puede correr la fecha un dia en timezones detras de UTC.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('getDocStatus', () => {
  it('retorna null si no hay fecha de vencimiento', () => {
    expect(getDocStatus(null)).toBeNull();
    expect(getDocStatus(undefined)).toBeNull();
  });

  it('marca como vencido si la fecha ya paso', () => {
    const status = getDocStatus(fechaEnDias(-5));
    expect(status?.estado).toBe('vencido');
    expect(status?.label).toBe('Vencido');
  });

  it('marca como proximo si vence dentro de 30 dias', () => {
    const status = getDocStatus(fechaEnDias(15));
    expect(status?.estado).toBe('proximo');
  });

  it('marca como proximo en el limite exacto de 30 dias', () => {
    const status = getDocStatus(fechaEnDias(30));
    expect(status?.estado).toBe('proximo');
  });

  it('marca como al_dia si vence en mas de 30 dias', () => {
    const status = getDocStatus(fechaEnDias(31));
    expect(status?.estado).toBe('al_dia');
    expect(status?.label).toBe('Al día');
  });

  it('marca como vencido el mismo dia del vencimiento ya pasado (ayer)', () => {
    const status = getDocStatus(fechaEnDias(-1));
    expect(status?.estado).toBe('vencido');
  });

  it('marca como proximo si vence hoy mismo', () => {
    const status = getDocStatus(fechaEnDias(0));
    expect(status?.estado).toBe('proximo');
    expect(status?.diasRestantes).toBe(0);
  });
});
