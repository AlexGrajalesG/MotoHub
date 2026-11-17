/**
 * Textos legales de Rodix (Ley 1581 de 2012, Decreto 1074 de 2015).
 * Deben mantenerse iguales a rodix.com.co/politica-privacidad y /terminos.
 * Al cambiar el contenido, subir `VERSION_LEGAL`: la version aceptada se guarda con cada registro.
 * Las lineas que empiezan con '## ' se muestran como subtitulo.
 */
export const VERSION_LEGAL = '2026-11-17';

export type DocumentoLegal = 'datos' | 'terminos';

export const LEGAL: Record<DocumentoLegal, { titulo: string; parrafos: string[] }> = {
  datos: {
    titulo: 'Política de tratamiento de datos',
    parrafos: [
      'Esta política explica cómo Rodix recoge, usa, almacena y protege tus datos personales en su sitio web y en su aplicación, de acuerdo con el habeas data (artículo 15 de la Constitución), la Ley 1581 de 2012 y el Decreto 1074 de 2015.',

      '## 1. Responsable del tratamiento',
      'Alexander Gómez Grajales, persona natural, titular de la marca Rodix. NIT 1025527691-4. Domicilio: Cl del Comercio #17-77, Centro, Bucaramanga, Santander, Colombia. Correo: rodixmotors@gmail.com. Teléfono y WhatsApp: 321 915 8228. El responsable también atiende las consultas y reclamos sobre datos personales.',

      '## 2. Solo mayores de edad',
      'Rodix es un servicio para personas mayores de 18 años. La ley colombiana prohíbe tratar datos de niños, niñas y adolescentes, salvo los de naturaleza pública, por lo que no ofrecemos el servicio a menores ni recogemos sus datos de forma consciente. Si crees que un menor nos entregó datos, escríbenos y los eliminaremos.',

      '## 3. Qué datos recogemos',
      '• Cuenta y perfil: nombre, nombre de usuario, correo, foto, ciudad, teléfono, edad y biografía.',
      '• Contacto de emergencia (opcional): nombre y teléfono de otra persona. Si lo registras, declaras que ella sabe y está de acuerdo.',
      '• Vehículos: marca, modelo, año, color, placa, cilindraje, kilometraje, número de motor y chasis, aseguradora y póliza, fotos y documentos como el SOAT.',
      '• Mantenimiento: recordatorios, historial de servicios, costos, facturas, fotos y recomendaciones.',
      '• Citas y mensajes con talleres y mecánicos, y las calificaciones que des o recibas.',
      '• Ubicación: la dirección o coordenadas que indiques para un servicio, un evento o una ruta. No rastreamos tu ubicación en segundo plano.',
      '• Comunidad: publicaciones, comentarios, fotos, enlaces a videos, grupos, eventos, reportes y bloqueos.',
      '• Mensajes y relaciones entre usuarios: los mensajes que envías a otras cuentas y las consultas a negocios, a quién sigues y quién te sigue, las solicitudes de mensaje, los bloqueos y los reportes de mensajes.',
      '• Negocios y mecánicos: nombre comercial, NIT, dirección, horario, servicios, productos, especialidades y experiencia.',
      '• Notificaciones de la app y su estado de lectura.',
      'No te pedimos datos sensibles (salud, origen racial, orientación política o religiosa, datos biométricos u otros similares). Si decides compartir alguno en una publicación o mensaje, lo haces de forma voluntaria.',

      '## 4. Para qué usamos tus datos',
      '• Crear y administrar tu cuenta y prestarte las funciones de la app.',
      '• Enviarte recordatorios de mantenimiento, notificaciones sobre tus citas y mensajes del servicio.',
      '• Conectarte con talleres y mecánicos, gestionar citas y mostrar tu historial de servicios.',
      '• Mostrar tu perfil, tus publicaciones y tus calificaciones a otros usuarios, según lo que publiques.',
      '• Moderar la comunidad, atender reportes y prevenir fraudes o abusos.',
      '• Mejorar el servicio con estadísticas agregadas, sin identificarte.',
      '• Cumplir obligaciones legales y atender requerimientos de autoridades.',
      'No vendemos tus datos ni los compartimos con terceros para fines comerciales ajenos a Rodix. Si quisiéramos usarlos para otra finalidad, te lo informaremos y te pediremos una nueva autorización.',

      '## 5. Mensajes, seguidores y consultas',
      'Puedes escribirle a otra persona, seguirla y hacer una consulta a un negocio. Otras personas pueden encontrarte por tu @usuario, seguirte y escribirte. Por esta vía nunca mostramos tu teléfono, tu edad ni tu contacto de emergencia a otros usuarios.',
      '• Quién ve cada conversación: en un chat directo, solo las dos personas. En una consulta a un negocio, tú, el dueño del negocio y los mecánicos de su equipo que el dueño sume a esa conversación.',
      '• Solicitudes: si dos personas no se siguen entre sí, quien escribe primero puede enviar un solo mensaje, que llega como solicitud. La otra persona decide si la acepta o la rechaza, o si bloquea a quien escribió. Si la rechaza, no recibirá más mensajes de esa persona.',
      '• Bloqueos y reportes: al bloquear a alguien, dejan de seguirse y ya no pueden escribirse ni encontrarse. Quien participa en una conversación puede reportar un mensaje. El equipo de moderación de Rodix ve el mensaje reportado y quién lo escribió, no el resto de la conversación.',
      '• Rodix no revisa tus conversaciones de forma rutinaria. Solo accedemos a un mensaje cuando alguien lo reporta o cuando una autoridad competente lo exige conforme a la ley.',
      '• Avisos: te avisamos de los mensajes y solicitudes nuevos dentro de la app y, si lo permitiste, con una notificación del teléfono. Esos avisos muestran el nombre de quien escribe y el comienzo del mensaje, y para llegar a tu teléfono pasan por los servidores de Expo y de Google. Si no quieres recibirlos, desactiva las notificaciones de Rodix en los ajustes de tu teléfono.',
      '• Para evitar abusos limitamos cuántas conversaciones nuevas puede iniciar una persona por día.',

      '## 6. Tu autorización',
      'Tratamos tus datos únicamente con tu autorización previa, expresa e informada, que te pedimos al crear tu cuenta. Guardamos prueba de ella, incluida la versión de esta política que aceptaste. Puedes revocarla en cualquier momento escribiendo a rodixmotors@gmail.com, salvo que exista un deber legal o contractual que nos obligue a conservar el dato.',

      '## 7. Quién más accede a tus datos',
      'Usamos proveedores que tratan datos por nuestra cuenta: Supabase (base de datos, autenticación y archivos, con servidores en Brasil), Vercel (alojamiento del sitio web), Resend (envío de correos) y Expo y Google, con su servicio Firebase Cloud Messaging (entrega de notificaciones al teléfono; reciben el token de tu dispositivo y el texto del aviso). Pueden procesar información fuera de Colombia, entre otros países Brasil y Estados Unidos. Al aceptar esta política autorizas de forma expresa esa transferencia internacional.',
      'Tus publicaciones y tu perfil son visibles para otros usuarios. Cuando pides una cita, el taller o mecánico que elijas ve los datos necesarios para atenderte, como tu nombre, contacto y vehículo. Tus mensajes los ven solo las personas que participan en la conversación, como se explica en la sección 5. También podemos entregar información a una autoridad competente cuando una ley o una orden judicial lo exija.',

      '## 8. Cookies y analítica',
      'No usamos cookies publicitarias ni de seguimiento entre sitios. En el sitio web usamos Vercel Web Analytics, que mide visitas de forma agregada sin cookies ni perfiles individuales, y guardamos el origen de tu visita (etiquetas de campaña) para saber qué canal funciona. Si activamos otra herramienta que use identificadores propios, lo informaremos aquí y te pediremos autorización cuando corresponda.',

      '## 9. Seguridad',
      'Aplicamos medidas técnicas y organizativas razonables para proteger tus datos contra pérdida, acceso no autorizado, uso fraudulento o adulteración. Ningún sistema es infalible; si detectamos un incidente que afecte tus datos, actuaremos conforme a la ley.',

      '## 10. Cuánto tiempo conservamos tus datos',
      'Conservamos los datos de tu cuenta mientras la mantengas activa. Si pides eliminarla, tienes 30 días de gracia para arrepentirte; pasado ese plazo suprimimos tus datos, salvo los que debamos conservar por obligación legal. Al suprimir tu cuenta también se eliminan las conversaciones en las que participabas, por lo que la otra persona deja de verlas, y se borran tus seguimientos, bloqueos y reportes. Los registros de la lista de espera y de negocios se conservan hasta 2 años desde el registro o hasta que revoques tu autorización. La base de datos de Rodix estará vigente mientras exista el servicio.',

      '## 11. Tus derechos como titular',
      '• Conocer, actualizar y rectificar tus datos.',
      '• Solicitar prueba de la autorización que nos diste.',
      '• Ser informado, si lo pides, del uso que le hemos dado a tus datos.',
      '• Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).',
      '• Revocar la autorización y pedir la supresión de tus datos cuando no se respeten los principios, derechos y garantías legales.',
      '• Acceder a tus datos de forma gratuita, al menos una vez por mes calendario.',

      '## 12. Cómo ejercer tus derechos',
      'Puedes descargar una copia de tus datos desde la app, en Perfil, Privacidad y datos, Descargar mis datos. Incluye los mensajes que escribiste y no los de otras personas, porque son datos de ellas.',
      'Escríbenos a rodixmotors@gmail.com o por WhatsApp al 321 915 8228, indicando tu nombre, el correo o teléfono con el que te registraste y lo que solicitas. Podemos pedirte que acredites tu identidad.',
      'Consultas: las respondemos en máximo 10 días hábiles. Si necesitamos más tiempo, te avisamos el motivo y la nueva fecha, que no pasará de 5 días hábiles adicionales.',
      'Reclamos (corrección, actualización, supresión o presunto incumplimiento): incluye tu identificación, la descripción de los hechos, una dirección de contacto y los documentos que quieras aportar. Si está incompleto, te lo informamos en los 5 días siguientes; si pasan 2 meses sin que lo completes, entendemos que desististe. Lo resolvemos en máximo 15 días hábiles, con un máximo de 8 días hábiles adicionales si necesitamos más tiempo. Mientras se resuelve, marcamos tu información como reclamo en trámite.',
      'Solo puedes presentar una queja ante la SIC después de haber agotado la consulta o el reclamo con nosotros.',

      '## 13. Cambios y vigencia',
      'Podemos actualizar esta política cuando Rodix evolucione. Si el cambio es sustancial, te lo comunicaremos antes de aplicarlo. Esta versión incorpora los mensajes entre usuarios, los seguidores, las consultas a negocios y las notificaciones push, y rige desde el 17 de noviembre de 2026.',
    ],
  },
  terminos: {
    titulo: 'Términos y condiciones',
    parrafos: [
      'Estos términos regulan el uso del sitio web y de la aplicación de Rodix. Al crear una cuenta o usar el servicio, los aceptas.',

      '## 1. Qué es Rodix',
      'Rodix es una plataforma que conecta a dueños de motos y carros con talleres, mecánicos y otros dueños. Te permite llevar el historial y los recordatorios de tu vehículo, pedir citas y participar en una comunidad. Rodix es un intermediario: los talleres y mecánicos son independientes y responden por sus servicios.',

      '## 2. Quién puede usarla',
      'Solo personas mayores de 18 años. Debes dar información verdadera y mantener actualizados tus datos. Eres responsable de tu contraseña y de lo que ocurra en tu cuenta.',

      '## 3. Citas y servicios',
      'Una cita es un acuerdo entre tú y el taller o mecánico. Los precios, tiempos y la calidad del trabajo son responsabilidad de quien presta el servicio. Rodix no garantiza el resultado de un servicio ni se hace responsable por daños derivados de él, sin perjuicio de lo que la ley establezca. Una consulta a un negocio no es una cita ni obliga al negocio a prestar un servicio o a respetar un precio.',

      '## 4. Comunidad y contenido',
      'Puedes publicar textos y fotos propias, y videos solo mediante enlace (TikTok o Reels). Eres responsable de lo que publicas y garantizas que tienes derecho a hacerlo. Nos das permiso para mostrarlo dentro de Rodix. Moderamos después de la publicación: podemos retirar contenido y suspender cuentas que incumplan estos términos, y puedes reportar o bloquear a otros usuarios.',

      '## 5. Mensajes entre usuarios',
      'Puedes seguir a otras cuentas, escribirles y hacer consultas a negocios. Si dos personas no se siguen, quien escribe primero envía una solicitud con un solo mensaje y la otra persona decide si la acepta. Quien rechaza una solicitud o bloquea a alguien no vuelve a recibir mensajes de esa persona. Usa los mensajes con respeto: puedes reportar un mensaje o bloquear a su autor, y podemos retirar mensajes y suspender cuentas que incumplan estos términos. Cómo se tratan tus datos en los mensajes está en la política de tratamiento de datos.',

      '## 6. Conductas no permitidas',
      '• Publicar contenido ilegal, engañoso, ofensivo, que acose o discrimine.',
      '• Suplantar a otra persona o publicar datos personales de terceros sin su permiso.',
      '• Usar la plataforma para spam, fraude o publicidad no autorizada.',
      '• Calificaciones falsas o hechas a cambio de pago.',
      '• Intentar vulnerar la seguridad del servicio o acceder a cuentas ajenas.',
      '• Enviar mensajes no deseados, acosar o insistir con una persona que rechazó tu solicitud o te bloqueó.',

      '## 7. Negocios y mecánicos',
      'Quienes registran un negocio o un perfil de mecánico declaran que la información es veraz y que están autorizados para ofrecer sus servicios. Las condiciones comerciales para negocios se informarán antes de cualquier cobro.',

      '## 8. Tu cuenta y su eliminación',
      'Puedes pedir la eliminación de tu cuenta desde la app. Tienes 30 días de gracia para arrepentirte; pasado ese plazo se eliminan tus datos, y con ellos tus conversaciones, conforme a la política de tratamiento de datos.',

      '## 9. Propiedad intelectual',
      'La marca Rodix, su logotipo y el software son de Rodix. No puedes copiarlos ni usarlos sin autorización. El contenido que publicas sigue siendo tuyo.',

      '## 10. Disponibilidad y responsabilidad',
      'Hacemos lo posible para que el servicio funcione sin interrupciones, pero puede haber fallas o cambios. Los recordatorios son una ayuda y no reemplazan tu responsabilidad de mantener al día los documentos y el mantenimiento de tu vehículo.',

      '## 11. Cambios, ley aplicable y contacto',
      'Podemos actualizar estos términos y te avisaremos de los cambios sustanciales. Se rigen por las leyes de Colombia. Para dudas escribe a rodixmotors@gmail.com. Versión del 17 de noviembre de 2026.',
    ],
  },
};
