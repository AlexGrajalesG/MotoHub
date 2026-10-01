import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { IconPlayerPlay, IconBrandTiktok, IconBrandInstagram, IconExternalLink, IconAlertTriangle } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { openUrl } from '../../lib/openUrl';
import { resolverVideo, hostPermitido, type VideoResuelto } from '../../lib/videoEmbed';
import type { VideoPlataforma } from '../../lib/comunidadTexto';

const { colors, spacing, radius, fonts } = tokens;

// Video vertical (TikTok y Reels son 9:16): el encuadre se calcula del ancho real de la tarjeta,
// nunca un alto fijo, para no cortar el video ni dejar franjas negras.
const RATIO_VERTICAL = 9 / 16;
const TIEMPO_LIMITE_MS = 8000;
const RELLENO = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };
const UA_MOVIL = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

// Mejor esfuerzo: esconde la cáscara de la página (cabecera, botón de seguir, avisos de
// cookies/login) para que quede solo el video o la foto. TikTok/Instagram pueden cambiar
// sus nombres de clase en cualquier momento — si deja de funcionar, se ajustan los selectores.
const CSS_LIMPIEZA = `
  header, nav, footer, [role="banner"], [role="navigation"], [role="contentinfo"],
  [class*="follow" i], [class*="cookie" i], [class*="consent-banner" i], [class*="LoginPanel" i]
  { display: none !important; }
  html, body { margin: 0 !important; padding: 0 !important; background: #000 !important; }
`;
const JS_LIMPIEZA = `
  (function () {
    var s = document.createElement('style');
    s.innerHTML = ${JSON.stringify(CSS_LIMPIEZA)};
    document.documentElement.appendChild(s);
  })();
  true;
`;

type Estado = 'cargando' | 'listo' | 'error';

/** Video de TikTok o Instagram: portada con botón de reproducir; al tocar se reproduce aquí mismo, encuadrado 9:16. */
export default function VideoPost({ url, plataforma }: { url: string; plataforma: VideoPlataforma }) {
  const { height: altoVentana } = useWindowDimensions();
  const [video, setVideo] = useState<VideoResuelto | null | undefined>(undefined);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [intento, setIntento] = useState(0);
  const [anchoCaja, setAnchoCaja] = useState(0);

  useEffect(() => {
    let vivo = true;
    resolverVideo(url, plataforma).then(v => { if (vivo) setVideo(v); });
    return () => { vivo = false; };
  }, [url, plataforma]);

  // Nunca se queda cargando para siempre: si a los 8s no avisó éxito ni error, se da por fallido.
  useEffect(() => {
    if (!reproduciendo) return;
    setEstado('cargando');
    const limite = setTimeout(() => setEstado(e => (e === 'cargando' ? 'error' : e)), TIEMPO_LIMITE_MS);
    return () => clearTimeout(limite);
  }, [reproduciendo, intento]);

  const Marca = plataforma === 'instagram' ? IconBrandInstagram : IconBrandTiktok;
  const nombre = plataforma === 'instagram' ? 'Instagram' : 'TikTok';
  const alto = anchoCaja > 0 ? Math.min(anchoCaja / RATIO_VERTICAL, altoVentana * 0.68) : altoVentana * 0.5;

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
      <View style={[s.caja, { height: alto }]} onLayout={e => setAnchoCaja(e.nativeEvent.layout.width)}>
        {!reproduciendo || !video ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (video) { setIntento(i => i + 1); setReproduciendo(true); } }} disabled={!video} accessibilityRole="button" accessibilityLabel={`Reproducir video de ${nombre}`}>
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
        ) : estado === 'error' ? (
          <Pressable style={s.errorBox} onPress={() => setIntento(i => i + 1)} accessibilityRole="button" accessibilityLabel="Reintentar cargar el video">
            <IconAlertTriangle size={22} color={colors.textTertiary} />
            <Text style={s.errorTexto}>No pudimos cargar el video aquí.{'\n'}Toca para reintentar.</Text>
          </Pressable>
        ) : (
          <>
            <WebView
              key={intento}
              source={{ uri: video.embedUrl }}
              style={s.web}
              userAgent={UA_MOVIL}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
              injectedJavaScriptBeforeContentLoaded={JS_LIMPIEZA}
              injectedJavaScript={JS_LIMPIEZA}
              onLoadEnd={() => setEstado(e => (e === 'error' ? e : 'listo'))}
              onError={() => setEstado('error')}
              onHttpError={() => setEstado('error')}
              onShouldStartLoadWithRequest={req => {
                const permitido = req.url === 'about:blank' || hostPermitido(req.url);
                if (!permitido) console.warn('[VideoPost] navegación bloqueada:', req.url);
                return permitido;
              }}
            />
            {estado === 'cargando' && <View style={s.cargando}><ActivityIndicator color={colors.accent} /></View>}
          </>
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
  caja: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000', marginTop: spacing.md },
  web: { flex: 1, backgroundColor: '#000' },
  cargando: { ...RELLENO, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  velo: { ...RELLENO, backgroundColor: 'rgba(0,0,0,0.28)' },
  centro: { ...RELLENO, justifyContent: 'center', alignItems: 'center' },
  play: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center', paddingLeft: 4 },
  etiqueta: { position: 'absolute', top: spacing.md, left: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.55)' },
  etiquetaTexto: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },
  abrir: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', minHeight: 44, paddingVertical: spacing.sm, marginTop: 2 },
  abrirTexto: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },

  errorBox: { ...RELLENO, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, backgroundColor: '#0a0a0a' },
  errorTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, textAlign: 'center', lineHeight: 18 },

  enlace: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, minHeight: 48, paddingHorizontal: spacing.md,
    backgroundColor: colors.accentDark, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)',
  },
  enlaceTexto: { flex: 1, fontFamily: fonts.heading, fontSize: 14, color: colors.textPrimary },
});
