import { citaCerrada, validarKm, clasificarErrorCierre, separarAnexos, tituloCierre, avisoChatCerrado } from '../cierreCitaTexto';

describe('citaCerrada', () => {
  it('solo completada y cancelada están cerradas', () => {
    expect(citaCerrada('completada')).toBe(true);
    expect(citaCerrada('cancelada')).toBe(true);
    expect(citaCerrada('pendiente')).toBe(false);
    expect(citaCerrada('confirmada')).toBe(false);
    expect(citaCerrada(undefined)).toBe(false);
  });
});

describe('validarKm', () => {
  it('exige kilometraje', () => {
    expect(validarKm(null, 1000, true)).toMatch(/obligatorio/);
    expect(validarKm(0, 1000, true)).toMatch(/obligatorio/);
  });
  it('no deja bajar del último km si el servicio es de hoy', () => {
    expect(validarKm(900, 1000, true)).toMatch(/menor/);
    expect(validarKm(1000, 1000, true)).toBeUndefined();
    expect(validarKm(1500, 1000, true)).toBeUndefined();
  });
  it('acepta un km menor si el servicio es de una fecha pasada', () => {
    expect(validarKm(900, 1000, false)).toBeUndefined();
  });
  it('acepta cuando el vehículo no tiene km previo', () => {
    expect(validarKm(500, null, true)).toBeUndefined();
  });
});

describe('clasificarErrorCierre', () => {
  it('detecta km obligatorio', () => {
    expect(clasificarErrorCierre('KM_OBLIGATORIO: registra...').falta).toBe('km');
  });
  it('detecta cita cerrada', () => {
    expect(clasificarErrorCierre('CITA_CERRADA: una cita...').falta).toBe('cerrada');
  });
  it('cualquier otro error es genérico', () => {
    expect(clasificarErrorCierre('network error').falta).toBe('otro');
  });
});

describe('separarAnexos', () => {
  it('separa fotos de documentos y quita repetidos', () => {
    const r = separarAnexos([
      { url: 'a.jpg', tipo: 'foto' },
      { url: 'a.jpg', tipo: 'foto' },
      { url: 'f.pdf', tipo: 'factura' },
      { url: '', tipo: 'foto' },
    ]);
    expect(r.fotos).toEqual(['a.jpg']);
    expect(r.documentos).toEqual([{ url: 'f.pdf', tipo: 'factura' }]);
  });
  it('tolera null', () => {
    expect(separarAnexos(null)).toEqual({ fotos: [], documentos: [] });
  });
});

describe('textos de cierre', () => {
  it('distingue completada de cancelada', () => {
    expect(tituloCierre('completada')).toBe('Servicio finalizado');
    expect(tituloCierre('cancelada')).toBe('Cita cancelada');
    expect(avisoChatCerrado('completada')).toMatch(/resumen/);
    expect(avisoChatCerrado('cancelada')).toMatch(/cancelada/);
  });
});
