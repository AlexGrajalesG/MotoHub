import { hostPermitido, resolverVideo } from '../videoEmbed';

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
});
