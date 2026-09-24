import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { IconPlayerPlay, IconBrandTiktok, IconBrandInstagram, IconExternalLink } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { openUrl } from '../../lib/openUrl';
import { resolverVideo, hostPermitido, type VideoResuelto } from '../../lib/videoEmbed';
import type { VideoPlataforma } from '../../lib/comunidadTexto';

const { colors, spacing, radius, fonts } = tokens;

const ALTO = 460;
const RELLENO = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

/** Video de TikTok o Instagram: portada con botón de reproducir; al tocar se reproduce aquí mismo. */
export default function VideoPost({ url, plataforma }: { url: string; plataforma: VideoPlataforma }) {
  const [video, setVideo] = useState<VideoResuelto | null | undefined>(undefined);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [cargandoWeb, setCargandoWeb] = useState(true);

  useEffect(() => {
    let vivo = true;
    resolverVideo(url, plataforma).then(v => { if (vivo) setVideo(v); });
    return () => { vivo = false; };
  }, [url, plataforma]);

  const Marca = plataforma === 'instagram' ? IconBrandInstagram : IconBrandTiktok;
  const nombre = plataforma === 'instagram' ? 'Instagram' : 'TikTok';

  // Sin forma de incrustarlo: queda el enlace para abrirlo en la app de origen.
  if (video === null) {
    return (
      <Pressable style={({ pressed }) => [s.enlace, pressed && { opacity: 0.85 }]} onPress={() => openUrl(url)} accessibilityRole="button" accessibilityLabel={`Abrir en ${nombre}`}>
        <Marca size={20} color={colors.accent} />
        <Text style={s.enlaceTexto}>Ver video en {nombre}</Text>
        <IconExternalLink size={16} color={colors.textTertiary} />
      </Pressable>
    );
  }

  return (
    <View>
      <View style={s.caja}>
        {reproduciendo && video ? (
          <>
            <WebView
              source={{ uri: video.embedUrl }}
              style={s.web}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
              onLoadEnd={() => setCargandoWeb(false)}
              onShouldStartLoadWithRequest={req => {
                if (hostPermitido(req.url)) return true;
                if (req.url === 'about:blank') return true;
                openUrl(req.url);
                return false;
              }}
            />
            {cargandoWeb && <View style={s.cargando}><ActivityIndicator color={colors.accent} /></View>}
          </>
        ) : (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (video) { setCargandoWeb(true); setReproduciendo(true); } }} disabled={!video} accessibilityRole="button" accessibilityLabel={`Reproducir video de ${nombre}`}>
            {video?.miniatura
              ? <Image source={{ uri: video.miniatura }} style={StyleSheet.absoluteFill} contentFit="cover" />
              : <LinearGradient colors={['#133210', '#0b1c0a', '#020202']} style={StyleSheet.absoluteFill} />}
            <View style={s.velo} />
            <View style={s.centro}>
              {video === undefined
                ? <ActivityIndicator color="#fff" />
                : <View style={s.play}><IconPlayerPlay size={30} color="#fff" fill="#fff" /></View>}
            </View>
            <View style={s.etiqueta}>
              <Marca size={14} color="#fff" />
              <Text style={s.etiquetaTexto}>{nombre}</Text>
            </View>
          </Pressable>
        )}
      </View>

      <Pressable style={({ pressed }) => [s.abrir, pressed && { opacity: 0.8 }]} onPress={() => openUrl(url)} hitSlop={6} accessibilityRole="link">
        <Text style={s.abrirTexto}>Abrir en {nombre}</Text>
        <IconExternalLink size={13} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  caja: { height: ALTO, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000', marginTop: spacing.md },
  web: { flex: 1, backgroundColor: '#000' },
  cargando: { ...RELLENO, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  velo: { ...RELLENO, backgroundColor: 'rgba(0,0,0,0.28)' },
  centro: { ...RELLENO, justifyContent: 'center', alignItems: 'center' },
  play: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center', paddingLeft: 4 },
  etiqueta: { position: 'absolute', top: spacing.md, left: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.55)' },
  etiquetaTexto: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },
  abrir: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', minHeight: 32, marginTop: 2 },
  abrirTexto: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },

  enlace: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, minHeight: 48, paddingHorizontal: spacing.md,
    backgroundColor: colors.accentDark, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)',
  },
  enlaceTexto: { flex: 1, fontFamily: fonts.heading, fontSize: 14, color: colors.textPrimary },
});
