-- 1) Avisos dentro de la app para mensajes y solicitudes de chat.
-- 2) Exportacion de datos (Ley 1581): se suman chats, seguimientos, bloqueos, publicaciones y mensajes de citas.
--
-- La eliminacion de cuenta no necesita cambios: borrar auth.users arrastra en cascada usuarios y, de ahi,
-- conversaciones, participantes, mensajes, seguidores, reportes y notificaciones.

-- ============================================================
-- 1) Notificaciones de chat
-- ============================================================
alter table public.notificaciones
  add column if not exists conversacion_id uuid references public.conversaciones(id) on delete cascade;

create index if not exists notificaciones_conversacion_idx on public.notificaciones (conversacion_id, usuario_id) where leida = false;

alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check check (
  tipo = any (array[
    'cita_nueva', 'cita_estado', 'registro_servicio_nuevo', 'registro_servicio_resuelto',
    'invitacion_equipo', 'invitacion_respuesta', 'mensaje_chat', 'solicitud_chat'
  ])
);

create or replace function public.fn_notificar_mensaje_conversacion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_conv public.conversaciones%rowtype;
  v_autor text;
  v_negocio text;
  r record;
  v_tipo text;
  v_titulo text;
  v_cuerpo text;
begin
  select * into v_conv from public.conversaciones where id = new.conversacion_id;
  select u.nombre into v_autor from public.usuarios u where u.id = new.autor_id;
  select n.nombre into v_negocio from public.negocios n where n.id = v_conv.negocio_id;

  for r in
    select p.usuario_id, p.rol from public.conversacion_participantes p
    where p.conversacion_id = new.conversacion_id and p.usuario_id <> new.autor_id
  loop
    -- Mientras haya un aviso sin leer de esta conversacion no se apila otro
    continue when exists (
      select 1 from public.notificaciones n
      where n.usuario_id = r.usuario_id and n.conversacion_id = new.conversacion_id and n.leida = false
    );

    if v_conv.tipo = 'directa' and v_conv.estado = 'solicitud' and v_conv.iniciada_por = new.autor_id then
      v_tipo := 'solicitud_chat';
      v_titulo := 'Solicitud de mensaje';
      v_cuerpo := coalesce(v_autor, 'Alguien') || ' quiere escribirte';
    else
      v_tipo := 'mensaje_chat';
      v_titulo := case
        when v_conv.tipo = 'consulta_negocio' and r.rol = 'cliente' then coalesce(v_negocio, 'Negocio')
        else coalesce(v_autor, 'Mensaje nuevo')
      end;
      v_cuerpo := left(new.texto, 80);
    end if;

    insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo, conversacion_id)
    values (r.usuario_id, v_tipo, v_titulo, v_cuerpo, new.conversacion_id);
  end loop;
  return new;
end;
$$;
revoke execute on function public.fn_notificar_mensaje_conversacion() from public, anon, authenticated;

drop trigger if exists trg_notificar_mensaje_conversacion on public.mensajes_conversacion;
create trigger trg_notificar_mensaje_conversacion after insert on public.mensajes_conversacion
  for each row execute function public.fn_notificar_mensaje_conversacion();

-- Al abrir la conversacion tambien se marcan como leidos sus avisos
create or replace function public.marcar_conversacion_leida(p_conversacion uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  update public.conversacion_participantes set leido_at = now()
  where conversacion_id = p_conversacion and usuario_id = auth.uid();
  update public.notificaciones set leida = true
  where usuario_id = auth.uid() and conversacion_id = p_conversacion and leida = false;
end;
$$;
revoke execute on function public.marcar_conversacion_leida(uuid) from public, anon;
grant execute on function public.marcar_conversacion_leida(uuid) to authenticated;

-- ============================================================
-- 2) Exportar mis datos
-- Se exportan los mensajes que escribio la persona; los de la otra parte no, porque son datos de esa persona.
-- ============================================================
create or replace function public.exportar_mis_datos()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_veh uuid[];
begin
  if v_uid is null then raise exception 'No autorizado'; end if;
  select coalesce(array_agg(id), '{}') into v_veh from vehiculos where propietario_id = v_uid;

  return jsonb_build_object(
    'generado_en', now(),
    'correo', (select email from auth.users where id = v_uid),
    'perfil', (select to_jsonb(u) from usuarios u where u.id = v_uid),
    'vehiculos', coalesce((select jsonb_agg(to_jsonb(v)) from vehiculos v where v.propietario_id = v_uid), '[]'::jsonb),
    'documentos', coalesce((select jsonb_agg(to_jsonb(d)) from documentos d where d.vehiculo_id = any(v_veh)), '[]'::jsonb),
    'recordatorios', coalesce((select jsonb_agg(to_jsonb(r)) from recordatorios r where r.vehiculo_id = any(v_veh)), '[]'::jsonb),
    'historial_mantenimiento', coalesce((select jsonb_agg(to_jsonb(h)) from historial_mantenimiento h where h.vehiculo_id = any(v_veh)), '[]'::jsonb),
    'citas', coalesce((select jsonb_agg(to_jsonb(c)) from citas c where c.usuario_id = v_uid), '[]'::jsonb),
    'calificaciones_que_di', coalesce((select jsonb_agg(to_jsonb(k)) from calificaciones k where k.autor_id = v_uid), '[]'::jsonb),
    'negocios', coalesce((select jsonb_agg(to_jsonb(n)) from negocios n where n.propietario_id = v_uid), '[]'::jsonb),
    'notificaciones', coalesce((select jsonb_agg(to_jsonb(x)) from notificaciones x where x.usuario_id = v_uid), '[]'::jsonb),

    'publicaciones', coalesce((select jsonb_agg(to_jsonb(p)) from posts p where p.autor_id = v_uid), '[]'::jsonb),
    'mensajes_de_citas', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'cita_id', m.cita_id, 'texto', m.texto, 'enviado_en', m.created_at) order by m.created_at)
      from mensajes_cita m where m.autor_id = v_uid
    ), '[]'::jsonb),
    'conversaciones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'tipo', c.tipo, 'estado', c.estado, 'creada_en', c.created_at,
        'mis_mensajes', coalesce((
          select jsonb_agg(jsonb_build_object('id', m.id, 'texto', m.texto, 'enviado_en', m.created_at) order by m.created_at)
          from mensajes_conversacion m
          where m.conversacion_id = c.id and m.autor_id = v_uid and m.eliminado_at is null
        ), '[]'::jsonb)
      ))
      from conversaciones c
      join conversacion_participantes cp on cp.conversacion_id = c.id and cp.usuario_id = v_uid
    ), '[]'::jsonb),
    'sigo_a', coalesce((
      select jsonb_agg(jsonb_build_object('usuario', u.nombre_usuario, 'desde', s.created_at))
      from seguidores s join usuarios u on u.id = s.seguido_id where s.seguidor_id = v_uid
    ), '[]'::jsonb),
    'cuentas_que_me_siguen', (select count(*) from seguidores where seguido_id = v_uid),
    'cuentas_bloqueadas_por_mi', coalesce((
      select jsonb_agg(jsonb_build_object('usuario', u.nombre_usuario, 'desde', b.created_at))
      from bloqueos b join usuarios u on u.id = b.bloqueado_id where b.bloqueador_id = v_uid
    ), '[]'::jsonb),
    'reportes_que_hice', jsonb_build_object(
      'publicaciones', (select count(*) from reportes_post where reportado_por = v_uid),
      'mensajes', (select count(*) from reportes_mensaje where reportado_por = v_uid)
    )
  );
end;
$$;
revoke execute on function public.exportar_mis_datos() from public, anon;
grant execute on function public.exportar_mis_datos() to authenticated;
