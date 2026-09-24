import { useState, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, FlatList, Animated, PanResponder, useWindowDimensions,
  StatusBar, type GestureResponderEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { IconX, IconTrash } from '@tabler/icons-react-native';
import { tokens } from '../lib/tokens';

const { spacing, fonts, radius } = tokens;

const ZOOM_MAX = 4;
const ZOOM_DOBLE_TOQUE = 2.5;
const VENTANA_DOBLE_TOQUE = 280;

function distancia(e: GestureResponderEvent): number {
  const [a, b] = e.nativeEvent.touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

/** Una imagen que se acerca con pellizco, se mueve con un dedo cuando está ampliada y con doble toque alterna el zoom. */
function ImagenZoom({ uri, ancho, alto, onZoom }: { uri: string; ancho: number; alto: number; onZoom: (activo: boolean) => void }) {
  const escala = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const est = useRef({ escala: 1, tx: 0, ty: 0, dedos: 0, baseTx: 0, baseTy: 0, baseDx: 0, baseDy: 0, distIni: 1, escalaIni: 1, ultimoToque: 0 }).current;

  const limites = useCallback((e: number) => ({ x: ((e - 1) * ancho) / 2, y: ((e - 1) * alto) / 2 }), [ancho, alto]);
  const acotar = (v: number, max: number) => Math.max(-max, Math.min(max, v));

  const aplicar = useCallback(() => {
    escala.setValue(est.escala); tx.setValue(est.tx); ty.setValue(est.ty);
  }, [escala, tx, ty, est]);

  const animarA = useCallback((e: number, x: number, y: number) => {
    est.escala = e; est.tx = x; est.ty = y;
    Animated.parallel([
      Animated.spring(escala, { toValue: e, useNativeDriver: false, bounciness: 0 }),
      Animated.spring(tx, { toValue: x, useNativeDriver: false, bounciness: 0 }),
      Animated.spring(ty, { toValue: y, useNativeDriver: false, bounciness: 0 }),
    ]).start();
    onZoom(e > 1.01);
  }, [escala, tx, ty, est, onZoom]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.numberActiveTouches >= 2 || est.escala > 1.01,
    onPanResponderTerminationRequest: () => est.escala <= 1.01,
    onPanResponderGrant: (e) => {
      est.dedos = e.nativeEvent.touches.length;
      est.baseTx = est.tx; est.baseTy = est.ty; est.baseDx = 0; est.baseDy = 0;
      est.escalaIni = est.escala;
      if (est.dedos >= 2) est.distIni = Math.max(distancia(e), 1);
    },
    onPanResponderMove: (e, g) => {
      const dedos = e.nativeEvent.touches.length;
      if (dedos !== est.dedos) {
        // cambió la cantidad de dedos: se toma lo actual como punto de partida
        est.dedos = dedos;
        est.baseTx = est.tx; est.baseTy = est.ty; est.baseDx = g.dx; est.baseDy = g.dy;
        est.escalaIni = est.escala;
        if (dedos >= 2) est.distIni = Math.max(distancia(e), 1);
      }
      if (dedos >= 2) {
        est.escala = Math.max(1, Math.min(ZOOM_MAX, est.escalaIni * (distancia(e) / est.distIni)));
        const l = limites(est.escala);
        est.tx = acotar(est.tx, l.x); est.ty = acotar(est.ty, l.y);
        onZoom(est.escala > 1.01);
      } else if (est.escala > 1.01) {
        const l = limites(est.escala);
        est.tx = acotar(est.baseTx + (g.dx - est.baseDx), l.x);
        est.ty = acotar(est.baseTy + (g.dy - est.baseDy), l.y);
      }
      aplicar();
    },
    onPanResponderRelease: (_, g) => {
      const fueToque = Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8 && est.dedos <= 1;
      if (fueToque) {
        const ahora = Date.now();
        if (ahora - est.ultimoToque < VENTANA_DOBLE_TOQUE) {
          est.ultimoToque = 0;
          if (est.escala > 1.01) animarA(1, 0, 0);
          else animarA(ZOOM_DOBLE_TOQUE, 0, 0);
          return;
        }
        est.ultimoToque = ahora;
      }
      if (est.escala < 1.05) animarA(1, 0, 0);
      else onZoom(true);
    },
    onPanResponderTerminate: () => { if (est.escala < 1.05) animarA(1, 0, 0); },
  }), [limites, aplicar, animarA, onZoom, est]);

  return (
    <View style={{ width: ancho, height: alto, justifyContent: 'center', alignItems: 'center' }} {...responder.panHandlers}>
      <Animated.View style={{ width: ancho, height: alto, transform: [{ translateX: tx }, { translateY: ty }, { scale: escala }] }}>
        <Image source={{ uri }} style={{ width: ancho, height: alto }} contentFit="contain" cachePolicy="memory-disk" transition={150} />
      </Animated.View>
    </View>
  );
}

/**
 * Visor de imágenes a pantalla completa: desliza entre varias, pellizca para acercar, doble toque para alternar el zoom.
 * `onQuitar` agrega un botón para quitar la imagen que se está viendo.
 */
export default function VisorImagenes({ urls, inicio, onCerrar, onQuitar }: {
  urls: string[]; inicio: number | null; onCerrar: () => void; onQuitar?: (url: string) => void;
}) {
  const { width, height } = useWindowDimensions();
  const [actual, setActual] = useState(0);
  const [zoomActivo, setZoomActivo] = useState(false);

  const visible = inicio !== null && urls.length > 0;
  const indice = Math.min(actual, urls.length - 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCerrar}
      onShow={() => { setActual(inicio ?? 0); setZoomActivo(false); }}
    >
      <View style={s.fondo}>
        <StatusBar barStyle="light-content" />
        {visible && (
          <FlatList
            data={urls}
            keyExtractor={(u, i) => `${u}-${i}`}
            horizontal
            pagingEnabled
            scrollEnabled={!zoomActivo && urls.length > 1}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(inicio ?? 0, urls.length - 1)}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={e => { setActual(Math.round(e.nativeEvent.contentOffset.x / width)); setZoomActivo(false); }}
            renderItem={({ item }) => <ImagenZoom uri={item} ancho={width} alto={height} onZoom={setZoomActivo} />}
          />
        )}

        <Pressable style={s.cerrar} onPress={onCerrar} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar imagen">
          <IconX size={22} color="#fff" />
        </Pressable>

        {visible && urls.length > 1 && (
          <View style={s.contador} pointerEvents="none"><Text style={s.contadorTexto}>{indice + 1} / {urls.length}</Text></View>
        )}

        {visible && !zoomActivo && (
          <Text style={s.ayuda} pointerEvents="none">Pellizca o toca dos veces para acercar</Text>
        )}

        {visible && onQuitar && (
          <Pressable style={s.quitar} onPress={() => onQuitar(urls[indice])} accessibilityRole="button" accessibilityLabel="Quitar imagen">
            <IconTrash size={18} color="#fff" />
            <Text style={s.quitarTexto}>Quitar</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

/** Estado listo para usar: `abrir(urls, indice)` y renderizar `visor` una sola vez en la pantalla. */
export function useVisorImagenes(onQuitar?: (url: string) => void) {
  const [estado, setEstado] = useState<{ urls: string[]; inicio: number | null }>({ urls: [], inicio: null });
  const abrir = useCallback((urls: string[], indice = 0) => setEstado({ urls, inicio: indice }), []);
  const cerrar = useCallback(() => setEstado(e => ({ ...e, inicio: null })), []);
  const visor = <VisorImagenes urls={estado.urls} inicio={estado.inicio} onCerrar={cerrar} onQuitar={onQuitar} />;
  return { abrir, cerrar, visor };
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)' },
  cerrar: {
    position: 'absolute', top: 52, right: spacing.xl, width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center',
  },
  contador: {
    position: 'absolute', top: 60, alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.16)',
  },
  contadorTexto: { fontFamily: fonts.heading, fontSize: 13, color: '#fff' },
  ayuda: { position: 'absolute', bottom: 44, alignSelf: 'center', fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  quitar: {
    position: 'absolute', bottom: 90, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48,
    paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: 'rgba(224,85,85,0.92)',
  },
  quitarTexto: { fontFamily: fonts.bold, fontSize: 15, color: '#fff' },
});
