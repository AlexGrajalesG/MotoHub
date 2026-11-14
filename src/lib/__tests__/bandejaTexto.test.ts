import {
  comoSegunModo, repartirConversaciones, contarNoLeidas, vistaPreviaUltimo, etiquetaFecha, inicialDe,
  textoVacioBandeja, type ConversacionBandeja,
} from '../bandejaTexto';

function conv(parcial: Partial<ConversacionBandeja>): ConversacionBandeja {
  return {
    cita_id: 'c1', estado: 'confirmada', contraparte_nombre: 'Taller Uno', vehiculo_texto: 'Kia Rio',
    ultimo_texto: 'Hola', ultimo_tipo: 'texto', ultimo_tiene_adjuntos: false, ultimo_at: '2026-11-12T15:00:00Z',
    ultimo_autor_id: 'otro', no_leido: false, orden_at: '2026-11-12T15:00:00Z', ...parcial,
  };
}

describe('comoSegunModo', () => {
  it('cliente ve el lado cliente; taller y mecánico el lado negocio', () => {
    expect(comoSegunModo('cliente')).toBe('cliente');
    expect(comoSegunModo('taller')).toBe('negocio');
    expect(comoSegunModo('mecanico')).toBe('negocio');
  });
});

describe('repartirConversaciones', () => {
  it('manda completadas y canceladas a cerradas y conserva el orden', () => {
    const r = repartirConversaciones([
      conv({ cita_id: 'a', estado: 'pendiente' }),
      conv({ cita_id: 'b', estado: 'completada' }),
      conv({ cita_id: 'c', estado: 'confirmada' }),
      conv({ cita_id: 'd', estado: 'cancelada' }),
    ]);
    expect(r.activas.map(x => x.cita_id)).toEqual(['a', 'c']);
    expect(r.cerradas.map(x => x.cita_id)).toEqual(['b', 'd']);
  });
});

describe('contarNoLeidas', () => {
  it('cuenta solo las no leídas', () => {
    expect(contarNoLeidas([conv({ no_leido: true }), conv({}), conv({ no_leido: true })])).toBe(2);
    expect(contarNoLeidas([])).toBe(0);
  });
});

describe('vistaPreviaUltimo', () => {
  it('antepone "Tú" a mis mensajes', () => {
    expect(vistaPreviaUltimo(conv({ ultimo_autor_id: 'yo' }), 'yo')).toBe('Tú: Hola');
    expect(vistaPreviaUltimo(conv({}), 'yo')).toBe('Hola');
  });
  it('describe registros de servicio, adjuntos y vacíos', () => {
    expect(vistaPreviaUltimo(conv({ ultimo_tipo: 'registro_servicio', ultimo_texto: null }), 'yo')).toBe('Se registró un servicio');
    expect(vistaPreviaUltimo(conv({ ultimo_texto: null, ultimo_tiene_adjuntos: true }), 'yo')).toBe('Archivo adjunto');
    expect(vistaPreviaUltimo(conv({ ultimo_texto: null, ultimo_at: null, ultimo_autor_id: null, ultimo_tipo: null }), 'yo')).toBe('Aún no hay mensajes');
  });
});

describe('etiquetaFecha', () => {
  const ahora = new Date(2026, 10, 12, 18, 0, 0);
  it('hoy muestra la hora', () => {
    expect(etiquetaFecha(new Date(2026, 10, 12, 9, 5).toISOString(), ahora)).toBe('09:05');
  });
  it('ayer', () => {
    expect(etiquetaFecha(new Date(2026, 10, 11, 20, 0).toISOString(), ahora)).toBe('Ayer');
  });
  it('mismo año sin año y otro año con año', () => {
    expect(etiquetaFecha(new Date(2026, 8, 3, 10, 0).toISOString(), ahora)).toBe('3 sep');
    expect(etiquetaFecha(new Date(2025, 8, 3, 10, 0).toISOString(), ahora)).toBe('3 sep 2025');
  });
  it('tolera null y fechas inválidas', () => {
    expect(etiquetaFecha(null, ahora)).toBe('');
    expect(etiquetaFecha('no-es-fecha', ahora)).toBe('');
  });
});

describe('inicialDe y textos vacíos', () => {
  it('inicial en mayúscula o "?"', () => {
    expect(inicialDe('taller uno')).toBe('T');
    expect(inicialDe('  ')).toBe('?');
    expect(inicialDe(null)).toBe('?');
  });
  it('mensaje vacío según pestaña y lado', () => {
    expect(textoVacioBandeja('cerradas', 'cliente')).toMatch(/finalizados/);
    expect(textoVacioBandeja('activas', 'cliente')).toMatch(/negocio/);
    expect(textoVacioBandeja('activas', 'negocio')).toMatch(/cliente/);
  });
});
