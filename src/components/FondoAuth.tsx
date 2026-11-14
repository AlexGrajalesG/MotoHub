import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/** Fondo verde de la marca hecho con degradados nativos: se dibuja a la resolución real de cualquier pantalla. */
export default function FondoAuth({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.raiz}>
      {/* Base: negro arriba que se abre a verde oscuro */}
      <LinearGradient
        colors={['#050805', '#0c1f0b', '#133210', '#0a1a09']}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Resplandor central suave */}
      <LinearGradient
        colors={['rgba(72,151,90,0)', 'rgba(72,151,90,0.18)', 'rgba(72,151,90,0)']}
        locations={[0.15, 0.55, 0.95]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Arco brillante inferior izquierdo */}
      <LinearGradient
        colors={['rgba(72,151,90,0.55)', 'rgba(72,151,90,0.12)', 'rgba(72,151,90,0)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.85, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Esquina inferior derecha más oscura para dar profundidad */}
      <LinearGradient
        colors={['rgba(2,2,2,0)', 'rgba(2,2,2,0.55)']}
        start={{ x: 0.3, y: 0.6 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: '#050805' },
});
