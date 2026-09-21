import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert, Image, Modal,
  KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  IconArrowLeft, IconX, IconSend, IconPlus, IconCheck,
  IconUser, IconBuildingStore, IconPaperclip, IconPhoto, IconShare2,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { formatRegistroCompartible } from '../../lib/historial';

const { colors, fonts, spacing, radius } = tokens;

// ─── types ────────────────────────────────────────────────────────────────────
type RegistroDetalle = {
  id: string;
  tipo: string;
  descripcion: string | null;
  fecha: string;
  km_en_servicio: number | null;
  taller: string | null;
  negocio_nombre: string | null;
  mecanico_nombre: string | null;
  costo: number | null;
  notas: string | null;
  fotos: string[] | null;
  anexos: string[] | null;
  detalles: Record<string, string> | null;
  recomendaciones: string[] | null;
};

type Mensaje = {
  id: string;
  historial_id: string;
  autor_id: string;
  autor_nombre: string;
  autor_tipo: 'propietario' | 'mecanico';
  texto: string;
  created_at: string;
};

// ─── constants ────────────────────────────────────────────────────────────────
const TIPO_LABEL: Record<string, string> = {
  aceite:           'Cambio de aceite',
  frenos:           'Frenos',
  cadena:           'Cadena',
  llantas:          'Llantas',
  bateria:          'Batería',
  revision_tecnica: 'Rev. Técnica',
  soat:             'SOAT',
  lavado:           'Lavado',
  personalizado:    'Personalizado',
};

const TIPO_COLOR: Record<string, string> = {
  aceite:           '#48975a',
  frenos:           '#e05555',
  cadena:           '#d48b24',
  llantas:          '#5b8dd9',
  bateria:          '#59a45c',
  revision_tecnica: '#9b6de0',
  soat:             '#3badd4',
  lavado:           '#4fb8b0',
  personalizado:    '#888',
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatHora(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (isToday) return `Hoy ${hh}:${mm}`;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hh}:${mm}`;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function DetalleHistorialScreen({ route, navigation }: any) {
  const { registro: registroParam, vehiculo } = route.params;
  const { session } = useAuth();

  const [registro, setRegistro] = useState<RegistroDetalle>(registroParam);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nombreUsuario, setNombreUsuario] = useState('Yo');
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [showRecoInput, setShowRecoInput] = useState(false);
  const [recoText, setRecoText] = useState('');
  const [guardandoReco, setGuardandoReco] = useState(false);
  const [subiendoMedia, setSubiendoMedia] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // ─── init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchRegistro();
    fetchMensajes();
    fetchNombreUsuario();

    const channel = supabase
      .channel(`historial_msg_${registroParam.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'historial_mensajes',
        filter: `historial_id=eq.${registroParam.id}`,
      }, (payload) => {
        setMensajes(prev => [...prev, payload.new as Mensaje]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchRegistro() {
    const { data } = await supabase
      .from('historial_mantenimiento')
      .select('*')
      .eq('id', registroParam.id)
      .single();
    if (data) setRegistro(data);
  }

  async function fetchMensajes() {
    const { data } = await supabase
      .from('historial_mensajes')
      .select('*')
      .eq('historial_id', registroParam.id)
      .order('created_at', { ascending: true });
    setMensajes(data ?? []);
  }

  async function fetchNombreUsuario() {
    if (!session) return;
    const { data } = await supabase
      .from('usuarios')
      .select('nombre')
      .eq('id', session.user.id)
      .single();
    if (data?.nombre) setNombreUsuario(data.nombre);
  }

  // ─── mensajes ───────────────────────────────────────────────────────────────
  async function enviarMensaje() {
    const texto = nuevoMensaje.trim();
    if (!texto || !session) return;
    setEnviando(true);
    setNuevoMensaje('');
    try {
      await supabase.from('historial_mensajes').insert({
        historial_id: registro.id,
        autor_id:     session.user.id,
        autor_nombre: nombreUsuario,
        autor_tipo:   'propietario',
        texto,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setNuevoMensaje(texto);
    } finally {
      setEnviando(false);
    }
  }

  // ─── recomendaciones ────────────────────────────────────────────────────────
  async function agregarRecomendacion() {
    const texto = recoText.trim();
    if (!texto) return;
    setGuardandoReco(true);
    try {
      const nuevas = [...(registro.recomendaciones ?? []), texto];
      const { error } = await supabase
        .from('historial_mantenimiento')
        .update({ recomendaciones: nuevas })
        .eq('id', registro.id);
      if (error) throw error;
      setRegistro(r => ({ ...r, recomendaciones: nuevas }));
      setRecoText('');
      setShowRecoInput(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardandoReco(false);
    }
  }

  async function eliminarRecomendacion(idx: number) {
    const nuevas = (registro.recomendaciones ?? []).filter((_, i) => i !== idx);
    await supabase
      .from('historial_mantenimiento')
      .update({ recomendaciones: nuevas })
      .eq('id', registro.id);
    setRegistro(r => ({ ...r, recomendaciones: nuevas }));
  }

  // ─── compartir ──────────────────────────────────────────────────────────────
  async function compartirRegistro() {
    const texto = `${formatRegistroCompartible(registro)}\n\n— Compartido desde Rodix`;
    try {
      await Share.share({ message: texto });
    } catch (e) {
      console.error(e);
    }
  }

  // ─── fotos ──────────────────────────────────────────────────────────────────
  async function agregarFoto() {
    if (!session) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]) return;

    setSubiendoMedia(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
      const path = `${session.user.id}/historial/${vehiculo.id}/${Date.now()}.${safeExt}`;

      const response = await fetch(uri);
      const ab = await response.arrayBuffer();
      if (ab.byteLength === 0) throw new Error('No se pudo leer la imagen');
      const { error } = await supabase.storage
        .from('fotos')
        .upload(path, ab, { contentType: `image/${safeExt}` });
      if (error) throw error;

      const { data } = supabase.storage.from('fotos').getPublicUrl(path);
      const nuevasFotos = [...(registro.fotos ?? []), data.publicUrl];
      await supabase
        .from('historial_mantenimiento')
        .update({ fotos: nuevasFotos })
        .eq('id', registro.id);
      setRegistro(r => ({ ...r, fotos: nuevasFotos }));
    } catch (e: any) {
      Alert.alert('Error subiendo foto', e.message);
    } finally {
      setSubiendoMedia(false);
    }
  }

  // ─── anexos ─────────────────────────────────────────────────────────────────
  async function agregarAnexo() {
    if (!session) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setSubiendoMedia(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png'].includes(ext) ? ext : 'jpg';
      const path = `${session.user.id}/historial/${vehiculo.id}/anexos/${Date.now()}.${safeExt}`;

      const response = await fetch(uri);
      const ab = await response.arrayBuffer();
      if (ab.byteLength === 0) throw new Error('No se pudo leer la imagen');
      const { error } = await supabase.storage
        .from('fotos')
        .upload(path, ab, { contentType: `image/${safeExt}` });
      if (error) throw error;

      const { data } = supabase.storage.from('fotos').getPublicUrl(path);
      const nuevos = [...(registro.anexos ?? []), data.publicUrl];
      await supabase
        .from('historial_mantenimiento')
        .update({ anexos: nuevos })
        .eq('id', registro.id);
      setRegistro(r => ({ ...r, anexos: nuevos }));
    } catch (e: any) {
      Alert.alert('Error subiendo anexo', e.message);
    } finally {
      setSubiendoMedia(false);
    }
  }

  // ─── render helpers ─────────────────────────────────────────────────────────
  const badgeColor = TIPO_COLOR[registro.tipo] ?? '#888';
  const titulo = registro.tipo === 'personalizado' && registro.descripcion
    ? registro.descripcion
    : (TIPO_LABEL[registro.tipo] ?? registro.tipo);

  function renderDetalles() {
    if (registro.tipo !== 'aceite' || !registro.detalles) return null;
    const { tipo_aceite, marca, viscosidad } = registro.detalles;
    const parts = [tipo_aceite, marca, viscosidad].filter(Boolean);
    if (parts.length === 0) return null;
    return (
      <View style={s.detalleRow}>
        {parts.map((p, i) => (
          <View key={i} style={s.detallePill}>
            <Text style={s.detallePillText}>{p}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={s.container}>
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
        >
          {/* ── header ── */}
          <View style={s.header}>
            <Pressable style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Volver">
              <IconArrowLeft size={22} color={colors.accent} />
            </Pressable>
            <View style={[s.tipoBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor + '55' }]}>
              <Text style={[s.tipoBadgeText, { color: badgeColor }]}>
                {TIPO_LABEL[registro.tipo] ?? registro.tipo}
              </Text>
            </View>
            <Text style={s.headerFecha}>{formatFecha(registro.fecha)}</Text>
            <Pressable style={s.shareBtn} onPress={compartirRegistro} hitSlop={8} accessibilityLabel="Compartir registro">
              <IconShare2 size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* ── título ── */}
          <View style={s.section}>
            <Text style={s.titulo}>{titulo}</Text>
            {renderDetalles()}
          </View>

          {/* ── info grid ── */}
          <View style={s.infoGrid}>
            {registro.km_en_servicio ? (
              <View style={s.infoCard}>
                <Text style={s.infoCardLabel}>Kilometraje</Text>
                <Text style={s.infoCardValue}>{registro.km_en_servicio.toLocaleString('es-CO')} km</Text>
              </View>
            ) : null}
            {registro.costo ? (
              <View style={s.infoCard}>
                <Text style={s.infoCardLabel}>Costo</Text>
                <Text style={s.infoCardValue}>${registro.costo.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</Text>
              </View>
            ) : null}
          </View>

          {(registro.negocio_nombre || registro.taller) ? (
            <View style={[s.infoRow, { marginHorizontal: spacing.xl }]}>
              <IconBuildingStore size={16} color={colors.textTertiary} />
              <Text style={s.infoRowText}>{registro.negocio_nombre || registro.taller}</Text>
            </View>
          ) : null}

          {registro.mecanico_nombre ? (
            <View style={[s.infoRow, { marginHorizontal: spacing.xl, marginTop: spacing.sm }]}>
              <IconUser size={16} color={colors.textTertiary} />
              <Text style={s.infoRowText}>{registro.mecanico_nombre}</Text>
            </View>
          ) : null}

          {registro.notas ? (
            <View style={s.notasBox}>
              <Text style={s.notasText}>{registro.notas}</Text>
            </View>
          ) : null}

          {/* ── fotos ── */}
          <View style={s.sectionBlock}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Fotos</Text>
              <Pressable
                style={s.sectionAction}
                onPress={agregarFoto}
                disabled={subiendoMedia}
                hitSlop={8}
                accessibilityLabel="Agregar foto"
              >
                {subiendoMedia
                  ? <ActivityIndicator size="small" color={colors.accent} />
                  : <><IconPlus size={14} color={colors.accent} /><Text style={s.sectionActionText}>Agregar</Text></>
                }
              </Pressable>
            </View>
            {(registro.fotos ?? []).length > 0 ? (
              <View style={s.fotosGrid}>
                {(registro.fotos ?? []).map((url, idx) => (
                  <Pressable key={idx} onPress={() => setFotoModal(url)} accessibilityLabel="Ver foto ampliada">
                    <Image source={{ uri: url }} style={s.fotoThumb} resizeMode="cover" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Pressable style={s.mediaEmpty} onPress={agregarFoto}>
                <IconPhoto size={28} color={colors.bgSurface} />
                <Text style={s.mediaEmptyText}>Agregar fotos del servicio</Text>
              </Pressable>
            )}
          </View>

          {/* ── anexos ── */}
          <View style={s.sectionBlock}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Anexos</Text>
              <Pressable
                style={s.sectionAction}
                onPress={agregarAnexo}
                disabled={subiendoMedia}
                hitSlop={8}
                accessibilityLabel="Subir anexo"
              >
                <IconPlus size={14} color={colors.accent} />
                <Text style={s.sectionActionText}>Subir</Text>
              </Pressable>
            </View>
            {(registro.anexos ?? []).length > 0 ? (
              <View style={s.fotosGrid}>
                {(registro.anexos ?? []).map((url, idx) => (
                  <Pressable key={idx} onPress={() => setFotoModal(url)} accessibilityLabel="Ver anexo ampliado">
                    <Image source={{ uri: url }} style={s.fotoThumb} resizeMode="cover" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Pressable style={s.mediaEmpty} onPress={agregarAnexo}>
                <IconPaperclip size={28} color={colors.bgSurface} />
                <Text style={s.mediaEmptyText}>Facturas, fotos de piezas, documentos</Text>
              </Pressable>
            )}
          </View>

          {/* ── recomendaciones ── */}
          <View style={s.sectionBlock}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Recomendaciones</Text>
              <Pressable
                style={s.sectionAction}
                onPress={() => setShowRecoInput(v => !v)}
                hitSlop={8}
                accessibilityLabel="Agregar recomendación"
              >
                <IconPlus size={14} color={colors.accent} />
                <Text style={s.sectionActionText}>Agregar</Text>
              </Pressable>
            </View>

            {showRecoInput && (
              <View style={s.recoInputRow}>
                <TextInput
                  style={s.recoInput}
                  placeholder="Ej: Revisar suspensión en 1000 km"
                  placeholderTextColor={colors.textTertiary}
                  value={recoText}
                  onChangeText={setRecoText}
                  autoFocus
                  onSubmitEditing={agregarRecomendacion}
                  returnKeyType="done"
                />
                <Pressable
                  style={[s.recoConfirm, !recoText.trim() && { opacity: 0.4 }]}
                  onPress={agregarRecomendacion}
                  disabled={!recoText.trim() || guardandoReco}
                  hitSlop={8}
                  accessibilityLabel="Guardar recomendación"
                >
                  {guardandoReco
                    ? <ActivityIndicator size="small" color={colors.onAccent} />
                    : <IconCheck size={16} color={colors.onAccent} />
                  }
                </Pressable>
              </View>
            )}

            {(registro.recomendaciones ?? []).length === 0 && !showRecoInput ? (
              <Text style={s.emptyHint}>Sin recomendaciones todavía</Text>
            ) : (
              (registro.recomendaciones ?? []).map((r, idx) => (
                <View key={idx} style={s.recoItem}>
                  <View style={s.recoDot} />
                  <Text style={s.recoText} numberOfLines={3}>{r}</Text>
                  <Pressable onPress={() => eliminarRecomendacion(idx)} hitSlop={8} accessibilityLabel="Eliminar recomendación">
                    <IconX size={14} color={colors.textTertiary} />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          {/* ── bitácora / chat ── */}
          <View style={s.sectionBlock}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Bitácora</Text>
            </View>

            {mensajes.length === 0 ? (
              <Text style={s.emptyHint}>
                Escribe lo que pasó durante el servicio, dudas o seguimientos
              </Text>
            ) : (
              mensajes.map(m => {
                const esPropio = m.autor_id === session?.user.id;
                return (
                  <View key={m.id} style={[s.bubble, esPropio ? s.bubbleMio : s.bubbleOtro]}>
                    {!esPropio && (
                      <Text style={s.bubbleAutor}>{m.autor_nombre}</Text>
                    )}
                    <Text style={[s.bubbleTexto, esPropio ? s.bubbleTextoMio : s.bubbleTextoOtro]}>
                      {m.texto}
                    </Text>
                    <Text style={[s.bubbleHora, esPropio ? s.bubbleHoraMia : s.bubbleHoraOtra]}>
                      {formatHora(m.created_at)}
                    </Text>
                  </View>
                );
              })
            )}

            {/* spacer so last message isn't hidden behind input */}
            <View style={{ height: 16 }} />
          </View>
        </ScrollView>

        {/* ── input bar ── */}
        <View style={s.inputBar}>
          <TextInput
            style={s.inputField}
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="send"
            onSubmitEditing={enviarMensaje}
          />
          <Pressable
            style={[s.sendBtn, (!nuevoMensaje.trim() || enviando) && { opacity: 0.4 }]}
            onPress={enviarMensaje}
            disabled={!nuevoMensaje.trim() || enviando}
            hitSlop={8}
            accessibilityLabel="Enviar mensaje"
          >
            {enviando
              ? <ActivityIndicator size="small" color={colors.onAccent} />
              : <IconSend size={18} color={colors.onAccent} />
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* ── foto fullscreen ── */}
      <Modal visible={!!fotoModal} transparent animationType="fade">
        <Pressable style={s.modalOverlay} onPress={() => setFotoModal(null)}>
          {fotoModal && (
            <Image
              source={{ uri: fotoModal }}
              style={s.fotoFullscreen}
              resizeMode="contain"
            />
          )}
          <Pressable style={s.modalClose} onPress={() => setFotoModal(null)} hitSlop={8} accessibilityLabel="Cerrar imagen">
            <IconX size={22} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bgPrimary },
  kav:          { flex: 1 },
  scrollContent:{ paddingBottom: 80 },

  // header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop:        56,
    paddingBottom:     spacing.lg,
  },
  backBtn:      {},
  tipoBadge: {
    borderRadius:    radius.sm,
    borderWidth:     1,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  tipoBadgeText: { fontSize: 12, fontFamily: fonts.heading },
  headerFecha:   { color: colors.textTertiary, fontSize: 13, fontFamily: fonts.body, marginLeft: 'auto' },
  shareBtn:      { padding: 4 },

  // title
  section:    { paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  titulo:     { color: colors.textPrimary, fontSize: 22, fontFamily: fonts.bold, lineHeight: 28 },
  detalleRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.sm },
  detallePill:{
    backgroundColor:  colors.bgSurface,
    borderRadius:     radius.pill,
    paddingVertical:  4,
    paddingHorizontal: spacing.sm,
  },
  detallePillText: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body },

  // info grid
  infoGrid: {
    flexDirection:     'row',
    gap:               spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom:      spacing.md,
  },
  infoCard: {
    flex:            1,
    backgroundColor: colors.bgCard,
    borderRadius:    radius.md,
    padding:         spacing.md,
    borderWidth:     1,
    borderColor:     colors.bgSurface,
  },
  infoCardLabel: { color: colors.textTertiary, fontSize: 11, fontFamily: fonts.heading, textTransform: 'uppercase', letterSpacing: 0.6 },
  infoCardValue: { color: colors.textPrimary,  fontSize: 17, fontFamily: fonts.bold, marginTop: 4 },

  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoRowText: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.body },

  notasBox: {
    marginHorizontal: spacing.xl,
    marginTop:        spacing.md,
    backgroundColor:  colors.bgCard,
    borderRadius:     radius.md,
    padding:          spacing.md,
    borderWidth:      1,
    borderColor:      colors.bgSurface,
  },
  notasText: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.body, lineHeight: 20, fontStyle: 'italic' },

  // section blocks
  sectionBlock: {
    marginTop:         spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.md,
  },
  sectionTitle:      { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.bold },
  sectionAction:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionActionText: { color: colors.accent, fontSize: 13, fontFamily: fonts.heading },

  // fotos / anexos
  fotosGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
  },
  fotoThumb: {
    width:        96,
    height:       96,
    borderRadius: radius.md,
  },
  mediaEmpty: {
    backgroundColor: colors.bgCard,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.bgSurface,
    borderStyle:     'dashed',
    paddingVertical: spacing.xl,
    alignItems:      'center',
    gap:             spacing.sm,
  },
  mediaEmptyText: { color: colors.textTertiary, fontSize: 13, fontFamily: fonts.body },

  // recomendaciones
  recoInputRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.md,
    alignItems:    'center',
  },
  recoInput: {
    flex:            1,
    backgroundColor: colors.bgCard,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.accent,
    color:           colors.textPrimary,
    fontSize:        14,
    fontFamily:      fonts.body,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  recoConfirm: {
    backgroundColor: colors.accent,
    borderRadius:    radius.md,
    width:           38,
    height:          38,
    alignItems:      'center',
    justifyContent:  'center',
  },
  recoItem: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSurface,
  },
  recoDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: colors.accent,
    marginTop:       6,
    flexShrink:      0,
  },
  recoText: { flex: 1, color: colors.textSecondary, fontSize: 14, fontFamily: fonts.body, lineHeight: 20 },

  emptyHint: { color: colors.textTertiary, fontSize: 13, fontFamily: fonts.body, fontStyle: 'italic' },

  // mensajes / bitácora
  bubble: {
    maxWidth:        '78%',
    borderRadius:    radius.lg,
    padding:         spacing.md,
    marginBottom:    spacing.sm,
  },
  bubbleMio:  {
    alignSelf:       'flex-end',
    backgroundColor: 'rgba(72,151,90,0.15)',
    borderWidth:     1,
    borderColor:     'rgba(72,151,90,0.3)',
  },
  bubbleOtro: {
    alignSelf:       'flex-start',
    backgroundColor: colors.bgCard,
    borderWidth:     1,
    borderColor:     colors.bgSurface,
  },
  bubbleAutor:     { color: colors.accent, fontSize: 11, fontFamily: fonts.heading, marginBottom: 4 },
  bubbleTexto:     { fontSize: 14, fontFamily: fonts.body, lineHeight: 20 },
  bubbleTextoMio:  { color: colors.textPrimary },
  bubbleTextoOtro: { color: colors.textPrimary },
  bubbleHora:      { fontSize: 10, fontFamily: fonts.body, marginTop: 4 },
  bubbleHoraMia:   { color: 'rgba(72,151,90,0.6)', textAlign: 'right' },
  bubbleHoraOtra:  { color: colors.textTertiary },

  // input bar
  inputBar: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.sm,
    borderTopWidth:    1,
    borderTopColor:    colors.bgSurface,
    backgroundColor:   colors.bgPrimary,
  },
  inputField: {
    flex:              1,
    backgroundColor:   colors.bgCard,
    borderRadius:      radius.pill,
    borderWidth:       1,
    borderColor:       colors.bgSurface,
    color:             colors.textPrimary,
    fontSize:          14,
    fontFamily:        fonts.body,
    paddingVertical:   10,
    paddingHorizontal: spacing.md,
  },
  sendBtn: {
    backgroundColor: colors.accent,
    borderRadius:    radius.pill,
    width:           40,
    height:          40,
    alignItems:      'center',
    justifyContent:  'center',
  },

  // foto fullscreen modal
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent:  'center',
    alignItems:      'center',
  },
  fotoFullscreen: { width: '100%', height: '85%' },
  modalClose: {
    position:        'absolute',
    top:             52,
    right:           spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius:    999,
    padding:         spacing.sm,
  },
});
