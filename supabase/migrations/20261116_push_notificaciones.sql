-- Notificaciones push: tokens de dispositivo y envio desde el servidor.
-- Cada fila nueva en notificaciones llama a la funcion de borde enviar-push, que avisa al celular por Expo/FCM.
-- La URL y el secreto compartido viven en Vault (push_url, push_secret), no en este archivo.
create extension if not exists pg_net with schema extensions;

create table if not exists public.dispositivos_push (
  token text primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  plataforma text not null check (plataforma in ('android', 'ios')),
  actualizado_en timestamptz not null default now()
);
create index if not exists idx_dispositivos_push_usuario on public.dispositivos_push(usuario_id);

-- Sin politicas: nadie lee ni escribe tokens directo. Solo las funciones de abajo y el servidor (service role).
alter table public.dispositivos_push enable row level security;

create or replace function public.registrar_token_push(p_token text, p_plataforma text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if p_token is null or length(p_token) > 200 or p_token !~ '^Expo(nent)?PushToken\[[^\]]+\]$' then
    raise exception 'Token no valido';
  end if;
  -- Si el celular cambia de cuenta, el token pasa a la cuenta nueva.
  insert into public.dispositivos_push (token, usuario_id, plataforma)
  values (p_token, auth.uid(), p_plataforma)
  on conflict (token) do update
    set usuario_id = excluded.usuario_id, plataforma = excluded.plataforma, actualizado_en = now();
end $$;

create or replace function public.borrar_token_push(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  delete from public.dispositivos_push where token = p_token and usuario_id = auth.uid();
end $$;

revoke execute on function public.registrar_token_push(text, text) from public, anon;
revoke execute on function public.borrar_token_push(text) from public, anon;
grant execute on function public.registrar_token_push(text, text) to authenticated;
grant execute on function public.borrar_token_push(text) to authenticated;

-- Dispara el envio. Si falta la configuracion o el envio falla, la notificacion se guarda igual (la app la ve dentro).
create or replace function public.fn_enviar_push()
returns trigger language plpgsql security definer set search_path = public, extensions, vault as $$
declare
  v_url text;
  v_secreto text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'push_secret';
  if v_url is null or v_secreto is null then return new; end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secreto),
    body := jsonb_build_object(
      'usuario_id', new.usuario_id,
      'titulo', new.titulo,
      'cuerpo', new.cuerpo,
      'tipo', new.tipo,
      'notificacion_id', new.id
    )
  );
  return new;
exception when others then
  return new;
end $$;

revoke execute on function public.fn_enviar_push() from public, anon, authenticated;

drop trigger if exists trg_enviar_push on public.notificaciones;
create trigger trg_enviar_push
  after insert on public.notificaciones
  for each row execute function public.fn_enviar_push();
