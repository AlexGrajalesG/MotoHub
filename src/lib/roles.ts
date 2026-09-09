export type RolCita = 'propietario' | 'negocio' | 'mecanico';

type ParamsRolChat = {
  usuarioIdCita: string;
  miUsuarioId: string | null | undefined;
  negocioPropietarioId: string | null | undefined;
  esMecanicoActivoDelNegocio: boolean;
};

/**
 * Rol de quien abre el chat de una cita. Prioridad: ser el cliente de ESTA
 * cita especifica gana sobre ser dueno del negocio o mecanico del mismo,
 * para cubrir el caso de un dueno de negocio que tambien pide una cita en
 * su propio taller (o cualquier cuenta que juegue varios roles a la vez).
 */
export function determinarRolEnChatCita(p: ParamsRolChat): RolCita {
  if (p.usuarioIdCita === p.miUsuarioId) return 'propietario';
  if (p.negocioPropietarioId && p.negocioPropietarioId === p.miUsuarioId) return 'negocio';
  if (p.esMecanicoActivoDelNegocio) return 'mecanico';
  return 'propietario';
}

type ParamsRolCalificar = {
  usuarioIdCita: string;
  miUsuarioId: string | null | undefined;
  negocioPropietarioId: string | null | undefined;
  mecanicoAsignadoUsuarioId: string | null | undefined;
};

/**
 * Rol de quien califica una cita. A diferencia del chat, el mecanico debe
 * ser el especificamente ASIGNADO a esa cita (citas.mecanico_id), no
 * cualquier mecanico activo del negocio -- asi lo exige la policy de RLS
 * de insert en `calificaciones`.
 */
export function determinarRolParaCalificar(p: ParamsRolCalificar): RolCita {
  if (p.usuarioIdCita === p.miUsuarioId) return 'propietario';
  if (p.negocioPropietarioId && p.negocioPropietarioId === p.miUsuarioId) return 'negocio';
  if (p.mecanicoAsignadoUsuarioId && p.mecanicoAsignadoUsuarioId === p.miUsuarioId) return 'mecanico';
  return 'propietario';
}
