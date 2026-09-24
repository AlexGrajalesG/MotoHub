import { View, Image, StyleSheet } from 'react-native';

/** Fondo verde degradado de la marca para las pantallas de entrada. Un velo oscuro mantiene el texto legible. */
export default function FondoAuth({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.raiz}>
      <Image source={require('../../assets/fondo-auth.jpg')} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, s.velo]} />
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: '#020202' },
  velo: { backgroundColor: 'rgba(2,2,2,0.25)' },
});
