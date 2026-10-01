import { supabase } from './supabase';
import type { Producto } from './productos';
import { coincideVehiculo, tipoVehiculoPlural, type TipoVehiculo } from './vehiculoTipo';

export { coincideVehiculo, tipoVehiculoPlural };
export type { TipoVehiculo };

export type Negocio = {
  id: string;
  nombre: string;
  tipo: 'taller' | 'tienda' | 'concesionario' | 'mixto';
  descripcion: string | null;
  direccion: string | null;
  ciudad: string | null;
  atiende: string[];
  horario: Record<string, { abre: string; cierra: string } | null> | null;
  telefono: string | null;
  foto_url: string | null;
};

export type ProductoConNegocio = Producto & { negocio: Negocio };
export type ServicioConNegocio = {
  id: string;
  negocio_id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  aplica_a: string[];
  duracion_minutos: number | null;
  tipo_precio: 'fijo' | 'desde' | 'cotizar';
  precio_base: number | null;
  negocio: Negocio;
};

const SELECT_NEGOCIO = 'id, nombre, tipo, descripcion, direccion, ciudad, atiende, horario, telefono, foto_url';

// Mientras el negocio no suba su propia foto, se muestra una de referencia del rubro
// (nunca el ícono vacío) — mismas fotos de ambiente usadas en el proyecto de marca en Stitch.
const IMG_REF_TALLER = require('../../assets/negocios/taller.jpg');
const IMG_REF_TIENDA = require('../../assets/negocios/tienda.jpg');

export function imagenReferenciaNegocio(tipo: string) {
  return tipo === 'tienda' || tipo === 'concesionario' ? IMG_REF_TIENDA : IMG_REF_TALLER;
}

export async function buscarProductos(query: string): Promise<ProductoConNegocio[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('productos')
    .select(`id, negocio_id, nombre, descripcion, precio, stock, fotos, compatible_con, activo, negocio:negocios(${SELECT_NEGOCIO})`)
    .eq('activo', true)
    .or(`nombre.ilike.%${q}%,descripcion.ilike.%${q}%`)
    .limit(15);
  if (error) { console.error(error.message); return []; }
  return ((data ?? []) as any[]).filter(p => p.negocio) as ProductoConNegocio[];
}

export async function buscarServicios(query: string): Promise<ServicioConNegocio[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('servicios')
    .select(`id, negocio_id, nombre, descripcion, categoria, aplica_a, duracion_minutos, tipo_precio, precio_base, negocio:negocios(${SELECT_NEGOCIO})`)
    .eq('activo', true)
    .or(`nombre.ilike.%${q}%,descripcion.ilike.%${q}%,categoria.ilike.%${q}%`)
    .limit(15);
  if (error) { console.error(error.message); return []; }
  return ((data ?? []) as any[]).filter(s => s.negocio) as ServicioConNegocio[];
}
