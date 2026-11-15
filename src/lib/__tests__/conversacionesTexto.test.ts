import {
  estadoComposer, avisoPrimerMensaje, mensajeErrorChat, normalizarUsuario, usuarioBuscable, etiquetaRelacion,
  textoBotonSeguir, avisoEscribir, repartirChats, contarNoLeidasChats, vistaPreviaChat, subtituloChat,
  textoVacioChats, textoEsperandoRespuesta, textoSolicitudRecibida, TEXTO_RECHAZADA,
  type ConversacionBandeja,
} from '../conversacionesTexto';

function chat(extra: Partial<ConversacionBandeja> = {}): ConversacionBandeja {
  return {
    conversacion_id: 'c1', tipo: 'directa', estado: 'activa', contraparte_nombre: 'Ana', contraparte_usuario: 'ana',
    ultimo_texto: 'hola', ultimo_at: '2026-11-15T10:00:00Z', ultimo_autor_id: 'otro', no_leido: false,
    solicitud_recibida: false, orden_at: '2026-11-15T10:00:00Z', ...extra,
  };
}

describe('estadoComposer', () => {
  const base = { tipo: 'directa' as const, iniciadaPorMi: true, yaEnvieMensaje: false };

  it('una consulta a un negocio siempre permite escribir', () => {
    expect(estadoComposer({ ...base, tipo: 'consulta_negocio', estado: 'activa' })).toBe('escribir');
  });
  it('un chat directo activo permite escribir', () => {
    expect(estadoComposer({ ...base, estado: 'activa', yaEnvieMensaje: true })).toBe('escribir');
  });
  it('quien inicia una solicitud puede enviar el primer mensaje', () => {
    expect(estadoComposer({ ...base, estado: 'solicitud' })).toBe('escribir');
  });
  it('quien ya envió su único mensaje queda esperando', () => {
    expect(estadoComposer({ ...base, estado: 'solicitud', yaEnvieMensaje: true })).toBe('esperando_respuesta');
  });
  it('quien recibe la solicitud debe responderla', () => {
    expect(estadoComposer({ ...base, estado: 'solicitud', iniciadaPorMi: false, yaEnvieMensaje: false })).toBe('responder_solicitud');
  });
  it('quien inició una solicitud rechazada no puede escribir', () => {
    expect(estadoComposer({ ...base, estado: 'rechazada', yaEnvieMensaje: true })).toBe('rechazada');
  });
  it('quien rechazó puede retomar la conversación', () => {
    expect(estadoComposer({ ...base, estado: 'rechazada', iniciadaPorMi: false })).toBe('escribir');
  });
});

describe('avisoPrimerMensaje', () => {
  it('avisa del único mensaje solo al iniciar una solicitud sin mensajes', () => {
    const p = { tipo: 'directa' as const, estado: 'solicitud' as const, iniciadaPorMi: true, yaEnvieMensaje: false };
    expect(avisoPrimerMensaje(p)).toMatch(/un solo mensaje/);
    expect(avisoPrimerMensaje({ ...p, yaEnvieMensaje: true })).toBeNull();
    expect(avisoPrimerMensaje({ ...p, estado: 'activa' })).toBeNull();
    expect(avisoPrimerMensaje({ ...p, iniciadaPorMi: false })).toBeNull();
    expect(avisoPrimerMensaje({ ...p, tipo: 'consulta_negocio' })).toBeNull();
  });
});

describe('mensajeErrorChat', () => {
  it.each([
    ['SOLICITUD_PENDIENTE', /acepte tu solicitud/],
    ['SOLICITUD_RECHAZADA', /no aceptó/],
    ['BLOQUEADO', /No puedes enviar mensajes/],
    ['LIMITE_DIARIO', /límite/],
    ['MENSAJE_INVALIDO', /entre 1 y 2000/],
    ['No puedes escribirle a esta cuenta', /escribirle/],
    ['No puedes consultar tu propio negocio', /tu propio negocio/],
    ['Cuenta no disponible', /no está disponible/],
    ['Ya reportaste este mensaje', /Ya reportaste/],
    ['No autorizado', /permiso/],
  ])('traduce %s', (crudo, esperado) => {
    expect(mensajeErrorChat(crudo)).toMatch(esperado);
  });

  it('usa un mensaje genérico con salida para errores desconocidos o vacíos', () => {
    expect(mensajeErrorChat('algo raro de la base')).toMatch(/Revisa tu conexión/);
    expect(mensajeErrorChat(null)).toMatch(/Revisa tu conexión/);
    expect(mensajeErrorChat(undefined)).toMatch(/intenta de nuevo/);
  });

  it('no deja pasar texto técnico al usuario', () => {
    expect(mensajeErrorChat('PGRST116 duplicate key violates constraint')).not.toMatch(/PGRST|constraint/);
  });
});

describe('búsqueda por @usuario', () => {
  it('normaliza arroba, espacios y mayúsculas', () => {
    expect(normalizarUsuario('  @Juan.Perez ')).toBe('juan.perez');
    expect(normalizarUsuario('@@ana')).toBe('ana');
    expect(normalizarUsuario('a b c')).toBe('abc');
  });
  it('exige al menos 3 caracteres', () => {
    expect(usuarioBuscable('@ab')).toBe(false);
    expect(usuarioBuscable('@abc')).toBe(true);
    expect(usuarioBuscable('   ')).toBe(false);
  });
});

describe('relación con otra cuenta', () => {
  it('etiqueta amigos, te sigue y siguiendo', () => {
    expect(etiquetaRelacion({ yo_sigo: true, me_sigue: true, amigos: true })).toBe('Amigos');
    expect(etiquetaRelacion({ yo_sigo: false, me_sigue: true, amigos: false })).toBe('Te sigue');
    expect(etiquetaRelacion({ yo_sigo: true, me_sigue: false, amigos: false })).toBe('Siguiendo');
    expect(etiquetaRelacion({ yo_sigo: false, me_sigue: false, amigos: false })).toBeNull();
  });
  it('el botón de seguir cambia según quién sigue a quién', () => {
    expect(textoBotonSeguir({ yo_sigo: false, me_sigue: false })).toBe('Seguir');
    expect(textoBotonSeguir({ yo_sigo: false, me_sigue: true })).toBe('Seguir también');
    expect(textoBotonSeguir({ yo_sigo: true, me_sigue: false })).toBe('Siguiendo');
  });
  it('avisa de la solicitud solo cuando no son amigos ni hay chat activo', () => {
    expect(avisoEscribir({ amigos: false, conversacion_estado: null })).toMatch(/solicitud/);
    expect(avisoEscribir({ amigos: true, conversacion_estado: null })).toBeNull();
    expect(avisoEscribir({ amigos: false, conversacion_estado: 'activa' })).toBeNull();
  });
});

describe('bandeja de chats', () => {
  it('separa las solicitudes recibidas del resto', () => {
    const { solicitudes, conversaciones } = repartirChats([
      chat({ conversacion_id: 'a' }), chat({ conversacion_id: 'b', solicitud_recibida: true }),
    ]);
    expect(solicitudes.map(c => c.conversacion_id)).toEqual(['b']);
    expect(conversaciones.map(c => c.conversacion_id)).toEqual(['a']);
  });
  it('cuenta las no leídas', () => {
    expect(contarNoLeidasChats([chat({ no_leido: true }), chat(), chat({ no_leido: true })])).toBe(2);
    expect(contarNoLeidasChats([])).toBe(0);
  });
  it('vista previa: tuyo, ajeno, solicitud y vacío', () => {
    expect(vistaPreviaChat(chat({ ultimo_autor_id: 'yo' }), 'yo')).toBe('Tú: hola');
    expect(vistaPreviaChat(chat({ ultimo_autor_id: 'otro' }), 'yo')).toBe('hola');
    expect(vistaPreviaChat(chat({ solicitud_recibida: true }), 'yo')).toBe('Solicitud: hola');
    expect(vistaPreviaChat(chat({ ultimo_texto: null }), 'yo')).toBe('Sin mensajes');
  });
  it('subtítulo: @usuario o Consulta', () => {
    expect(subtituloChat({ tipo: 'directa', contraparte_usuario: 'ana' })).toBe('@ana');
    expect(subtituloChat({ tipo: 'directa', contraparte_usuario: null })).toBeNull();
    expect(subtituloChat({ tipo: 'consulta_negocio', contraparte_usuario: 'ana' })).toBe('Consulta');
  });
  it('estados vacíos distintos por lado', () => {
    expect(textoVacioChats('cliente').texto).toMatch(/@usuario/);
    expect(textoVacioChats('negocio').titulo).toMatch(/consultas/);
  });
});

describe('textos fijos', () => {
  it('incluyen el nombre y explican la consecuencia', () => {
    expect(textoEsperandoRespuesta('Ana')).toContain('Ana');
    expect(textoSolicitudRecibida('Ana')).toMatch(/Ana quiere escribirte/);
    expect(textoSolicitudRecibida('Ana')).toMatch(/rechazas/);
    expect(TEXTO_RECHAZADA.length).toBeGreaterThan(20);
  });
  it('no usan guiones largos', () => {
    const largo = String.fromCharCode(0x2014);
    const todos = [textoEsperandoRespuesta('x'), textoSolicitudRecibida('x'), TEXTO_RECHAZADA,
      ...['SOLICITUD_PENDIENTE', 'BLOQUEADO', 'LIMITE_DIARIO', 'otro'].map(mensajeErrorChat)];
    for (const t of todos) expect(t).not.toContain(largo);
  });
});
