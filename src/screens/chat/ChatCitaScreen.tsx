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
import { determinarRolEnChatCita } from '../../lib/roles';
import { openUrl } from '../../lib/openUrl';
import EstrellasDisplay from '../../components/EstrellasDisplay';
import EstadoCitaLinea from '../../components/EstadoCitaLinea';
import RegistroCard from '../../components/historial/RegistroCard';
import { useVisorImagenes } from '../../components/VisorImagenes';

const { colors, spacing, radius, fonts } = tokens;

type CitaInfo = {
  id: string;
  usuario_id: string;
  estado: string;
  vehiculo_id: string;
  negocio_id: string;
  origen: string;
  fecha_solicitada: string;
  hora_solicitada: string | null;
  negocio: { nombre: string; propietario_id: string } | null;
  vehiculo: { marca: string; modelo: string; placa: string } | null;
  usuario: { nombre: string | null } | null;
};

function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${MESES[m - 1]}`;
}

const ROL_LABEL: Record<RolAutor, string> = {
  propietario: 'Cliente', negocio: 'Taller', mecanico: 'Mecánico',
};
const ROL_COLOR: Record<RolAutor, string> = {
  propietario: '#5ac8fa', negocio: colors.accent, mecanico: '#34c759',
};

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatCitaScreen({ route, navigation }: any) {
  const { citaId } = route.params as { citaId: string };
  const { session } = useAuth();
  const { abrir: abrirFotos, visor: visorFotos } = useVisorImagenes();

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
        id, usuario_id, estado, vehiculo_id, negocio_id, origen, fecha_solicitada, hora_solicitada,
        negocio:negocios ( nombre, propietario_id ),
        vehiculo:vehiculos ( marca, modelo, placa )
      `)
      .eq('id', citaId)
      .single();
    if (error) { console.error(error.message); return; }

    // usuarios.id referencia auth.users, no hay FK directa citas->usuarios
    // para que Postgrest pueda hacer el join embebido, por eso va aparte.
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('nombre')
      .eq('id', (data as any).usuario_id)
      .maybeSingle();

    const c = {
      ...data,
      negocio: (data as any).negocio ?? null,
      vehiculo: (data as any).vehiculo ?? null,
      usuario: usuarioData ?? null,
    } as CitaInfo;
    setCita(c);

    let esMecanicoActivo = false;
    if (c.usuario_id !== session?.user.id && c.negocio?.propietario_id !== session?.user.id) {
      const { data: mec } = await supabase
        .from('mecanicos')
        .select('id')
        .eq('negocio_id', c.negocio_id)
        .eq('usuario_id', session?.user.id)
        .eq('activo', true)
        .maybeSingle();
      esMecanicoActivo = !!mec;
    }
    const rol = determinarRolEnChatCita({
      usuarioIdCita: c.usuario_id,
      miUsuarioId: session?.user.id,
      negocioPropietarioId: c.negocio?.propietario_id,
      esMecanicoActivoDelNegocio: esMecanicoActivo,
    });
    setRolPropio(rol);
    setPromedioOtro(await fetchPromedio(rol === 'propietario' ? 'negocio' : 'usuario', rol === 'propietario' ? c.negocio_id : c.usuario_id));
  }

  async function cargarMensajes() {
    setMensajes(await fetchMensajes(citaId));
  }

  const primeraCarga = useRef(true);
  useFocusEffect(useCallback(() => {
    if (primeraCarga.current) { primeraCarga.current = false; setLoading(true); }
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

    const tempId = `temp-${Date.now()}`;
    const optimista: MensajeCita = {
      id: tempId,
      cita_id: citaId,
      autor_id: session.user.id,
      rol_autor: rolPropio,
      tipo_mensaje: 'texto',
      texto: valor,
      adjuntos: [],
      historial_id: null,
      created_at: new Date().toISOString(),
      historial: null,
    };
    setMensajes(prev => [...prev, optimista]);

    const { error } = await enviarMensajeTexto(citaId, session.user.id, rolPropio, valor);
    setEnviando(false);
    if (error) {
      setMensajes(prev => prev.filter(m => m.id !== tempId));
      setTexto(valor);
      Alert.alert('Error', error.message);
    }
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
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
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
    if (resolviendo) return;
    setResolviendo(historialId);
    const { error } = await resolverRegistroServicio(historialId, aceptar);
    // se recarga aqui mismo: no depender del tiempo real para ver el resultado
    if (!error) await cargarMensajes();
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
      return <RegistroCard h={item.historial} esCliente={rolPropio === 'propietario'} busy={resolviendo} onResolver={handleResolver} onVerFoto={abrirFotos} />;
    }

    const isMine = item.autor_id === session?.user.id;
    return (
      <View style={[s.bubbleRow, isMine ? s.bubbleRowMine : s.bubbleRowOther]}>
        <View style={{ maxWidth: '78%' }}>
          <Text style={[s.rolLabel, { color: ROL_COLOR[item.rol_autor], textAlign: isMine ? 'right' : 'left' }]}>
            {ROL_LABEL[item.rol_autor]}
          </Text>
          <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleOther]}>
          {item.adjuntos?.map((a, i) => (
            a.tipo === 'foto'
              ? (
                <Pressable key={i} onPress={() => { const fotos = item.adjuntos.filter(x => x.tipo === 'foto'); abrirFotos(fotos.map(x => x.url), fotos.indexOf(a)); }} accessibilityRole="imagebutton" accessibilityLabel="Ver foto">
                  <Image source={{ uri: a.url }} style={s.adjuntoFoto} resizeMode="cover" />
                </Pressable>
              )
              : (
                <Pressable key={i} style={s.adjuntoDoc} onPress={() => openUrl(a.url)}>
                  <IconFileText size={16} color={isMine ? colors.onAccent : colors.accent} />
                  <Text style={[s.adjuntoDocText, { color: isMine ? colors.onAccent : colors.textPrimary }]}>
                    {a.tipo === 'factura' ? 'Factura' : 'Documento'}
                  </Text>
                </Pressable>
              )
          ))}
          {item.texto && <Text style={[s.bubbleText, isMine && s.bubbleTextMine]}>{item.texto}</Text>}
          <Text style={[s.bubbleHora, isMine && s.bubbleHoraMine]}>{formatHora(item.created_at)}</Text>
          </View>
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
              {rolPropio === 'propietario' ? (cita.negocio?.nombre ?? 'Negocio') : (cita.usuario?.nombre ?? 'Cliente')}
            </Text>
            {promedioOtro.total > 0 && <EstrellasDisplay promedio={promedioOtro.promedio} total={promedioOtro.total} size={12} />}
          </View>
          <Text style={s.headerSubtitle} numberOfLines={1}>
            {rolPropio === 'propietario'
              ? `${formatFechaCorta(cita.fecha_solicitada)}${cita.hora_solicitada ? ` · ${cita.hora_solicitada.slice(0, 5)}` : ''}`
              : (cita.vehiculo ? `${cita.vehiculo.marca} ${cita.vehiculo.modelo}` : '')}
          </Text>
          {cita.origen === 'walk_in' && (
            <View style={s.walkinBadge}>
              <Text style={s.walkinBadgeText}>Sin cita previa</Text>
            </View>
          )}
        </View>
      </View>

      <View style={s.lineaTiempoWrap}>
        <EstadoCitaLinea estado={cita.estado as any} compacto />
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
          {enviando ? <ActivityIndicator size="small" color={colors.onAccent} /> : <IconSend size={18} color={colors.onAccent} />}
        </Pressable>
      </View>
      {visorFotos}
    </KeyboardAvoidingView>
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
  lineaTiempoWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.bgSurface },
  headerSubtitle:{ fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 1 },
  walkinBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.bgCard, borderRadius: radius.sm,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 3,
  },
  walkinBadgeText: { fontFamily: fonts.heading, fontSize: 10, color: colors.textTertiary },

  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, textAlign: 'center' },

  sistemaRow: { alignItems: 'center', marginVertical: spacing.sm },
  sistemaText: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, textAlign: 'center' },

  bubbleRow:      { flexDirection: 'row' },
  bubbleRowMine:  { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  rolLabel: { fontFamily: fonts.bold, fontSize: 10, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  bubble: {
    borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4,
  },
  bubbleMine:  { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.bgCard, borderBottomLeftRadius: 4 },
  bubbleText:     { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 19 },
  bubbleTextMine: { color: colors.onAccent },
  bubbleHora:     { fontFamily: fonts.body, fontSize: 10, color: colors.textTertiary, alignSelf: 'flex-end' },
  bubbleHoraMine: { color: 'rgba(255,255,255,0.7)' },

  adjuntoFoto: { width: 180, height: 140, borderRadius: radius.md },
  adjuntoDoc: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: radius.md, padding: spacing.sm,
  },
  adjuntoDocText: { fontFamily: fonts.heading, fontSize: 13 },

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
