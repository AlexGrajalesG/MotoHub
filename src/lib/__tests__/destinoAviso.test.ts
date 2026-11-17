import { destinoAviso, type AvisoAbrible } from '../destinoAvisoTexto';

const base: AvisoAbrible = { tipo: 'cita_estado', cita_id: null, conversacion_id: null };

describe('destinoAviso', () => {
  it('un mensaje de chat abre esa conversación', () => {
    expect(destinoAviso({ ...base, tipo: 'mensaje_chat', conversacion_id: 'c1' })).toEqual({
      tipo: 'ruta', nombre: 'Mensajes', params: { screen: 'ChatConversacion', params: { conversacionId: 'c1' } },
    });
  });

  it('una solicitud de chat abre la conversación igual que un mensaje', () => {
    expect(destinoAviso({ ...base, tipo: 'solicitud_chat', conversacion_id: 'c2' })).toMatchObject({ nombre: 'Mensajes' });
  });

  it('un mensaje de chat sin conversación cae en el negocio, no en una pantalla rota', () => {
    expect(destinoAviso({ ...base, tipo: 'mensaje_chat' })).toEqual({ tipo: 'negocio', luego: 'citas' });
  });

  it('el estado de una cita lleva a Mis citas', () => {
    expect(destinoAviso(base)).toEqual({ tipo: 'ruta', nombre: 'Servicios', params: { screen: 'MisCitas' } });
  });

  it('un registro de servicio nuevo abre el chat de esa cita', () => {
    expect(destinoAviso({ ...base, tipo: 'registro_servicio_nuevo', cita_id: 'x' })).toEqual({
      tipo: 'ruta', nombre: 'Servicios', params: { screen: 'ChatCita', params: { citaId: 'x' } },
    });
  });

  it('un registro de servicio resuelto abre el chat de la cita', () => {
    expect(destinoAviso({ ...base, tipo: 'registro_servicio_resuelto', cita_id: 'x' })).toEqual({
      tipo: 'ruta', nombre: 'ChatCita', params: { citaId: 'x' },
    });
  });

  it('las invitaciones llevan a donde se responden', () => {
    expect(destinoAviso({ ...base, tipo: 'invitacion_equipo' })).toMatchObject({ nombre: 'Perfil' });
    expect(destinoAviso({ ...base, tipo: 'invitacion_respuesta' })).toEqual({ tipo: 'negocio', luego: 'equipo' });
  });

  it('una cita nueva lleva a las citas del negocio', () => {
    expect(destinoAviso({ ...base, tipo: 'cita_nueva' })).toEqual({ tipo: 'negocio', luego: 'citas' });
  });
});
