export type TipoPrecio = 'fijo' | 'desde' | 'cotizar';

export function formatCOP(n: number): string {
  return `$${n.toLocaleString('es-CO')}`;
}

export function formatPrecioServicio(servicio: {
  tipo_precio: TipoPrecio;
  precio_base: number | null;
}): string {
  if (servicio.tipo_precio === 'cotizar' || servicio.precio_base == null) {
    return 'A cotizar';
  }
  const precio = formatCOP(servicio.precio_base);
  return servicio.tipo_precio === 'desde' ? `Desde ${precio}` : precio;
}
