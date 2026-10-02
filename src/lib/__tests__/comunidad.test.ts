import { detectarPlataforma, extraerHashtags } from '../comunidadTexto';

describe('detectarPlataforma', () => {
  it('reconoce enlaces de TikTok', () => {
    expect(detectarPlataforma('https://www.tiktok.com/@user/video/123')).toBe('tiktok');
    expect(detectarPlataforma('https://vm.tiktok.com/ZM123/')).toBe('tiktok');
    expect(detectarPlataforma('https://vt.tiktok.com/ZM456/')).toBe('tiktok');
  });

  it('reconoce enlaces de Instagram Reels y publicaciones', () => {
    expect(detectarPlataforma('https://www.instagram.com/reel/abc123/')).toBe('instagram');
    expect(detectarPlataforma('https://instagram.com/p/xyz789/')).toBe('instagram');
  });

  it('rechaza otras plataformas', () => {
    expect(detectarPlataforma('https://www.youtube.com/watch?v=1')).toBeNull();
    expect(detectarPlataforma('https://facebook.com/reel/1')).toBeNull();
    expect(detectarPlataforma('no es un enlace')).toBeNull();
    expect(detectarPlataforma('')).toBeNull();
  });

  it('ignora espacios alrededor', () => {
    expect(detectarPlataforma('  https://www.tiktok.com/@user/video/123  ')).toBe('tiktok');
  });
});

describe('extraerHashtags', () => {
  it('saca los hashtags del texto', () => {
    expect(extraerHashtags('Ruta al #Chicamocha hoy #domingo')).toEqual(['#chicamocha', '#domingo']);
  });

  it('acepta tildes y ñ', () => {
    expect(extraerHashtags('#mantención en mi #moto')).toEqual(['#mantención', '#moto']);
  });

  it('quita duplicados y pasa a minúscula', () => {
    expect(extraerHashtags('#Ruta buena #ruta #RUTA')).toEqual(['#ruta']);
  });

  it('sin hashtags, da un arreglo vacío', () => {
    expect(extraerHashtags('Solo texto normal')).toEqual([]);
    expect(extraerHashtags(null)).toEqual([]);
    expect(extraerHashtags(undefined)).toEqual([]);
  });
});
