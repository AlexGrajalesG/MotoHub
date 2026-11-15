import { useState, useCallback, useRef, useMemo, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, Pressable, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { IconArrowLeft, IconSend, IconDotsVertical, IconClock, IconBan } from '@tabler/icons-react-native';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { estilosTema } from '../../lib/estilosTema';
import { useRealtimeRefresh } from '../../lib/useRealtimeRefresh';
import { bloquearUsuario } from '../../lib/comunidad';
import { inicialDe } from '../../lib/bandejaTexto';
import {
  fetchConversacion, fetchMensajesConversacion, fetchParticipantes, enviarMensajeConversacion,
  responderSolicitud, marcarConversacionLeida, reportarMensaje,
  type Conversacion, type MensajeConversacion, type ParticipanteConversacion,
} from '../../lib/conversaciones';
import {
  estadoComposer, avisoPrimerMensaje, textoEsperandoRespuesta, textoSolicitudRecibida, TEXTO_RECHAZADA,
  LARGO_MAXIMO_MENSAJE,
} from '../../lib/conversacionesTexto';

const { colors, spacing, radius, fonts } = tokens;

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

const Burbuja = memo(function Burbuja({ item, mio, onReportar }: {
  item: MensajeConversacion; mio: boolean; onReportar: (m: MensajeConversacion) => void;
}) {
  const eliminado = !!item.eliminado_at;
  return (
    <View style={[s.burbujaFila, mio ? s.filaMia : s.filaOtro]}>
      <Pressable
        style={[s.burbuja, mio ? s.burbujaMia : s.burbujaOtro]}
        onLongPress={!mio && !eliminado ? () => onReportar(item) : undefined}
        delayLongPress={350}
        accessibilityLabel={`${mio ? 'Tú' : 'Ellos'}: ${item.texto}, ${formatHora(item.created_at)}`}
        accessibilityHint={!mio && !eliminado ? 'Mantén presionado para reportar este mensaje' : undefined}
      >
        <Text style={[s.burbujaTexto, mio && s.burbujaTextoMia, eliminado && s.burbujaEliminada]}>{item.texto}</Text>
        <Text style={[s.burbujaHora, mio && s.burbujaHoraMia]}>{formatHora(item.created_at)}</Text>
      </Pressable>
    </View>
  );
});

function PanelAviso({ icono, texto }: { icono: React.ReactNode; texto: string }) {
  return (
    <View style={s.panel} accessibilityRole="alert">
      {icono}
      <Text style={s.panelTexto}>{texto}</Text>
    </View>
  );
}

/** Conversación fuera de las citas: chat directo entre cuentas o consulta a un negocio. */
export default function ChatConversacionScreen({ route, navigation }: any) {
  const conversacionId: string = route.params.conversacionId;
  const { session } = useAuth();
  const miId = session?.user.id;

  const [conv, setConv] = useState<Conversacion | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteConversacion[]>([]);
  const [mensajes, setMensajes] = useState<MensajeConversacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [respondiendo, setRespondiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const cargar = useCallback(async () => {
    const [c, m, p] = await Promise.all([
      fetchConversacion(conversacionId), fetchMensajesConversacion(conversacionId), fetchParticipantes(conversacionId),
    ]);
    setConv(c);
    setMensajes(m);
    setParticipantes(p);
    if (c) marcarConversacionLeida(conversacionId);
  }, [conversacionId]);

  useFocusEffect(useCallback(() => {
    cargar().finally(() => setCargando(false));
  }, [cargar]));

  useRealtimeRefresh('mensajes_conversacion', `conversacion_id=eq.${conversacionId}`, cargar);
  useRealtimeRefresh('conversaciones', `id=eq.${conversacionId}`, cargar);

  const miRol = participantes.find(p => p.usuario_id === miId)?.rol;
  const contraparte = useMemo(() => {
    if (!conv) return undefined;
    if (conv.tipo === 'directa') return participantes.find(p => p.usuario_id !== miId);
    return participantes.find(p => p.rol === (miRol === 'cliente' ? 'negocio' : 'cliente'));
  }, [conv, participantes, miId, miRol]);
  const mecanicoSumado = conv?.tipo === 'consulta_negocio' && miRol === 'cliente'
    ? participantes.find(p => p.rol === 'mecanico')
    : undefined;

  const nombre = contraparte?.nombre ?? 'Conversación';
  const subtitulo = conv?.tipo === 'consulta_negocio'
    ? (mecanicoSumado ? `Consulta · te atiende ${mecanicoSumado.nombre}` : 'Consulta')
    : (contraparte?.nombre_usuario ? `@${contraparte.nombre_usuario}` : '');

  const iniciadaPorMi = conv?.iniciada_por === miId;
  const yaEnvieMensaje = mensajes.some(m => m.autor_id === miId);
  const composer = conv
    ? estadoComposer({ tipo: conv.tipo, estado: conv.estado, iniciadaPorMi, yaEnvieMensaje })
    : 'escribir';
  const aviso = conv ? avisoPrimerMensaje({ tipo: conv.tipo, estado: conv.estado, iniciadaPorMi, yaEnvieMensaje }) : null;

  async function enviar() {
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setError(null);
    const r = await enviarMensajeConversacion(conversacionId, limpio);
    setEnviando(false);
    if (!r.ok) {
      setError(r.mensaje);
      cargar();
      return;
    }
    setTexto('');
    cargar();
  }

  async function responder(aceptar: boolean) {
    setRespondiendo(true);
    const r = await responderSolicitud(conversacionId, aceptar);
    setRespondiendo(false);
    if (!r.ok) { Alert.alert('No se pudo responder', r.mensaje); return; }
    if (aceptar) cargar(); else navigation.goBack();
  }

  function confirmarBloqueo() {
    if (!contraparte) return;
    Alert.alert(
      `¿Bloquear a ${contraparte.nombre}?`,
      'No podrán escribirse, seguirse ni encontrarse en búsquedas. Si se seguían, dejan de seguirse.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear', style: 'destructive',
          onPress: async () => {
            const r = await bloquearUsuario(contraparte.usuario_id);
            if (r.ok) navigation.goBack(); else Alert.alert('No se pudo bloquear', r.mensaje);
          },
        },
      ],
    );
  }

  const reportar = useCallback((m: MensajeConversacion) => {
    const enviarReporte = async (motivo: string) => {
      const r = await reportarMensaje(m.id, motivo);
      Alert.alert(r.ok ? 'Reporte enviado' : 'No se pudo reportar', r.ok
        ? 'Gracias. El equipo de Rodix revisará este mensaje. La otra persona no sabrá quién lo reportó.'
        : r.mensaje);
    };
    Alert.alert(
      'Reportar mensaje',
      'El equipo de Rodix podrá ver este mensaje para revisarlo. ¿Por qué lo reportas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Es spam', onPress: () => enviarReporte('spam') },
        { text: 'Es ofensivo', onPress: () => enviarReporte('ofensivo') },
      ],
    );
  }, []);

  function abrirMenu() {
    const botones: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [];
    if (contraparte) botones.push({ text: `Bloquear a ${contraparte.nombre}`, style: 'destructive', onPress: confirmarBloqueo });
    if (conv?.tipo === 'consulta_negocio' && miRol === 'negocio') {
      botones.push({ text: 'Sumar a un mecánico', onPress: () => navigation.navigate('SumarMecanico', { conversacionId, negocioId: conv.negocio_id }) });
    }
    botones.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert(nombre, 'Mantén presionado un mensaje de la otra persona para reportarlo.', botones);
  }

  if (cargando) {
    return <View style={s.centro}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }
  if (!conv) {
    return (
      <View style={s.centro}>
        <Text style={s.vacioTexto}>Esta conversación ya no está disponible.</Text>
        <Pressable style={s.btnSecundario} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={s.btnSecundarioTexto}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Pressable style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]} onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Volver">
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={s.avatar}><Text style={s.avatarTexto}>{inicialDe(nombre)}</Text></View>
        <View style={s.headerCentro}>
          <Text style={s.titulo} numberOfLines={1} accessibilityRole="header">{nombre}</Text>
          {!!subtitulo && <Text style={s.subtitulo} numberOfLines={1}>{subtitulo}</Text>}
        </View>
        <Pressable style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]} onPress={abrirMenu} hitSlop={8} accessibilityLabel="Más opciones">
          <IconDotsVertical size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={mensajes}
        keyExtractor={m => m.id}
        contentContainerStyle={s.lista}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => <Burbuja item={item} mio={item.autor_id === miId} onReportar={reportar} />}
        ListEmptyComponent={
          <View style={s.vacio}>
            <Text style={s.vacioTexto}>
              {conv.tipo === 'consulta_negocio'
                ? 'Cuéntale al negocio qué necesitas. Te responderán por aquí.'
                : `Escribe tu primer mensaje a ${nombre}.`}
            </Text>
          </View>
        }
      />

      {composer === 'responder_solicitud' && (
        <View style={s.zonaInferior}>
          <Text style={s.panelTexto}>{textoSolicitudRecibida(nombre)}</Text>
          <View style={s.botonesFila}>
            <Pressable
              style={({ pressed }) => [s.btnPrimario, pressed && { opacity: 0.85 }, respondiendo && s.deshabilitado]}
              onPress={() => responder(true)} disabled={respondiendo} accessibilityRole="button"
            >
              <Text style={s.btnPrimarioTexto}>Aceptar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.btnSecundario, pressed && { opacity: 0.85 }, respondiendo && s.deshabilitado]}
              onPress={() => responder(false)} disabled={respondiendo} accessibilityRole="button"
            >
              <Text style={s.btnSecundarioTexto}>Rechazar</Text>
            </Pressable>
          </View>
          <Pressable style={s.enlacePeligro} onPress={confirmarBloqueo} accessibilityRole="button">
            <IconBan size={16} color={colors.dangerAction} />
            <Text style={s.enlacePeligroTexto}>Bloquear a {nombre}</Text>
          </Pressable>
        </View>
      )}

      {composer === 'esperando_respuesta' && (
        <PanelAviso icono={<IconClock size={18} color={colors.textSecondary} />} texto={textoEsperandoRespuesta(nombre)} />
      )}

      {composer === 'rechazada' && (
        <PanelAviso icono={<IconBan size={18} color={colors.textSecondary} />} texto={TEXTO_RECHAZADA} />
      )}

      {composer === 'escribir' && (
        <View style={s.zonaInferior}>
          {!!aviso && <Text style={s.avisoTexto}>{aviso}</Text>}
          {!!error && <Text style={s.errorTexto} accessibilityRole="alert">{error}</Text>}
          <View style={s.inputFila}>
            <TextInput
              style={s.input}
              placeholder="Escribe un mensaje…"
              placeholderTextColor={colors.textTertiary}
              value={texto}
              onChangeText={t => { setTexto(t); if (error) setError(null); }}
              maxLength={LARGO_MAXIMO_MENSAJE}
              multiline
              accessibilityLabel="Mensaje"
            />
            <Pressable
              style={({ pressed }) => [s.enviarBtn, (!texto.trim() || enviando) && s.deshabilitado, pressed && { opacity: 0.85 }]}
              onPress={enviar}
              disabled={!texto.trim() || enviando}
              hitSlop={4}
              accessibilityLabel="Enviar mensaje"
              accessibilityRole="button"
            >
              {enviando ? <ActivityIndicator size="small" color={colors.onAccent} /> : <IconSend size={20} color={colors.onAccent} />}
            </Pressable>
          </View>
          {texto.length > LARGO_MAXIMO_MENSAJE - 200 && (
            <Text style={s.contador}>{texto.length}/{LARGO_MAXIMO_MENSAJE}</Text>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = estilosTema(() => ({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.bgPrimary },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.bgSurface,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center',
  },
  avatarTexto: { fontFamily: fonts.display, fontSize: 16, color: colors.accent },
  headerCentro: { flex: 1 },
  titulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  subtitulo: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 1 },

  lista: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  vacioTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  burbujaFila: { flexDirection: 'row' },
  filaMia: { justifyContent: 'flex-end' },
  filaOtro: { justifyContent: 'flex-start' },
  burbuja: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4 },
  burbujaMia: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  burbujaOtro: { backgroundColor: colors.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.bgSurface },
  burbujaTexto: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, lineHeight: 21 },
  burbujaTextoMia: { color: colors.onAccent },
  burbujaEliminada: { fontStyle: 'italic', color: colors.textTertiary },
  burbujaHora: { fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, alignSelf: 'flex-end' },
  burbujaHoraMia: { color: colors.onAccent, opacity: 0.75 },

  zonaInferior: {
    gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.bgSurface, backgroundColor: colors.bgPrimary,
  },
  panel: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.bgSurface, backgroundColor: colors.bgCard,
  },
  panelTexto: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  avisoTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  errorTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.dangerAction, lineHeight: 18 },
  contador: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, alignSelf: 'flex-end' },

  inputFila: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  enviarBtn: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  deshabilitado: { opacity: 0.4 },

  botonesFila: { flexDirection: 'row', gap: spacing.md },
  btnPrimario: { flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  btnPrimarioTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
  btnSecundario: {
    flex: 1, minHeight: 48, paddingHorizontal: spacing.xl, borderRadius: radius.md, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center',
  },
  btnSecundarioTexto: { fontFamily: fonts.heading, fontSize: 16, color: colors.textPrimary },
  enlacePeligro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  enlacePeligroTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.dangerAction },
}));
