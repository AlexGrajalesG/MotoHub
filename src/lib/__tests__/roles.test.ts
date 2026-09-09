import { determinarRolEnChatCita, determinarRolParaCalificar } from '../roles';

describe('determinarRolEnChatCita', () => {
  it('identifica al cliente cuando el usuario pidio la cita', () => {
    const rol = determinarRolEnChatCita({
      usuarioIdCita: 'user-1',
      miUsuarioId: 'user-1',
      negocioPropietarioId: 'user-2',
      esMecanicoActivoDelNegocio: false,
    });
    expect(rol).toBe('propietario');
  });

  it('identifica al negocio cuando el usuario es el dueno', () => {
    const rol = determinarRolEnChatCita({
      usuarioIdCita: 'user-1',
      miUsuarioId: 'user-2',
      negocioPropietarioId: 'user-2',
      esMecanicoActivoDelNegocio: false,
    });
    expect(rol).toBe('negocio');
  });

  it('identifica al mecanico cuando esta activo en el negocio y no es ni cliente ni dueno', () => {
    const rol = determinarRolEnChatCita({
      usuarioIdCita: 'user-1',
      miUsuarioId: 'user-3',
      negocioPropietarioId: 'user-2',
      esMecanicoActivoDelNegocio: true,
    });
    expect(rol).toBe('mecanico');
  });

  // Bug real encontrado en prueba en dispositivo 2026-09-09: una cuenta que
  // es dueno del negocio Y pidio la cita (self-servicio en su propio taller,
  // o una sola cuenta usada para probar ambos lados) quedaba siempre
  // etiquetada como 'negocio', nunca como 'propietario'.
  it('prioriza ser el cliente de ESTA cita sobre ser dueno del negocio (self-servicio)', () => {
    const rol = determinarRolEnChatCita({
      usuarioIdCita: 'user-1',
      miUsuarioId: 'user-1',
      negocioPropietarioId: 'user-1',
      esMecanicoActivoDelNegocio: false,
    });
    expect(rol).toBe('propietario');
  });

  it('prioriza ser el cliente sobre ser mecanico activo del mismo negocio', () => {
    const rol = determinarRolEnChatCita({
      usuarioIdCita: 'user-1',
      miUsuarioId: 'user-1',
      negocioPropietarioId: 'user-2',
      esMecanicoActivoDelNegocio: true,
    });
    expect(rol).toBe('propietario');
  });

  it('cae a propietario si no es cliente, ni dueno, ni mecanico activo (caso raro/inconsistente)', () => {
    const rol = determinarRolEnChatCita({
      usuarioIdCita: 'user-1',
      miUsuarioId: 'user-99',
      negocioPropietarioId: 'user-2',
      esMecanicoActivoDelNegocio: false,
    });
    expect(rol).toBe('propietario');
  });
});

describe('determinarRolParaCalificar', () => {
  it('identifica al cliente cuando el usuario pidio la cita', () => {
    const rol = determinarRolParaCalificar({
      usuarioIdCita: 'user-1',
      miUsuarioId: 'user-1',
      negocioPropietarioId: 'user-2',
      mecanicoAsignadoUsuarioId: 'user-3',
    });
    expect(rol).toBe('propietario');
  });

  it('identifica al negocio cuando el usuario es el dueno', () => {
    const rol = determinarRolParaCalificar({
      usuarioIdCita: 'user-1',
      miUsuarioId: 'user-2',
      negocioPropietarioId: 'user-2',
      mecanicoAsignadoUsuarioId: 'user-3',
    });
    expect(rol).toBe('negocio');
  });

  it('identifica al mecanico solo si es el especificamente asignado a esa cita', () => {
    const rol = determinarRolParaCalificar({
      usuarioIdCita: 'user-1',
      miUsuarioId: 'user-3',
      negocioPropietarioId: 'user-2',
      mecanicoAsignadoUsuarioId: 'user-3',
    });
    expect(rol).toBe('mecanico');
  });

  it('NO identifica como mecanico a alguien que no es el asignado a esta cita especifica', () => {
    const rol = determinarRolParaCalificar({
      usuarioIdCita: 'user-1',
      miUsuarioId: 'user-4',
      negocioPropietarioId: 'user-2',
      mecanicoAsignadoUsuarioId: 'user-3',
    });
    expect(rol).toBe('propietario');
  });

  // Mismo bug que en el chat: self-servicio en el propio taller debe seguir
  // tratando a la cuenta como cliente de esa cita especifica.
  it('prioriza ser el cliente de ESTA cita sobre ser dueno del negocio', () => {
    const rol = determinarRolParaCalificar({
      usuarioIdCita: 'user-1',
      miUsuarioId: 'user-1',
      negocioPropietarioId: 'user-1',
      mecanicoAsignadoUsuarioId: null,
    });
    expect(rol).toBe('propietario');
  });
});
