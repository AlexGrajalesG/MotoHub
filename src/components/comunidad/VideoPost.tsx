import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { IconPlayerPlay, IconBrandTiktok, IconBrandInstagram } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { openUrl } from '../../lib/openUrl';
import { resolverVideo, type VideoResuelto } from '../../lib/videoEmbed';
import type { VideoPlataforma } from '../../lib/comunidadTexto';

const { colors, spacing, radius, fonts } = tokens;

// Misma proporción que las fotos del feed (FotosPost) para que la tarjeta se vea consistente.
const RATIO_ALTO = 0.75;

/**
 * Video de TikTok o Instagram: tarjeta con miniatura y botón de reproducir, como en el diseño de Stitch.
 * Se renunció a reproducirlo dentro de la app (WebView de TikTok poco confiable: se quedaba cargando,
 * mostraba la página completa en vez del video, o sacaba de la app sola). Al tocar, se abre en la app
 * nativa o el navegador — siempre funciona, y ahí sí se ve con sonido, likes y comentarios reales.
 */
export default function VideoPost({ url, plataforma }: { url: string; plataforma: VideoPlataforma }) {
  const [video, setVideo] = useState<VideoResuelto | null | undefined>(undefined);
  const [ancho, setAncho] = useState(0);

  useEffect(() => {
    let vivo = true;
    resolverVideo(url, plataforma).then(v => { if (vivo) setVideo(v); });
    return () => { vivo = false; };
  }, [url, plataforma]);

  const Marca = plataforma === 'instagram' ? IconBrandInstagram : IconBrandTiktok;
  const nombre = plataforma === 'instagram' ? 'Instagram' : 'TikTok';
  const cargando = video === undefined;

  return (
    <View style={s.wrap}>
      <View style={s.etiqueta}>
        <Marca size={14} color={colors.textSecondary} />
        <Text style={s.etiquetaTexto}>Video de {nombre}</Text>
      </View>

      <Pressable
        onPress={() => openUrl(url)}
        onLayout={e => setAncho(Math.round(e.nativeEvent.layout.width))}
        accessibilityRole="button"
        accessibilityLabel={`Ver video de ${nombre}`}
      >
        <View style={[s.caja, { height: ancho > 0 ? ancho * RATIO_ALTO : 220 }]}>
          {video?.miniatura
            ? <Image source={{ uri: video.miniatura }} style={StyleSheet.absoluteFill} contentFit="cover" />
            : <LinearGradient colors={['#133210', '#0b1c0a', '#020202']} style={StyleSheet.absoluteFill} />}
          <View style={s.velo} />
          <View style={s.centro}>
            {cargando
              ? <ActivityIndicator color="#fff" />
              : <View style={s.play}><IconPlayerPlay size={28} color="#fff" fill="#fff" /></View>}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const RELLENO = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

const s = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  etiquetaTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  caja: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000' },
  velo: { ...RELLENO, backgroundColor: 'rgba(0,0,0,0.28)' },
  centro: { ...RELLENO, justifyContent: 'center', alignItems: 'center' },
  play: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center', paddingLeft: 3,
  },
});
