import { hostPermitido, resolverVideo, urlPermitidaOnull, limpiarAutor } from '../videoEmbed';

describe('urlPermitidaOnull', () => {
  it('deja pasar solo direcciones de las redes permitidas', () => {
    expect(urlPermitidaOnull('https://p16-sign.tiktokcdn.com/x.jpg')).toBe('https://p16-sign.tiktokcdn.com/x.jpg');
    expect(urlPermitidaOnull('https://evil.com/portada.jpg')).toBeNull();
    expect(urlPermitidaOnull('http://p16.tiktokcdn.com/x.jpg')).toBeNull();
    expect(urlPermitidaOnull(null)).toBeNull();
    expect(urlPermitidaOnull(123)).toBeNull();
  });
});

describe('limpiarAutor', () => {
  it('quita la arroba y rechaza valores raros', () => {
    expect(limpiarAutor('@moto.rodix')).toBe('moto.rodix');
    expect(limpiarAutor('  rodix  ')).toBe('rodix');
    expect(limpiarAutor('dos palabras')).toBeNull();
    expect(limpiarAutor('')).toBeNull();
    expect(limpiarAutor('a'.repeat(41))).toBeNull();
    expect(limpiarAutor(undefined)).toBeNull();
  });
});

describe('hostPermitido', () => {
  it('acepta TikTok e Instagram y sus subdominios por https', () => {
    expect(hostPermitido('https://www.tiktok.com/embed/v2/123')).toBe(true);
    expect(hostPermitido('https://p16-sign.tiktokcdn.com/x.jpg')).toBe(true);
    expect(hostPermitido('https://www.instagram.com/reel/ABC/embed/')).toBe(true);
  });

  it('rechaza otros dominios, http y parecidos engañosos', () => {
    expect(hostPermitido('https://evil.com/tiktok.com')).toBe(false);
    expect(hostPermitido('https://tiktok.com.evil.com/x')).toBe(false);
    expect(hostPermitido('http://www.tiktok.com/x')).toBe(false);
    expect(hostPermitido('no es una url')).toBe(false);
  });
});

describe('resolverVideo', () => {
  it('arma el embed de Instagram con el código del reel', async () => {
    const v = await resolverVideo('https://www.instagram.com/reel/Cabc_123-x/?igsh=1');
    expect(v?.embedUrl).toBe('https://www.instagram.com/reel/Cabc_123-x/embed/');
  });

  it('devuelve null si el enlace no es de una plataforma admitida', async () => {
    expect(await resolverVideo('https://youtube.com/watch?v=1')).toBeNull();
  });

  it('devuelve null si la plataforma guardada no coincide con el enlace', async () => {
    expect(await resolverVideo('https://www.instagram.com/reel/Cabc123/', 'tiktok')).toBeNull();
  });

  it('devuelve null para rutas que no son un video aunque sean del dominio', async () => {
    expect(await resolverVideo('https://www.tiktok.com/link/v2?target=https%3A%2F%2Fevil.com')).toBeNull();
  });

  it('en Instagram no inventa portada ni autor', async () => {
    const v = await resolverVideo('https://www.instagram.com/p/Cxyz789/');
    expect(v?.miniatura).toBeNull();
    expect(v?.autor).toBeNull();
  });
});
