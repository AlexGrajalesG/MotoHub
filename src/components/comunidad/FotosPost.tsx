import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { tokens } from '../../lib/tokens';
import { useVisorImagenes } from '../VisorImagenes';

const { colors, spacing, radius, fonts } = tokens;

/** Fotos de una publicación: una sola ocupa todo el ancho; varias se deslizan con contador. Al tocar se ven en grande y se pueden acercar. */
export default function FotosPost({ urls }: { urls: string[] }) {
  const [ancho, setAncho] = useState(0);
  const [actual, setActual] = useState(0);
  const { abrir, visor } = useVisorImagenes();

  if (urls.length === 0) return null;

  return (
    <View style={s.caja} onLayout={(e: LayoutChangeEvent) => setAncho(Math.round(e.nativeEvent.layout.width))}>
      {ancho > 0 && (
        <FlatList
          data={urls}
          keyExtractor={(u, i) => `${u}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={urls.length > 1}
          onMomentumScrollEnd={e => setActual(Math.round(e.nativeEvent.contentOffset.x / ancho))}
          getItemLayout={(_, i) => ({ length: ancho, offset: ancho * i, index: i })}
          renderItem={({ item, index }) => (
            <Pressable onPress={() => abrir(urls, index)} accessibilityRole="imagebutton" accessibilityLabel={`Ver foto ${index + 1} de ${urls.length}`}>
              <Image source={{ uri: item }} style={{ width: ancho, height: ancho * 0.75 }} contentFit="cover" cachePolicy="memory-disk" transition={150} />
            </Pressable>
          )}
        />
      )}
      {urls.length > 1 && (
        <>
          <View style={s.contador}><Text style={s.contadorTexto}>{actual + 1}/{urls.length}</Text></View>
          <View style={s.puntos}>
            {urls.map((_, i) => <View key={i} style={[s.punto, i === actual && s.puntoOn]} />)}
          </View>
        </>
      )}
      {visor}
    </View>
  );
}

const s = StyleSheet.create({
  caja: { marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.bgSurface },
  contador: { position: 'absolute', top: spacing.md, right: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.6)' },
  contadorTexto: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },
  puntos: { position: 'absolute', bottom: spacing.sm, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  puntoOn: { backgroundColor: '#fff' },
});
