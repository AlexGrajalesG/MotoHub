import { mensajeErrorAuth, mensajeError, esErrorDeRed } from '../errores';

describe('mensajeErrorAuth', () => {
  it('credenciales incorrectas', () => {
    const r = mensajeErrorAuth({ message: 'Invalid login credentials' });
    expect(r.mensaje).toMatch(/correo o la contraseña/);
    expect(r.correoSinConfirmar).toBeUndefined();
  });

  it('correo sin confirmar ofrece reenviar', () => {
    const r = mensajeErrorAuth({ message: 'Email not confirmed' });
    expect(r.correoSinConfirmar).toBe(true);
    expect(r.mensaje).toMatch(/confirmar tu correo/);
  });

  it('cuenta existente lleva a iniciar sesion', () => {
    const r = mensajeErrorAuth({ message: 'User already registered' });
    expect(r.cuentaExistente).toBe(true);
  });

  it('contraseña corta o igual a la actual', () => {
    expect(mensajeErrorAuth({ message: 'Password should be at least 6 characters' }).mensaje).toMatch(/muy corta/);
    expect(mensajeErrorAuth({ message: 'New password should be different from the old password.' }).mensaje).toMatch(/distinta de la actual/);
  });

  it('limite de intentos', () => {
    expect(mensajeErrorAuth({ message: 'email rate limit exceeded' }).mensaje).toMatch(/Espera un minuto/);
    expect(mensajeErrorAuth({ status: 429, message: '' }).mensaje).toMatch(/Espera un minuto/);
  });

  it('sin conexion se reconoce en varias formas', () => {
    for (const m of ['Network request failed', 'Failed to fetch', 'network error', 'Request timed out']) {
      expect(esErrorDeRed({ message: m })).toBe(true);
      expect(mensajeErrorAuth({ message: m }).mensaje).toMatch(/No hay conexión/);
    }
  });

  it('un error desconocido no filtra el mensaje tecnico', () => {
    const r = mensajeErrorAuth({ message: 'duplicate key value violates unique constraint "x_pkey"' });
    expect(r.mensaje).toBe('Algo salió mal. Intenta de nuevo en un momento.');
    expect(r.mensaje).not.toMatch(/duplicate/);
  });

  it('tolera valores raros', () => {
    expect(mensajeErrorAuth(null).mensaje).toMatch(/Algo salió mal/);
    expect(mensajeErrorAuth('Network request failed').mensaje).toMatch(/No hay conexión/);
  });
});

describe('mensajeError', () => {
  it('distingue red de otros fallos', () => {
    expect(mensajeError({ message: 'Network request failed' })).toMatch(/No hay conexión/);
    expect(mensajeError({ message: 'permission denied' })).toMatch(/No se pudo completar/);
  });
});
