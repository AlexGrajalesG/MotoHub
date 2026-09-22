import { detectarPlataforma } from '../comunidadTexto';

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
