-- La funcion enviar-push comprueba el secreto compartido contra Vault, asi no se copia a mano a otro lado.
-- Solo el rol de servicio puede llamarla.
create or replace function public.verificar_push_secreto(p_secreto text)
returns boolean language sql security definer set search_path = public, vault as $$
  select p_secreto is not null and exists (
    select 1 from vault.decrypted_secrets where name = 'push_secret' and decrypted_secret = p_secreto
  );
$$;

revoke execute on function public.verificar_push_secreto(text) from public, anon, authenticated;
grant execute on function public.verificar_push_secreto(text) to service_role;
