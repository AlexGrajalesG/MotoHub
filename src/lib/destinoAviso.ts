import { destinoAviso, type AvisoAbrible } from './destinoAvisoTexto';
import { supabase } from './supabase';

type Navegar = (nombre: string, params?: Record<string, unknown>) => void;

/** Abre la pantalla del aviso. Los destinos del negocio necesitan saber cuál es el negocio del usuario. */
export async function abrirAviso(navegar: Navegar, usuarioId: string, aviso: AvisoAbrible): Promise<void> {
  const destino = destinoAviso(aviso);
  if (destino.tipo === 'ruta') { navegar(destino.nombre, destino.params); return; }

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id')
    .eq('propietario_id', usuarioId)
    .maybeSingle();
  if (!negocio) return;
  navegar(destino.luego === 'equipo' ? 'MiEquipo' : 'CitasNegocio', { negocioId: negocio.id });
}
