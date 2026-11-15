import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { obtenerTemaActual } from '../lib/tokens';
import type { NombreTema } from '../lib/paletas';

type Degradados = {
  fondo: [string, string, string, string];
  resplandor: string;
  arco: [string, string, string];
  esquina: [string, string];
};

const POR_TEMA: Record<NombreTema, Degradados> = {
  rodix: {
    fondo: ['#050805', '#0c1f0b', '#133210', '#0a1a09'],
    resplandor: 'rgba(72,151,90,0.18)',
    arco: ['rgba(72,151,90,0.55)', 'rgba(72,151,90,0.12)', 'rgba(72,151,90,0)'],
    esquina: ['rgba(2,2,2,0)', 'rgba(0,0,0,0.6)'],
  },
  oscuro: {
    fondo: ['#0c0c0d', '#141516', '#1a1d1b', '#0f1010'],
    resplandor: 'rgba(95,179,116,0.12)',
    arco: ['rgba(95,179,116,0.4)', 'rgba(95,179,116,0.1)', 'rgba(95,179,116,0)'],
    esquina: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)'],
  },
  claro: {
    fondo: ['#f7f8f6', '#eef4ef', '#e1eee4', '#f4f4f2'],
    resplandor: 'rgba(47,122,66,0.10)',
    arco: ['rgba(47,122,66,0.28)', 'rgba(47,122,66,0.08)', 'rgba(47,122,66,0)'],
    esquina: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)'],
  },
};

/** Fondo de la marca hecho con degradados nativos: se dibuja a la resolución real de cualquier pantalla. */
export default function FondoAuth({ children }: { children: React.ReactNode }) {
  const g = POR_TEMA[obtenerTemaActual()];
  const transparente = g.resplandor.replace(/[\d.]+\)$/, '0)');
  return (
    <View style={{ flex: 1, backgroundColor: g.fondo[0] }}>
      {/* Base: tono oscuro (o claro) que se abre al verde de la marca */}
      <LinearGradient colors={g.fondo} locations={[0, 0.35, 0.65, 1]} style={StyleSheet.absoluteFill} />
      {/* Resplandor central suave */}
      <LinearGradient
        colors={[transparente, g.resplandor, transparente]}
        locations={[0.15, 0.55, 0.95]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Arco brillante inferior izquierdo */}
      <LinearGradient
        colors={g.arco}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.85, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Esquina inferior derecha para dar profundidad */}
      <LinearGradient
        colors={g.esquina}
        start={{ x: 0.3, y: 0.6 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}
