import { supabase } from './supabase';

export type VehiculoWalkin = { id: string; placa: string; marca: string; modelo: string };
export type ClienteWalkin = { id: string; nombre: string; nombre_usuario: string; vehiculos: VehiculoWalkin[] };

export async function buscarClientePorNombreUsuario(nombreUsuario: string): Promise<ClienteWalkin | null> {
  const { data, error } = await supabase
    .rpc('buscar_usuario_por_nombre_usuario', { p_nombre_usuario: nombreUsuario, p_incluir_vehiculos: true })
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as ClienteWalkin;
}

export async function crearOrdenWalkin(
  negocioId: string,
  clienteId: string,
  vehiculoId: string | null,
  estado: 'confirmada' | 'completada' = 'confirmada'
): Promise<string | null> {
  const { data, error } = await supabase.rpc('crear_orden_walkin', {
    p_negocio_id: negocioId,
    p_cliente_id: clienteId,
    p_vehiculo_id: vehiculoId,
    p_estado: estado,
  });
  if (error) { console.error(error.message); return null; }
  return data as string;
}
