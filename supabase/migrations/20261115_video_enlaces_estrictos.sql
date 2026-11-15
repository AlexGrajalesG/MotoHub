-- Enlaces de video: solo direcciones con forma de video de TikTok o Instagram, no cualquier ruta del dominio
-- (por ejemplo las paginas de redireccion de TikTok). Mismas reglas que detectarPlataforma en la app.
-- Solo hay un video guardado hoy y cumple la regla nueva.
alter table public.posts drop constraint if exists posts_video_dominio_check;
alter table public.posts add constraint posts_video_dominio_check check (
  video_url is null or (
    char_length(video_url) <= 300
    and video_url !~ '\s'
    and (
      (video_plataforma = 'tiktok' and (
        video_url ~* '^https://(www\.)?tiktok\.com/@[A-Za-z0-9._-]+/video/[0-9]+/?([?#].*)?$'
        or video_url ~* '^https://(vm|vt)\.tiktok\.com/[A-Za-z0-9_-]+/?([?#].*)?$'
        or video_url ~* '^https://(www\.)?tiktok\.com/t/[A-Za-z0-9_-]+/?([?#].*)?$'
      ))
      or (video_plataforma = 'instagram'
        and video_url ~* '^https://(www\.)?instagram\.com/(reel|p)/[A-Za-z0-9_-]+/?([?#].*)?$')
    )
  )
);
