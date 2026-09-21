import { calcularAlertas, calcularPrimerosPasos, detalleDias, detalleKm, miles } from '../inicio';

/** Fecha local YYYY-MM-DD desplazada N dias desde hoy (positivo = futuro). */
function enDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const moto = (over: Partial<Parameters<typeof calcularAlertas>[0][number]> = {}) => ({
  id: 'v1', marca: 'Yamaha', modelo: 'MT-07', kilometraje: 10200, documentos: [], ...over,
});

const rec = (over: Record<string, unknown> = {}) => ({
  id: 'r1', vehiculo_id: 'v1', tipo: 'aceite', fecha_limite: null, km_limite: null, km_aviso: null, estado: 'pendiente', ...over,
}) as Parameters<typeof calcularAlertas>[1][number];

describe('textos', () => {
  it('formatea dias', () => {
    expect(detalleDias(-3)).toBe('Venció hace 3 días');
    expect(detalleDias(-1)).toBe('Venció hace 1 día');
    expect(detalleDias(0)).toBe('Vence hoy');
    expect(detalleDias(1)).toBe('Vence mañana');
    expect(detalleDias(12)).toBe('Vence en 12 días');
  });
  it('formatea km y miles', () => {
    expect(miles(1234567)).toBe('1.234.567');
    expect(detalleKm(300)).toBe('Faltan 300 km');
    expect(detalleKm(-1500)).toBe('Te pasaste 1.500 km');
  });
});

describe('calcularAlertas', () => {
  it('no genera alertas si todo esta al dia', () => {
    const v = moto({ documentos: [{ tipo: 'soat', fecha_vencimiento: enDias(200) }] });
    expect(calcularAlertas([v], [])).toEqual([]);
  });

  it('alerta de SOAT vencido con su detalle', () => {
    const v = moto({ documentos: [{ tipo: 'soat', fecha_vencimiento: enDias(-3) }] });
    const [a] = calcularAlertas([v], []);
    expect(a.titulo).toBe('SOAT');
    expect(a.detalle).toBe('Venció hace 3 días');
    expect(a.severidad).toBe('vencido');
    expect(a.destino).toBe('documentos');
  });

  it('usa el documento mas reciente del tipo', () => {
    const v = moto({ documentos: [
      { tipo: 'soat', fecha_vencimiento: enDias(-400) },
      { tipo: 'soat', fecha_vencimiento: enDias(300) },
    ] });
    expect(calcularAlertas([v], [])).toEqual([]);
  });

  it('los vencidos van antes que los proximos', () => {
    const v = moto({ documentos: [
      { tipo: 'soat', fecha_vencimiento: enDias(5) },
      { tipo: 'tecnomecanica', fecha_vencimiento: enDias(-10) },
    ] });
    const alertas = calcularAlertas([v], []);
    expect(alertas.map(a => a.titulo)).toEqual(['Tecnomecánica', 'SOAT']);
  });

  it('un recordatorio por kilometraje avisa cuando faltan menos que su aviso', () => {
    const v = moto({ kilometraje: 10200 });
    const [a] = calcularAlertas([v], [rec({ km_limite: 10500, km_aviso: 1000 })]);
    expect(a.detalle).toBe('Faltan 300 km');
    expect(a.severidad).toBe('proximo');
    expect(a.destino).toBe('recordatorios');
  });

  it('no avisa si falta mas que el aviso configurado', () => {
    const v = moto({ kilometraje: 10200 });
    expect(calcularAlertas([v], [rec({ km_limite: 15000, km_aviso: 500 })])).toEqual([]);
  });

  it('un recordatorio de km pasado se marca vencido', () => {
    const v = moto({ kilometraje: 12000 });
    const [a] = calcularAlertas([v], [rec({ km_limite: 10500 })]);
    expect(a.severidad).toBe('vencido');
    expect(a.detalle).toBe('Te pasaste 1.500 km');
  });

  it('ignora recordatorios completados', () => {
    const v = moto({ kilometraje: 12000 });
    expect(calcularAlertas([v], [rec({ km_limite: 10500, estado: 'completado' })])).toEqual([]);
  });

  it('no duplica: el documento y su recordatorio son una sola alerta', () => {
    const v = moto({ documentos: [{ tipo: 'tecnomecanica', fecha_vencimiento: enDias(-2) }] });
    const alertas = calcularAlertas([v], [rec({ tipo: 'revision_tecnica', fecha_limite: enDias(-2) })]);
    expect(alertas).toHaveLength(1);
    expect(alertas[0].destino).toBe('documentos');
  });

  it('con fecha y km en el mismo recordatorio deja solo el mas urgente', () => {
    const v = moto({ kilometraje: 10200 });
    const alertas = calcularAlertas([v], [rec({ fecha_limite: enDias(20), km_limite: 10250 })]);
    expect(alertas).toHaveLength(1);
    expect(alertas[0].detalle).toBe('Faltan 50 km');
  });
});

describe('calcularPrimerosPasos', () => {
  it('sin nada: 0 de 3', () => {
    const r = calcularPrimerosPasos([], []);
    expect(r.hechos).toBe(0);
    expect(r.total).toBe(3);
    expect(r.completo).toBe(false);
  });

  it('con vehiculo, SOAT y recordatorio: completo', () => {
    const v = moto({ documentos: [{ tipo: 'soat', fecha_vencimiento: null }] });
    const r = calcularPrimerosPasos([v], [rec({ estado: 'completado' })]);
    expect(r.completo).toBe(true);
  });

  it('solo el vehiculo: 1 de 3 y el SOAT sigue pendiente', () => {
    const r = calcularPrimerosPasos([moto()], []);
    expect(r.hechos).toBe(1);
    expect(r.pasos.find(p => p.key === 'soat')!.hecho).toBe(false);
  });
});
