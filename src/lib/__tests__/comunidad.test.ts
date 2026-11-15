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

  it('acepta los parámetros que añaden las apps al compartir', () => {
    expect(detectarPlataforma('https://www.tiktok.com/@user.name_1/video/7123456789?is_from_webapp=1&sender_device=pc')).toBe('tiktok');
    expect(detectarPlataforma('https://www.tiktok.com/t/ZSabc123/')).toBe('tiktok');
    expect(detectarPlataforma('https://vt.tiktok.com/ZSbeaLfpJ/')).toBe('tiktok');
    expect(detectarPlataforma('https://www.instagram.com/reel/Cabc_123-x/?igsh=abc')).toBe('instagram');
  });

  it('rechaza rutas de TikTok e Instagram que no son un video', () => {
    expect(detectarPlataforma('https://www.tiktok.com/')).toBeNull();
    expect(detectarPlataforma('https://www.tiktok.com/@user')).toBeNull();
    expect(detectarPlataforma('https://www.tiktok.com/link/v2?scene=bio_url&target=https%3A%2F%2Fevil.com')).toBeNull();
    expect(detectarPlataforma('https://www.tiktok.com/@user/video/abc')).toBeNull();
    expect(detectarPlataforma('https://www.instagram.com/accounts/login/')).toBeNull();
    expect(detectarPlataforma('https://www.instagram.com/someuser/')).toBeNull();
  });

  it('rechaza dominios que solo parecen de la plataforma', () => {
    expect(detectarPlataforma('https://tiktok.com.evil.com/@u/video/1')).toBeNull();
    expect(detectarPlataforma('https://tiktok.com@evil.com/@u/video/1')).toBeNull();
    expect(detectarPlataforma('https://eviltiktok.com/@u/video/1')).toBeNull();
    expect(detectarPlataforma('https://www.instagram.com.evil.com/reel/abc/')).toBeNull();
    expect(detectarPlataforma('https://evilinstagram.com/reel/abc/')).toBeNull();
  });

  it('rechaza http, esquemas raros, espacios dentro y enlaces demasiado largos', () => {
    expect(detectarPlataforma('http://www.tiktok.com/@u/video/1')).toBeNull();
    expect(detectarPlataforma('javascript:alert(1)//https://www.tiktok.com/@u/video/1')).toBeNull();
    expect(detectarPlataforma('https://www.tiktok.com/@u/video/1 https://evil.com')).toBeNull();
    expect(detectarPlataforma(`https://www.tiktok.com/@u/video/1?x=${'a'.repeat(400)}`)).toBeNull();
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
