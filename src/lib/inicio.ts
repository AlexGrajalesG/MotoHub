import { getDocStatus } from './documentos';

/**
 * Logica pura del Inicio: "que necesito atender" y "primeros pasos".
 * Sin acceso a red ni a React para poder probarla.
 */

export type VehiculoInicio = {
  id: string;
  marca: string;
  modelo: string;
  kilometraje: number;
  documentos: { tipo: string; fecha_vencimiento: string | null }[];
};

export type RecordatorioInicio = {
  id: string;
  vehiculo_id: string;
  tipo: string;
  fecha_limite: string | null;
  km_limite: number | null;
  km_aviso: number | null;
  estado: string;
};

export type Alerta = {
  id: string;
  vehiculoId: string;
  vehiculoNombre: string;
  titulo: string;
  detalle: string;
  severidad: 'vencido' | 'proximo';
  /** Menor = mas urgente. Los dias y los km (100 km ~ 1 dia) comparten escala. */
  urgencia: number;
  /** A donde lleva tocar la alerta. */
  destino: 'documentos' | 'recordatorios';
};

const ETIQUETA: Record<string, string> = {
  soat: 'SOAT',
  tecnomecanica: 'Tecnomecánica',
  revision_tecnica: 'Tecnomecánica',
  aceite: 'Cambio de aceite',
  frenos: 'Frenos',
  cadena: 'Cadena',
  llantas: 'Llantas',
  bateria: 'Batería',
  personalizado: 'Recordatorio',
};

/** Un documento y su recordatorio hablan de lo mismo: no mostrar dos alertas. */
const CANONICO: Record<string, string> = { tecnomecanica: 'revision_tecnica' };

const KM_AVISO_POR_DEFECTO = 1000;
const KM_POR_DIA = 100;

export function miles(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function detalleDias(dias: number): string {
  if (dias < 0) return `Venció hace ${-dias} ${-dias === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}

export function detalleKm(restantes: number): string {
  if (restantes <= 0) return `Te pasaste ${miles(-restantes)} km`;
  return `Faltan ${miles(restantes)} km`;
}

export function calcularAlertas(vehiculos: VehiculoInicio[], recordatorios: RecordatorioInicio[]): Alerta[] {
  const alertas: Alerta[] = [];
  const cubiertos = new Set<string>();
  const porId = new Map(vehiculos.map(v => [v.id, v]));

  // 1. Documentos (SOAT y tecnomecanica) por fecha de vencimiento
  for (const v of vehiculos) {
    for (const tipo of ['soat', 'tecnomecanica']) {
      const docs = (v.documentos ?? []).filter(d => d.tipo === tipo && d.fecha_vencimiento);
      if (docs.length === 0) continue;
      const reciente = docs.reduce((a, b) => (a.fecha_vencimiento! > b.fecha_vencimiento! ? a : b));
      const st = getDocStatus(reciente.fecha_vencimiento);
      if (!st || st.estado === 'al_dia') continue;
      cubiertos.add(`${v.id}:${CANONICO[tipo] ?? tipo}`);
      alertas.push({
        id: `doc-${v.id}-${tipo}`,
        vehiculoId: v.id,
        vehiculoNombre: `${v.marca} ${v.modelo}`,
        titulo: ETIQUETA[tipo],
        detalle: detalleDias(st.diasRestantes),
        severidad: st.estado === 'vencido' ? 'vencido' : 'proximo',
        urgencia: st.diasRestantes,
        destino: 'documentos',
      });
    }
  }

  // 2. Recordatorios pendientes, por fecha o por kilometraje (el mas urgente de cada uno)
  for (const r of recordatorios) {
    if (r.estado !== 'pendiente') continue;
    const v = porId.get(r.vehiculo_id);
    if (!v || cubiertos.has(`${v.id}:${r.tipo}`)) continue;

    const candidatas: Alerta[] = [];
    const base = {
      vehiculoId: v.id,
      vehiculoNombre: `${v.marca} ${v.modelo}`,
      titulo: ETIQUETA[r.tipo] ?? 'Recordatorio',
      destino: 'recordatorios' as const,
    };

    if (r.fecha_limite) {
      const st = getDocStatus(r.fecha_limite);
      if (st && st.estado !== 'al_dia') {
        candidatas.push({
          ...base, id: `rec-${r.id}-fecha`, detalle: detalleDias(st.diasRestantes),
          severidad: st.estado === 'vencido' ? 'vencido' : 'proximo', urgencia: st.diasRestantes,
        });
      }
    }
    if (r.km_limite != null) {
      const restantes = r.km_limite - v.kilometraje;
      if (restantes <= (r.km_aviso ?? KM_AVISO_POR_DEFECTO)) {
        candidatas.push({
          ...base, id: `rec-${r.id}-km`, detalle: detalleKm(restantes),
          severidad: restantes <= 0 ? 'vencido' : 'proximo', urgencia: restantes / KM_POR_DIA,
        });
      }
    }
    if (candidatas.length > 0) alertas.push(candidatas.sort(porUrgencia)[0]);
  }

  return alertas.sort(porUrgencia);
}

function porUrgencia(a: Alerta, b: Alerta): number {
  if (a.severidad !== b.severidad) return a.severidad === 'vencido' ? -1 : 1;
  return a.urgencia - b.urgencia;
}

export type PasoInicial = { key: 'vehiculo' | 'soat' | 'recordatorio'; titulo: string; detalle: string; hecho: boolean };

export function calcularPrimerosPasos(vehiculos: VehiculoInicio[], recordatorios: RecordatorioInicio[]) {
  const pasos: PasoInicial[] = [
    { key: 'vehiculo', titulo: 'Agrega tu vehículo', detalle: 'Es la base de todo lo demás', hecho: vehiculos.length > 0 },
    {
      key: 'soat', titulo: 'Registra tu SOAT', detalle: 'Te avisamos antes de que venza',
      hecho: vehiculos.some(v => (v.documentos ?? []).some(d => d.tipo === 'soat')),
    },
    { key: 'recordatorio', titulo: 'Crea un recordatorio', detalle: 'Aceite, frenos, cadena...', hecho: recordatorios.length > 0 },
  ];
  const hechos = pasos.filter(p => p.hecho).length;
  return { pasos, hechos, total: pasos.length, completo: hechos === pasos.length };
}
