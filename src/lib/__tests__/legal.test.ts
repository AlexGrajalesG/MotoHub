import { LEGAL, VERSION_LEGAL, type DocumentoLegal } from '../legal';

const DOCUMENTOS: DocumentoLegal[] = ['datos', 'terminos'];
const GUION_LARGO = String.fromCharCode(0x2014);
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function subtitulos(doc: DocumentoLegal): string[] {
  return LEGAL[doc].parrafos.filter(p => p.startsWith('## ')).map(p => p.slice(3));
}

function fechaEnTexto(version: string): string {
  const [anio, mes, dia] = version.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

describe('textos legales', () => {
  it('la versión tiene formato de fecha y no es un borrador', () => {
    expect(VERSION_LEGAL).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each(DOCUMENTOS)('%s: las secciones están numeradas en orden, sin saltos ni repetidos', doc => {
    const numeros = subtitulos(doc).map(t => Number(t.match(/^(\d+)\./)?.[1]));
    expect(numeros.length).toBeGreaterThan(5);
    numeros.forEach((n, i) => expect(n).toBe(i + 1));
  });

  it.each(DOCUMENTOS)('%s: menciona la fecha de la versión vigente', doc => {
    const texto = LEGAL[doc].parrafos.join(' ');
    expect(texto).toContain(fechaEnTexto(VERSION_LEGAL));
  });

  it.each(DOCUMENTOS)('%s: no usa guiones largos', doc => {
    expect(LEGAL[doc].parrafos.join(' ')).not.toContain(GUION_LARGO);
  });

  it('la política explica los mensajes entre usuarios con lo que de verdad hace la app', () => {
    const texto = LEGAL.datos.parrafos.join(' ');
    expect(subtitulos('datos').some(t => /Mensajes, seguidores y consultas/.test(t))).toBe(true);
    expect(texto).toMatch(/un solo mensaje/);
    expect(texto).toMatch(/rechaza/);
    expect(texto).toMatch(/bloquear/i);
    expect(texto).toMatch(/moderación/);
    expect(texto).toMatch(/no el resto de la conversación/);
    expect(texto).toMatch(/nunca mostramos tu teléfono/);
  });

  it('la política dice qué pasa con los chats al eliminar la cuenta y qué incluye la descarga', () => {
    const texto = LEGAL.datos.parrafos.join(' ');
    expect(texto).toMatch(/se eliminan las conversaciones en las que participabas/);
    expect(texto).toMatch(/Descargar mis datos/);
    expect(texto).toMatch(/no los de otras personas/);
  });

  it('la política declara a Expo y Google como quienes entregan las notificaciones', () => {
    const texto = LEGAL.datos.parrafos.join(' ');
    expect(texto).toMatch(/Expo y Google, con su servicio Firebase Cloud Messaging/);
    expect(texto).toMatch(/pasan por los servidores de Expo y de Google/);
    expect(texto).toMatch(/desactiva las notificaciones de Rodix/);
    expect(texto).toMatch(/Token de tu dispositivo/);
  });

  it('los términos regulan los mensajes y las consultas', () => {
    const texto = LEGAL.terminos.parrafos.join(' ');
    expect(subtitulos('terminos').some(t => /Mensajes entre usuarios/.test(t))).toBe(true);
    expect(texto).toMatch(/insistir con una persona que rechazó/);
    expect(texto).toMatch(/consulta a un negocio no es una cita/);
  });

  it('conserva los datos del responsable y los derechos del titular', () => {
    const texto = LEGAL.datos.parrafos.join(' ');
    expect(texto).toContain('rodixmotors@gmail.com');
    expect(texto).toContain('Superintendencia de Industria y Comercio');
    expect(texto).toContain('mayores de 18 años');
  });
});
