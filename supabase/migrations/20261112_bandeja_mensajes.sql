-- Bandeja de mensajes: una fila por cita con chat visible para quien llama.
-- SECURITY INVOKER: respeta las politicas RLS de citas, mensajes_cita y usuarios (no abre acceso nuevo).
-- p_como: 'cliente' = chats donde soy el cliente; 'negocio' = chats del lado del negocio (dueno o mecanico).
create or replace function public.bandeja_mensajes(p_como text)
returns table (
  cita_id uuid,
  estado text,
  contraparte_nombre text,
  vehiculo_texto text,
  ultimo_texto text,
  ultimo_tipo text,
  ultimo_tiene_adjuntos boolean,
  ultimo_at timestamptz,
  ultimo_autor_id uuid,
  no_leido boolean,
  orden_at timestamptz
)
language plpgsql
stable
security invoker
set search_path to 'public'
as $$
begin
  if p_como is null or p_como not in ('cliente', 'negocio') then
    raise exception 'Parametro invalido: p_como debe ser cliente o negocio';
  end if;

  return query
  select
    c.id,
    c.estado,
    case when p_como = 'cliente' then n.nombre else u.nombre end,
    nullif(concat_ws(' · ', nullif(concat_ws(' ', v.marca, v.modelo), ''), upper(v.placa)), ''),
    ult.texto,
    ult.tipo_mensaje,
    coalesce(ult.tiene_adjuntos, false),
    ult.created_at,
    ult.autor_id,
    exists (
      select 1 from mensajes_cita m2
      where m2.cita_id = c.id
        and m2.autor_id <> auth.uid()
        and m2.created_at > coalesce(
          (select l.leido_at from cita_lecturas l where l.cita_id = c.id and l.usuario_id = auth.uid()),
          '-infinity'::timestamptz)
    ),
    coalesce(ult.created_at, c.created_at)
  from citas c
  left join negocios n on n.id = c.negocio_id
  left join usuarios u on u.id = c.usuario_id
  left join vehiculos v on v.id = c.vehiculo_id
  left join lateral (
    select m.texto, m.tipo_mensaje, coalesce(jsonb_array_length(m.adjuntos) > 0, false) as tiene_adjuntos,
           m.created_at, m.autor_id
    from mensajes_cita m
    where m.cita_id = c.id
    order by m.created_at desc
    limit 1
  ) ult on true
  where (
      (p_como = 'cliente' and c.usuario_id = auth.uid())
      or (p_como = 'negocio' and c.usuario_id <> auth.uid())
    )
    -- Las cerradas solo aparecen si hubo conversacion
    and (c.estado in ('pendiente', 'confirmada') or ult.created_at is not null)
  order by coalesce(ult.created_at, c.created_at) desc
  limit 200;
end;
$$;

revoke execute on function public.bandeja_mensajes(text) from public, anon;
grant execute on function public.bandeja_mensajes(text) to authenticated;
