/**
 * Textos legales de Rodix.
 *
 * PROVISIONAL: el texto definitivo lo redacta el abogado (Ley 1581 de 2012, habeas data;
 * debe autorizar de forma expresa el tratamiento con fines comerciales). Reemplazar el
 * contenido de estos textos y subir `VERSION_LEGAL` antes del evento; la version aceptada
 * se guarda con cada registro.
 */
export const VERSION_LEGAL = 'borrador-2026-09';

export type DocumentoLegal = 'datos' | 'terminos';

export const LEGAL: Record<DocumentoLegal, { titulo: string; parrafos: string[] }> = {
  datos: {
    titulo: 'Política de tratamiento de datos',
    parrafos: [
      'Este texto es un borrador y será reemplazado por la versión revisada por nuestro abogado.',
      'Rodix recolecta los datos que tú entregas (nombre, correo, teléfono, ciudad y los datos de tus vehículos) para ofrecerte el garage digital, los recordatorios y la conexión con talleres.',
      'Tus derechos como titular: conocer, actualizar, rectificar y solicitar la supresión de tus datos, y revocar tu autorización en cualquier momento.',
    ],
  },
  terminos: {
    titulo: 'Términos y condiciones',
    parrafos: [
      'Este texto es un borrador y será reemplazado por la versión revisada por nuestro abogado.',
      'Al crear una cuenta aceptas usar Rodix de forma responsable y con información verdadera.',
    ],
  },
};
