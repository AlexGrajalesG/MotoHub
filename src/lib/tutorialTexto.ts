import type { ModoEfectivo } from './modoEfectivo';

/** Contenido del tutorial de primer ingreso. Lógica pura, sin React ni almacenamiento. */

export type IconoTutorial =
  | 'garage' | 'historial' | 'servicios' | 'mensajes' | 'comunidad'
  | 'taller' | 'citas' | 'registro' | 'equipo' | 'agenda' | 'cierre';

export type PasoTutorial = {
  icono: IconoTutorial;
  titulo: string;
  texto: string;
};

export const PASOS_TUTORIAL: Record<ModoEfectivo, readonly PasoTutorial[]> = {
  cliente: [
    {
      icono: 'garage',
      titulo: 'Tu garage',
      texto: 'Agrega tus vehículos y deja a mano el SOAT, la tecnomecánica y los mantenimientos. Te avisamos antes de que algo venza.',
    },
    {
      icono: 'historial',
      titulo: 'Historial de mantenimiento',
      texto: 'Cada servicio queda guardado con fecha, kilometraje, fotos y costo. Es el respaldo del cuidado de tu vehículo.',
    },
    {
      icono: 'servicios',
      titulo: 'Talleres y citas',
      texto: 'En Servicios encuentras talleres, agendas una cita y sigues su estado hasta que el servicio se termina.',
    },
    {
      icono: 'mensajes',
      titulo: 'Mensajes',
      texto: 'Cada cita tiene su chat con el taller. Al finalizar o cancelar, el chat se cierra y queda un resumen en tu historial. Todas tus conversaciones están en la pestaña Mensajes.',
    },
    {
      icono: 'comunidad',
      titulo: 'Comunidad',
      texto: 'Comparte fotos y enlaces de video con otros dueños. Puedes reportar o bloquear a quien no respete a los demás.',
    },
  ],
  taller: [
    {
      icono: 'taller',
      titulo: 'Tu taller en Rodix',
      texto: 'En Mi Taller manejas el perfil que ven los clientes. En Servicios publicas lo que ofreces y a qué precio.',
    },
    {
      icono: 'citas',
      titulo: 'Citas',
      texto: 'Recibes las solicitudes, las confirmas y llevas el seguimiento. Si llega alguien sin cita, también puedes crear la orden en el momento.',
    },
    {
      icono: 'registro',
      titulo: 'Registrar y finalizar el servicio',
      texto: 'Para finalizar se registra lo que se hizo, con el kilometraje obligatorio, fotos y costo. El cliente lo recibe en su historial.',
    },
    {
      icono: 'equipo',
      titulo: 'Tu equipo',
      texto: 'Invita a tus mecánicos con su @usuario. Ellos aceptan desde su Perfil y atienden las citas que les asignes.',
    },
    {
      icono: 'mensajes',
      titulo: 'Mensajes',
      texto: 'Cada cita tiene su chat con el cliente. Cuando se cierra el servicio, el chat queda cerrado con un resumen.',
    },
  ],
  mecanico: [
    {
      icono: 'agenda',
      titulo: 'Tus citas',
      texto: 'En Mis Citas ves las que te asignó el taller, con el cliente, el vehículo y la hora.',
    },
    {
      icono: 'mensajes',
      titulo: 'Habla con el cliente',
      texto: 'Cada cita tiene su chat. Úsalo para coordinar y mostrar el avance. Todas tus conversaciones están en la pestaña Mensajes.',
    },
    {
      icono: 'cierre',
      titulo: 'Finalizar el servicio',
      texto: 'Al terminar, registra lo que hiciste con el kilometraje (obligatorio), fotos y costo. El chat se cierra y queda el resumen.',
    },
  ],
};

/** Clave de almacenamiento: solo letras, números, punto, guion y guion bajo (SecureStore). */
export function claveTutorial(usuarioId: string, modo: ModoEfectivo): string {
  const id = usuarioId.replace(/[^A-Za-z0-9._-]/g, '');
  return `rodix_tutorial_${id}_${modo}`;
}

export const VALOR_VISTO = 'visto';

/** Se muestra solo si todavía no hay constancia de que ese usuario lo vio en ese modo. */
export function debeMostrarTutorial(valorGuardado: string | null | undefined): boolean {
  return valorGuardado !== VALOR_VISTO;
}

/** Texto del botón principal según el paso. */
export function textoBotonTutorial(indice: number, total: number): string {
  return indice >= total - 1 ? 'Empezar' : 'Siguiente';
}

/** Mantiene el índice dentro de los pasos disponibles. */
export function limitarPaso(indice: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(indice, 0), total - 1);
}
