import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { IconPlayerPlay, IconBrandTiktok, IconBrandInstagram, IconExternalLink } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { openUrl } from '../../lib/openUrl';
import { resolverVideo, type VideoResuelto } from '../../lib/videoEmbed';
import type { VideoPlataforma } from '../../lib/comunidadTexto';

const { colors, spacing, radius, fonts } = tokens;

// Misma proporción que las fotos del feed (FotosPost) para que la tarjeta se vea consistente.
const RATIO_ALTO = 0.75;
const TIEMPO_LIMITE_MS = 8000;
const RELLENO = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

/** Pagina minima que carga el snippet OFICIAL de embed de TikTok (el mismo que usan sitios de noticias),
 *  no su pagina completa — por eso no trae cabecera, boton de seguir ni avisos de cookies. */
function paginaEmbedTikTok(embedHtml: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>html,body{margin:0;padding:0;background:#000;overflow:hidden;display:flex;justify-content:center;align-items:center;min-height:100vh;}</style>
</head><body>${embedHtml}<script async src="https://www.tiktok.com/embed.js"></script></body></html>`;
}

type Estado = 'cargando' | 'listo' | 'error';

/** Video de TikTok o Instagram en el feed de Comunidad. */
export default function VideoPost({ url, plataforma }: { url: string; plataforma: VideoPlataforma }) {
  const [video, setVideo] = useState<VideoResuelto | null | undefined>(undefined);
  const [ancho, setAncho] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    resolverVideo(url, plataforma).then(v => { if (vivo) setVideo(v); });
    return () => { vivo = false; };
  }, [url, plataforma]);

  // Nunca se queda pegado: si a los 8s no avisó éxito ni error, se vuelve a la miniatura.
  useEffect(() => {
    if (!reproduciendo) return;
    setEstado('cargando');
    const limite = setTimeout(() => setEstado(e => (e === 'cargando' ? 'error' : e)), TIEMPO_LIMITE_MS);
    return () => clearTimeout(limite);
  }, [reproduciendo, intento]);

  useEffect(() => {
    if (estado === 'error') setReproduciendo(false);
  }, [estado]);

  const Marca = plataforma === 'instagram' ? IconBrandInstagram : IconBrandTiktok;
  const nombre = plataforma === 'instagram' ? 'Instagram' : 'TikTok';
  const cargando = video === undefined;
  // Instagram no tiene snippet oficial disponible (oEmbed de Meta pide credenciales de app) — directo a abrir afuera.
  const puedeReproducirAdentro = !!video?.embedHtml;

  function tocar() {
    if (!video) return;
    if (puedeReproducirAdentro) { setIntento(i => i + 1); setReproduciendo(true); }
    else openUrl(url);
  }

  return (
    <View style={s.wrap}>
      <View style={s.etiqueta}>
        <Marca size={14} color={colors.textSecondary} />
        <Text style={s.etiquetaTexto}>Video de {nombre}</Text>
      </View>

      <View style={[s.caja, { height: ancho > 0 ? ancho * RATIO_ALTO : 220 }]} onLayout={e => setAncho(Math.round(e.nativeEvent.layout.width))}>
        {reproduciendo && video?.embedHtml ? (
          <>
            <WebView
              key={intento}
              source={{ html: paginaEmbedTikTok(video.embedHtml) }}
              style={s.web}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              onLoadEnd={() => setTimeout(() => setEstado(e => (e === 'error' ? e : 'listo')), 1200)}
              onError={() => setEstado('error')}
              onHttpError={() => setEstado('error')}
            />
            {estado === 'cargando' && <View style={s.centro}><ActivityIndicator color={colors.accent} /></View>}
          </>
        ) : (
          <Pressable style={StyleSheet.absoluteFill} onPress={tocar} disabled={!video} accessibilityRole="button" accessibilityLabel={`Reproducir video de ${nombre}`}>
            {video?.miniatura
              ? <Image source={{ uri: video.miniatura }} style={StyleSheet.absoluteFill} contentFit="cover" />
              : <LinearGradient colors={['#133210', '#0b1c0a', '#020202']} style={StyleSheet.absoluteFill} />}
            <View style={s.velo} />
            <View style={s.centro}>
              {cargando
                ? <ActivityIndicator color="#fff" />
                : <View style={s.play}><IconPlayerPlay size={28} color="#fff" fill="#fff" /></View>}
            </View>
          </Pressable>
        )}
      </View>

      <Pressable style={({ pressed }) => [s.abrir, pressed && { opacity: 0.8 }]} onPress={() => openUrl(url)} hitSlop={8} accessibilityRole="link">
        <Text style={s.abrirTexto}>Abrir en {nombre}</Text>
        <IconExternalLink size={13} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  etiquetaTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  caja: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000' },
  web: { flex: 1, backgroundColor: '#000' },
  velo: { ...RELLENO, backgroundColor: 'rgba(0,0,0,0.28)' },
  centro: { ...RELLENO, justifyContent: 'center', alignItems: 'center' },
  play: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center', paddingLeft: 3,
  },
  abrir: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', minHeight: 44, paddingVertical: spacing.sm, marginTop: 2 },
  abrirTexto: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
});
