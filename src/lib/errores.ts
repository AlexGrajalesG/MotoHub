/**
 * Convierte errores tecnicos (Supabase, red) en frases claras en espanol.
 * Nunca mostrar `error.message` crudo: llega en ingles y no dice que hacer.
 */

export function esErrorDeRed(error: unknown): boolean {
  const m = textoDe(error);
  return /network request failed|failed to fetch|network error|timeout|timed out|no internet|offline/.test(m);
}

export type ErrorAuth = { mensaje: string; correoSinConfirmar?: boolean; cuentaExistente?: boolean };

export function mensajeErrorAuth(error: unknown): ErrorAuth {
  const m = textoDe(error);
  if (esErrorDeRed(error)) {
    return { mensaje: 'No hay conexión. Revisa tu internet e intenta de nuevo.' };
  }
  if (m.includes('invalid login credentials')) {
    return { mensaje: 'El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.' };
  }
  if (m.includes('email not confirmed')) {
    return { mensaje: 'Todavía falta confirmar tu correo. Abre el enlace que te enviamos.', correoSinConfirmar: true };
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return { mensaje: 'Ya existe una cuenta con ese correo. Inicia sesión.', cuentaExistente: true };
  }
  if (m.includes('password should be at least') || m.includes('weak password')) {
    return { mensaje: 'La contraseña es muy corta. Usa al menos 6 caracteres.' };
  }
  if (m.includes('different from the old') || m.includes('same_password')) {
    return { mensaje: 'La nueva contraseña debe ser distinta de la actual.' };
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return { mensaje: 'Ese correo no parece válido. Revísalo.' };
  }
  if (m.includes('rate limit') || m.includes('too many') || m.includes('over_email_send_rate_limit') || m.includes('429')) {
    return { mensaje: 'Demasiados intentos seguidos. Espera un minuto e inténtalo otra vez.' };
  }
  return { mensaje: 'Algo salió mal. Intenta de nuevo en un momento.' };
}

/** Errores de guardado o carga (no de autenticacion). */
export function mensajeError(error: unknown): string {
  if (esErrorDeRed(error)) return 'No hay conexión. Revisa tu internet e intenta de nuevo.';
  return 'No se pudo completar. Intenta de nuevo en un momento.';
}

function textoDe(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error.toLowerCase();
  const e = error as { message?: string; code?: string; status?: number };
  return `${e.message ?? ''} ${e.code ?? ''} ${e.status ?? ''}`.toLowerCase();
}
