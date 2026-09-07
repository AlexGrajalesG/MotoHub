import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  IconArrowLeft, IconPaperclip, IconSend, IconTool, IconClock,
  IconFileText, IconCheck, IconX, IconCircleCheck, IconCircleX, IconReceipt,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { TIPO_LABEL } from '../../lib/historial';
import { formatCOP } from '../../lib/precio';
import {
  fetchMensajes, enviarMensajeTexto, subscribeMensajes, uploadAdjuntoCita,
  resolverRegistroServicio, type MensajeCita, type RolAutor, type Adjunto,
} from '../../lib/mensajesCita';
import { fetchPromedio, type Promedio } from '../../lib/calificaciones';
import { marcarCitaLeida } from '../../lib/lecturas';
import { openUrl } from '../../lib/openUrl';
import EstrellasDisplay from '../../components/EstrellasDisplay';

const { colors, spacing, radius, fonts } = tokens;

type CitaInfo = {
  id: string;
  usuario_id: string;
  estado: string;
  vehiculo_id: string;
  negocio_id: string;
  origen: string;
  negocio: { nombre: string; propietario_id: string } | null;
  vehiculo: { marca: string; modelo: string; placa: string } | null;
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', confirmada: 'Confirmada',
  completada: 'Completada', cancelada: 'Cancelada',
};
const ESTADO_COLORS: Record<string, string> = {
  pendiente: '#f5a623', confirmada: '#5ac8fa',
  completada: '#34c759', cancelada: colors.dangerAction,
};

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatCitaScreen({ route, navigation }: any) {
  const { citaId } = route.params as { citaId: string };
  const { session } = useAuth();

  const [cita, setCita] = useState<CitaInfo | null>(null);
  const [mensajes, setMensajes] = useState<MensajeCita[]>([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [resolviendo, setResolviendo] = useState<string | null>(null);
  const [rolPropio, setRolPropio] = useState<RolAutor>('propietario');
  const [promedioOtro, setPromedioOtro] = useState<Promedio>({ promedio: 0, total: 0 });
  const listRef = useRef<FlatList>(null);

  async function cargarCita() {
    const { data, error } = await supabase
      .from('citas')
      .select(`
        id, usuario_id, estado, vehiculo_id, negocio_id, origen,
        negocio:negocios ( nombre, propietario_id ),
        vehiculo:vehiculos ( marca, modelo, placa )
      `)
      .eq('id', citaId)
      .single();
    if (error) { console.error(error.message); return; }
    const c = { ...data, negocio: (data as any).negocio ?? null, vehiculo: (data as any).vehiculo ?? null } as CitaInfo;
    setCita(c);

    let rol: RolAutor;
    if (c.negocio?.propietario_id === session?.user.id) {
      rol = 'negocio';
    } else if (c.usuario_id === session?.user.id) {
      rol = 'propietario';
    } else {
      const { data: mec } = await supabase
        .from('mecanicos')
        .select('id')
        .eq('negocio_id', c.negocio_id)
        .eq('usuario_id', session?.user.id)
        .eq('activo', true)
        .maybeSingle();
      rol = mec ? 'mecanico' : 'propietario';
    }
    setRolPropio(rol);
    setPromedioOtro(await fetchPromedio(rol === 'propietario' ? 'negocio' : 'usuario', rol === 'propietario' ? c.negocio_id : c.usuario_id));
  }

  async function cargarMensajes() {
    setMensajes(await fetchMensajes(citaId));
  }

  useFocusEffect(useCallback(() => {
    setLoading(true);
    Promise.all([cargarCita(), cargarMensajes()]).finally(() => setLoading(false));
    if (session?.user.id) marcarCitaLeida(citaId, session.user.id);
  }, [citaId]));

  useEffect(() => {
    const unsub = subscribeMensajes(citaId, cargarMensajes);
    return unsub;
  }, [citaId]);

  useEffect(() => {
    if (mensajes.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [mensajes.length]);

  async function handleEnviar() {
    const valor = texto.trim();
    if (!valor || !session) return;
    setEnviando(true);
    setTexto('');
    const { error } = await enviarMensajeTexto(citaId, session.user.id, rolPropio, valor);
    setEnviando(false);
    if (error) Alert.alert('Error', error.message);
  }

  async function handleAdjuntar() {
    Alert.alert('Adjuntar', 'Elige qué quieres enviar', [
      { text: 'Foto', onPress: () => adjuntarFoto('foto') },
      { text: 'Factura', onPress: () => adjuntarDocumento('factura') },
      { text: 'Documento', onPress: () => adjuntarDocumento('documento') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function adjuntarFoto(tipo: Adjunto['tipo']) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    await subirYEnviar(uri, safeExt, tipo);
  }

  async function adjuntarDocumento(tipo: Adjunto['tipo']) {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'pdf';
    await subirYEnviar(asset.uri, ext, tipo);
  }

  async function subirYEnviar(uri: string, ext: string, tipo: Adjunto['tipo']) {
    if (!session) return;
    setEnviando(true);
    const url = await uploadAdjuntoCita(uri, citaId, ext);
    if (!url) {
      setEnviando(false);
      Alert.alert('Error', 'No se pudo subir el archivo');
      return;
    }
    const { error } = await enviarMensajeTexto(citaId, session.user.id, rolPropio, '', [{ url, tipo }]);
    setEnviando(false);
    if (error) Alert.alert('Error', error.message);
  }

  async function handleResolver(historialId: string, aceptar: boolean) {
    setResolviendo(historialId);
    const { error } = await resolverRegistroServicio(historialId, aceptar);
    setResolviendo(null);
    if (error) Alert.alert('Error', error.message);
  }

  function abrirRegistrarServicio() {
    if (!cita) return;
    navigation.navigate('RegistrarServicio', {
      citaId, vehiculoId: cita.vehiculo_id,
      creadoPor: rolPropio === 'mecanico' ? 'mecanico' : 'negocio',
    });
  }

  function renderMensaje(item: MensajeCita) {
    if (item.tipo_mensaje === 'sistema') {
      return (
        <View style={s.sistemaRow}>
          <Text style={s.sistemaText}>{item.texto}</Text>
        </View>
      );
    }

    if (item.tipo_mensaje === 'registro_servicio' && item.historial) {
      return <RegistroCard h={item.historial} rolPropio={rolPropio} busy={resolviendo} onResolver={handleResolver} />;
    }

    const isMine = item.autor_id === session?.user.id;
    return (
      <View style={[s.bubbleRow, isMine ? s.bubbleRowMine : s.bubbleRowOther]}>
        <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleOther]}>
          {item.adjuntos?.map((a, i) => (
            a.tipo === 'foto'
              ? <Image key={i} source={{ uri: a.url }} style={s.adjuntoFoto} resizeMode="cover" />
              : (
                <Pressable key={i} style={s.adjuntoDoc} onPress={() => openUrl(a.url)}>
                  <IconFileText size={16} color={isMine ? '#fff' : colors.accent} />
                  <Text style={[s.adjuntoDocText, { color: isMine ? '#fff' : colors.textPrimary }]}>
                    {a.tipo === 'factura' ? 'Factura' : 'Documento'}
                  </Text>
                </Pressable>
              )
          ))}
          {item.texto && <Text style={[s.bubbleText, isMine && s.bubbleTextMine]}>{item.texto}</Text>}
          <Text style={[s.bubbleHora, isMine && s.bubbleHoraMine]}>{formatHora(item.created_at)}</Text>
        </View>
      </View>
    );
  }

  if (loading || !cita) {
    return <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={s.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {rolPropio !== 'propietario' ? 'Cliente' : (cita.negocio?.nombre ?? 'Negocio')}
            </Text>
            {promedioOtro.total > 0 && <EstrellasDisplay promedio={promedioOtro.promedio} total={promedioOtro.total} size={12} />}
          </View>
          <Text style={s.headerSubtitle} numberOfLines={1}>
            {cita.vehiculo ? `${cita.vehiculo.placa} · ${cita.vehiculo.modelo}` : ''}
          </Text>
          {cita.origen === 'walk_in' && (
            <View style={s.walkinBadge}>
              <Text style={s.walkinBadgeText}>Sin cita previa</Text>
            </View>
          )}
        </View>
        <View style={[s.estadoBadge, { backgroundColor: `${ESTADO_COLORS[cita.estado]}22` }]}>
          <View style={[s.estadoDot, { backgroundColor: ESTADO_COLORS[cita.estado] }]} />
          <Text style={[s.estadoText, { color: ESTADO_COLORS[cita.estado] }]}>{ESTADO_LABELS[cita.estado]}</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={mensajes}
        keyExtractor={m => m.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => renderMensaje(item)}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Aún no hay mensajes. Escribe para iniciar la conversación.</Text>
          </View>
        }
      />

      <View style={s.inputRow}>
        {rolPropio !== 'propietario' && (
          <Pressable
            style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]}
            onPress={abrirRegistrarServicio}
            hitSlop={8}
            accessibilityLabel="Registrar servicio"
          >
            <IconTool size={20} color={colors.accent} />
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]}
          onPress={handleAdjuntar}
          hitSlop={8}
          accessibilityLabel="Adjuntar archivo"
        >
          <IconPaperclip size={20} color={colors.textSecondary} />
        </Pressable>
        <TextInput
          style={s.input}
          placeholder="Escribe un mensaje…"
          placeholderTextColor={colors.textTertiary}
          value={texto}
          onChangeText={setTexto}
          multiline
        />
        <Pressable
          style={({ pressed }) => [s.sendBtn, (!texto.trim() || enviando) && s.sendBtnDisabled, pressed && { opacity: 0.85 }]}
          onPress={handleEnviar}
          disabled={!texto.trim() || enviando}
          hitSlop={8}
          accessibilityLabel="Enviar mensaje"
        >
          {enviando ? <ActivityIndicator size="small" color="#fff" /> : <IconSend size={18} color="#fff" />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function RegistroCard({
  h, rolPropio, busy, onResolver,
}: { h: NonNullable<MensajeCita['historial']>; rolPropio: RolAutor; busy: string | null; onResolver: (id: string, aceptar: boolean) => void }) {
  const pendiente = h.aprobado_propietario === null;

  if (!pendiente) {
    return (
      <View style={s.registroResuelto}>
        {h.aprobado_propietario
          ? <IconCircleCheck size={16} color={colors.success} />
          : <IconCircleX size={16} color={colors.danger} />
        }
        <Text style={[s.registroResueltoText, { color: h.aprobado_propietario ? colors.success : colors.danger }]}>
          {h.aprobado_propietario ? 'Aceptado · agregado a tu historial' : 'Rechazado'}
        </Text>
      </View>
    );
  }

  return (
    <View style={s.registroCard}>
      <View style={s.registroBadge}>
        <IconClock size={13} color={colors.accent} />
        <Text style={s.registroBadgeText}>Esperando tu confirmación</Text>
      </View>

      <Text style={s.registroTitulo}>{TIPO_LABEL[h.tipo] ?? h.tipo}</Text>

      <View style={s.registroTabla}>
        <View style={s.registroFila}>
          <Text style={s.registroLabel}>Fecha</Text>
          <Text style={s.registroValor}>{h.fecha}</Text>
        </View>
        {h.km_en_servicio != null && (
          <View style={s.registroFila}>
            <Text style={s.registroLabel}>Km</Text>
            <Text style={s.registroValor}>{h.km_en_servicio.toLocaleString('es-CO')}</Text>
          </View>
        )}
        {h.costo != null && (
          <View style={s.registroFila}>
            <Text style={s.registroLabel}>Costo</Text>
            <Text style={s.registroValor}>{formatCOP(h.costo)}</Text>
          </View>
        )}
      </View>

      {(h.fotos?.length > 0 || h.factura_url) && (
        <View style={s.registroAdjuntos}>
          {h.fotos?.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={s.registroFoto} resizeMode="cover" />
          ))}
          {h.factura_url && (
            <Pressable style={s.registroFacturaChip} onPress={() => openUrl(h.factura_url!)}>
              <IconReceipt size={14} color={colors.accent} />
              <Text style={s.registroFacturaText}>Factura</Text>
            </Pressable>
          )}
        </View>
      )}

      {rolPropio === 'propietario' && (
        <View style={s.registroAcciones}>
          <Pressable
            style={({ pressed }) => [s.registroBtnPrimario, pressed && { opacity: 0.85 }]}
            onPress={() => onResolver(h.id, true)}
            disabled={busy === h.id}
          >
            {busy === h.id
              ? <ActivityIndicator size="small" color="#fff" />
              : <><IconCheck size={16} color="#fff" /><Text style={s.registroBtnPrimarioText}>Aceptar y agregar a mi historial</Text></>
            }
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.registroBtnSecundario, pressed && { opacity: 0.85 }]}
            onPress={() => onResolver(h.id, false)}
            disabled={busy === h.id}
          >
            <IconX size={16} color={colors.textSecondary} />
            <Text style={s.registroBtnSecundarioText}>Rechazar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
    gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.bgSurface,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter:  { flex: 1 },
  headerTitle:   { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  headerSubtitle:{ fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 1 },
  walkinBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.bgCard, borderRadius: radius.sm,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 3,
  },
  walkinBadgeText: { fontFamily: fonts.heading, fontSize: 10, color: colors.textTertiary },
  estadoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4,
  },
  estadoDot:  { width: 6, height: 6, borderRadius: 3 },
  estadoText: { fontFamily: fonts.heading, fontSize: 11 },

  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, textAlign: 'center' },

  sistemaRow: { alignItems: 'center', marginVertical: spacing.sm },
  sistemaText: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, textAlign: 'center' },

  bubbleRow:      { flexDirection: 'row' },
  bubbleRowMine:  { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4,
  },
  bubbleMine:  { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.bgCard, borderBottomLeftRadius: 4 },
  bubbleText:     { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 19 },
  bubbleTextMine: { color: '#fff' },
  bubbleHora:     { fontFamily: fonts.body, fontSize: 10, color: colors.textTertiary, alignSelf: 'flex-end' },
  bubbleHoraMine: { color: 'rgba(255,255,255,0.7)' },

  adjuntoFoto: { width: 180, height: 140, borderRadius: radius.md },
  adjuntoDoc: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: radius.md, padding: spacing.sm,
  },
  adjuntoDocText: { fontFamily: fonts.heading, fontSize: 13 },

  registroResuelto: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignSelf: 'center',
  },
  registroResueltoText: { fontFamily: fonts.heading, fontSize: 12 },

  registroCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderLeftWidth: 4, borderLeftColor: colors.accent,
    padding: spacing.md, gap: spacing.sm,
  },
  registroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: 'rgba(232,82,42,0.12)', borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  registroBadgeText: { fontFamily: fonts.heading, fontSize: 11, color: colors.accent },
  registroTitulo: { fontFamily: fonts.display, fontSize: 17, color: colors.textPrimary },

  registroTabla: { gap: 4 },
  registroFila: { flexDirection: 'row', justifyContent: 'space-between' },
  registroLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary },
  registroValor: { fontFamily: fonts.heading, fontSize: 13, color: colors.textPrimary },

  registroAdjuntos: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  registroFoto: { width: 64, height: 64, borderRadius: radius.md },
  registroFacturaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.bgSurface, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, height: 64,
  },
  registroFacturaText: { fontFamily: fonts.heading, fontSize: 12, color: colors.accent },

  registroAcciones: { gap: spacing.sm, marginTop: spacing.xs },
  registroBtnPrimario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 46,
  },
  registroBtnPrimarioText: { fontFamily: fonts.bold, fontSize: 13, color: '#fff' },
  registroBtnSecundario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'transparent', borderRadius: radius.md, minHeight: 46,
    borderWidth: 1, borderColor: colors.bgSurface,
  },
  registroBtnSecundarioText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.bgSurface,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  input: {
    flex: 1, maxHeight: 100, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
