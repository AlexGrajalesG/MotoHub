import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  IconArrowLeft, IconMessageCircle, IconCamera, IconCloudUpload,
  IconCheck, IconX, IconStar, IconDeviceFloppy, IconBike,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { fetchMecanicosDeNegocio, type Mecanico } from '../../lib/mecanicos';
import {
  fetchMensajes, enviarMensajeTexto, uploadAdjuntoCita,
} from '../../lib/mensajesCita';

const { colors, spacing, radius, fonts } = tokens;

type Estado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

type Cita = {
  id: string;
  usuario_id: string;
  negocio_id: string;
  estado: Estado;
  precio_acordado: number | null;
  notas_negocio: string | null;
  mecanico_id: string | null;
  vehiculo: { marca: string; modelo: string; placa: string; fotos: string[] } | null;
  servicio: { nombre: string } | null;
  usuario: { nombre: string | null } | null;
};

const ESTADO_LABELS: Record<Estado, string> = {
  pendiente: 'PENDIENTE', confirmada: 'EN PROCESO',
  completada: 'COMPLETADA', cancelada: 'CANCELADA',
};

export default function DetalleCitaNegocioScreen({ route, navigation }: any) {
  const { citaId } = route.params as { citaId: string };
  const { session } = useAuth();

  const [cita, setCita]         = useState<Cita | null>(null);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);
  const [notas, setNotas]       = useState('');
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [fotos, setFotos]       = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);

  useFocusEffect(useCallback(() => { fetchCita(); fetchFotos(); }, [citaId]));

  async function fetchFotos() {
    const mensajes = await fetchMensajes(citaId);
    const urls = mensajes.flatMap(m => (m.adjuntos ?? []).filter(a => a.tipo === 'foto').map(a => a.url));
    setFotos(urls);
  }

  async function fetchCita() {
    setLoading(true);
    const { data, error } = await supabase
      .from('citas')
      .select(`
        id, usuario_id, negocio_id, estado, precio_acordado, notas_negocio, mecanico_id,
        vehiculos ( marca, modelo, placa, fotos ),
        servicios ( nombre )
      `)
      .eq('id', citaId)
      .single();

    if (error || !data) { console.error(error?.message); setLoading(false); return; }

    const { data: usuario } = await supabase
      .from('usuarios').select('nombre').eq('id', (data as any).usuario_id).maybeSingle();

    const c: Cita = {
      id: data.id, usuario_id: data.usuario_id, negocio_id: data.negocio_id,
      estado: data.estado, precio_acordado: data.precio_acordado, notas_negocio: data.notas_negocio,
      mecanico_id: data.mecanico_id,
      vehiculo: (data as any).vehiculos ?? null,
      servicio: (data as any).servicios ?? null,
      usuario: usuario ?? null,
    };
    setCita(c);
    setNotas(c.notas_negocio ?? '');
    fetchMecanicosDeNegocio(c.negocio_id).then(setMecanicos);
    setLoading(false);
  }

  async function cambiarEstado(nuevo: Estado, confirmMsg?: { title: string; body: string }) {
    if (!cita) return;
    const aplicar = async () => {
      setBusy(true);
      const { error } = await supabase.from('citas').update({ estado: nuevo }).eq('id', cita.id);
      setBusy(false);
      if (error) { Alert.alert('Error', error.message); return; }
      setCita(prev => prev && { ...prev, estado: nuevo });
    };
    if (confirmMsg) {
      Alert.alert(confirmMsg.title, confirmMsg.body, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí', style: 'destructive', onPress: aplicar },
      ]);
    } else {
      aplicar();
    }
  }

  async function guardarNotas() {
    if (!cita) return;
    const valor = notas.trim();
    setBusy(true);
    const { error } = await supabase.from('citas').update({ notas_negocio: valor || null }).eq('id', cita.id);
    setBusy(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setCita(prev => prev && { ...prev, notas_negocio: valor || null });
  }

  async function asignarMecanico(mecanicoId: string | null) {
    if (!cita) return;
    setBusy(true);
    const { error } = await supabase.from('citas').update({ mecanico_id: mecanicoId }).eq('id', cita.id);
    setBusy(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setCita(prev => prev && { ...prev, mecanico_id: mecanicoId });
  }

  async function anexarFoto() {
    if (!cita || !session) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    setSubiendo(true);
    const url = await uploadAdjuntoCita(uri, citaId, safeExt);
    if (url) {
      await enviarMensajeTexto(citaId, session.user.id, 'negocio', '', [{ url, tipo: 'foto' }]);
      setFotos(prev => [...prev, url]);
    } else {
      Alert.alert('Error', 'No se pudo subir la foto');
    }
    setSubiendo(false);
  }

  if (loading || !cita) {
    return <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <IconArrowLeft size={20} color={colors.accent} />
        </Pressable>
        <Text style={s.headerTitle}>RODIX</Text>
      </View>

      {/* ── Hero del vehículo ── */}
      <View style={s.hero}>
        {cita.vehiculo?.fotos?.[0] ? (
          <Image source={{ uri: cita.vehiculo.fotos[0] }} style={s.heroImg} contentFit="cover" />
        ) : (
          <View style={[s.heroImg, s.heroPlaceholder]}>
            <IconBike size={56} color={colors.bgSurface} />
          </View>
        )}
        <LinearGradient colors={['transparent', colors.bgPrimary]} style={s.heroGradient} pointerEvents="none" />
        <View style={s.heroBadge}>
          <Text style={s.heroBadgeText}>{ESTADO_LABELS[cita.estado]}</Text>
        </View>
        <View style={s.heroInfo}>
          <Text style={s.heroTitle} numberOfLines={1}>
            {cita.vehiculo ? `${cita.vehiculo.marca} ${cita.vehiculo.modelo}` : 'Vehículo'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {cita.vehiculo?.placa && (
              <View style={s.placaChip}><Text style={s.placaText}>{cita.vehiculo.placa.toUpperCase()}</Text></View>
            )}
            <Text style={s.duenoText}>Dueño: {cita.usuario?.nombre ?? 'Cliente'}</Text>
          </View>
        </View>
      </View>

      {/* ── CTA: Escribir al dueño ── */}
      <Pressable
        style={({ pressed }) => [s.chatBtn, pressed && { opacity: 0.85 }]}
        onPress={() => navigation.navigate('ChatCita', { citaId: cita.id })}
      >
        <IconMessageCircle size={18} color="#fff" />
        <Text style={s.chatBtnText}>ESCRIBIR AL DUEÑO</Text>
      </Pressable>

      {/* ── Evidencia fotográfica ── */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <View>
            <Text style={s.sectionTitle}>Evidencia Fotográfica</Text>
            <Text style={s.sectionSubtitle}>Seguimiento visual del mantenimiento</Text>
          </View>
          <Pressable style={({ pressed }) => pressed && { opacity: 0.7 }} onPress={anexarFoto} disabled={subiendo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <IconCamera size={16} color={colors.accent} />
              <Text style={s.anexarText}>ANEXAR</Text>
            </View>
          </Pressable>
        </View>
        <View style={s.fotosGrid}>
          {fotos.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={s.fotoTile} contentFit="cover" />
          ))}
          <Pressable style={({ pressed }) => [s.subirTile, pressed && { opacity: 0.7 }]} onPress={anexarFoto} disabled={subiendo}>
            {subiendo
              ? <ActivityIndicator size="small" color={colors.textTertiary} />
              : <><IconCloudUpload size={26} color={colors.textTertiary} /><Text style={s.subirText}>SUBIR MÁS</Text></>
            }
          </Pressable>
        </View>
      </View>

      {/* ── Notas del mecánico ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Notas del Mecánico</Text>
        <Text style={s.sectionSubtitle}>Diagnóstico y detalles técnicos</Text>
        <View style={s.notasCard}>
          {cita.servicio && (
            <View style={s.servicioChip}>
              <Text style={s.servicioChipText}>{cita.servicio.nombre}</Text>
            </View>
          )}

          {mecanicos.length > 0 && (cita.estado === 'pendiente' || cita.estado === 'confirmada') && (
            <View style={{ gap: 6 }}>
              <Text style={s.fieldLabel}>MECÁNICO ASIGNADO</Text>
              <View style={s.mecanicoChips}>
                <Pressable style={[s.mecChip, !cita.mecanico_id && s.mecChipOn]} onPress={() => asignarMecanico(null)} disabled={busy}>
                  <Text style={[s.mecChipText, !cita.mecanico_id && s.mecChipTextOn]}>Solo centro</Text>
                </Pressable>
                {mecanicos.map(m => (
                  <Pressable key={m.id} style={[s.mecChip, cita.mecanico_id === m.id && s.mecChipOn]} onPress={() => asignarMecanico(m.id)} disabled={busy}>
                    <Text style={[s.mecChipText, cita.mecanico_id === m.id && s.mecChipTextOn]} numberOfLines={1}>
                      {m.usuario?.nombre ?? 'Mecánico'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={{ gap: 6 }}>
            <Text style={s.fieldLabel}>COMENTARIOS ADICIONALES</Text>
            <TextInput
              style={s.notasInput}
              placeholder="Ingresa observaciones relevantes para el dueño..."
              placeholderTextColor={colors.textTertiary}
              value={notas}
              onChangeText={setNotas}
              multiline
            />
            {notas !== (cita.notas_negocio ?? '') && (
              <Pressable style={({ pressed }) => [s.notasSaveBtn, pressed && { opacity: 0.8 }]} onPress={guardarNotas} disabled={busy}>
                {busy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><IconDeviceFloppy size={14} color="#fff" /><Text style={s.notasSaveText}>Guardar</Text></>
                }
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* ── Acciones ── */}
      {cita.estado === 'pendiente' && (
        <View style={s.bottomActions}>
          <Pressable style={({ pressed }) => [s.finalizarBtn, pressed && { opacity: 0.85 }]} onPress={() => cambiarEstado('confirmada')} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color={colors.bgPrimary} /> : <><IconCheck size={18} color={colors.bgPrimary} /><Text style={s.finalizarText}>CONFIRMAR CITA</Text></>}
          </Pressable>
          <Pressable
            style={({ pressed }) => pressed && { opacity: 0.6 }}
            onPress={() => cambiarEstado('cancelada', { title: 'Rechazar cita', body: '¿Seguro que quieres rechazar esta solicitud?' })}
            disabled={busy}
          >
            <Text style={s.pausarText}>RECHAZAR SOLICITUD</Text>
          </Pressable>
        </View>
      )}
      {cita.estado === 'confirmada' && (
        <View style={s.bottomActions}>
          <Pressable style={({ pressed }) => [s.finalizarBtn, pressed && { opacity: 0.85 }]} onPress={() => cambiarEstado('completada')} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color={colors.bgPrimary} /> : <><IconCheck size={18} color={colors.bgPrimary} /><Text style={s.finalizarText}>FINALIZAR SERVICIO</Text></>}
          </Pressable>
          <Pressable
            style={({ pressed }) => pressed && { opacity: 0.6 }}
            onPress={() => cambiarEstado('cancelada', { title: 'Cancelar cita', body: '¿Seguro que quieres cancelar esta cita?' })}
            disabled={busy}
          >
            <Text style={s.pausarText}>CANCELAR SERVICIO</Text>
          </Pressable>
        </View>
      )}
      {cita.estado === 'completada' && (
        <View style={s.bottomActions}>
          <Pressable style={({ pressed }) => [s.finalizarBtn, s.finalizarBtnSecundario, pressed && { opacity: 0.85 }]} onPress={() => navigation.navigate('CalificarCita', { citaId: cita.id })}>
            <IconStar size={18} color={colors.accent} />
            <Text style={[s.finalizarText, { color: colors.accent }]}>CALIFICAR CLIENTE</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  content:   { paddingBottom: 48, paddingHorizontal: spacing.xl },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: 56, paddingBottom: spacing.lg },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display, fontSize: 20, color: colors.accent,
    textTransform: 'uppercase', letterSpacing: -0.5,
  },

  hero: { width: '100%', height: 180, borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.md, backgroundColor: colors.bgCard },
  heroImg: { width: '100%', height: '100%', position: 'absolute' },
  heroPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  heroGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  heroBadge: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  heroBadgeText: { fontFamily: fonts.bold, fontSize: 11, color: '#fff', letterSpacing: 0.5 },
  heroInfo: { position: 'absolute', left: spacing.md, bottom: spacing.md, right: spacing.md },
  heroTitle: { fontFamily: fonts.heading, fontSize: 20, color: '#fff', marginBottom: 4 },
  placaChip: {
    backgroundColor: colors.bgSurface, borderRadius: radius.sm,
    borderWidth: 1, borderColor: 'rgba(232,82,42,0.3)',
    paddingHorizontal: 8, paddingVertical: 2,
  },
  placaText: { fontFamily: fonts.bold, fontSize: 10, color: colors.accent, letterSpacing: 1.5 },
  duenoText: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: radius.xl,
    minHeight: 52, marginBottom: spacing.xl,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  chatBtnText: { fontFamily: fonts.bold, fontSize: 14, color: '#fff', letterSpacing: 0.8 },

  section: { marginBottom: spacing.xl },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.md },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  sectionSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  anexarText: { fontFamily: fonts.bold, fontSize: 12, color: colors.accent, letterSpacing: 0.5 },

  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fotoTile: { width: '31%', aspectRatio: 1, borderRadius: radius.lg, backgroundColor: colors.bgCard },
  subirTile: {
    width: '31%', aspectRatio: 1, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.bgSurface, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  subirText: { fontFamily: fonts.bold, fontSize: 10, color: colors.textTertiary, letterSpacing: 0.5 },

  notasCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.md, gap: spacing.md },
  servicioChip: { backgroundColor: colors.bgSurface, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, alignSelf: 'flex-start' },
  servicioChipText: { fontFamily: fonts.heading, fontSize: 12, color: colors.accent },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.accent, letterSpacing: 0.5, opacity: 0.8 },
  mecanicoChips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  mecChip: {
    backgroundColor: colors.bgSurface, borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 6, borderWidth: 1, borderColor: 'transparent',
  },
  mecChipOn: { backgroundColor: 'rgba(232,82,42,0.15)', borderColor: colors.accent },
  mecChipText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  mecChipTextOn: { color: colors.accent, fontFamily: fonts.heading },
  notasInput: {
    backgroundColor: colors.bgSurface, borderRadius: radius.lg,
    padding: spacing.md, minHeight: 100, textAlignVertical: 'top',
    fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary,
  },
  notasSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: radius.md,
    minHeight: 40, alignSelf: 'flex-start', paddingHorizontal: spacing.md,
  },
  notasSaveText: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },

  bottomActions: { gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  finalizarBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: radius.xl, minHeight: 54,
  },
  finalizarBtnSecundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(232,82,42,0.35)' },
  finalizarText: { fontFamily: fonts.bold, fontSize: 14, color: colors.bgPrimary, letterSpacing: 0.8 },
  pausarText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textTertiary, letterSpacing: 0.8, paddingVertical: spacing.sm },
});
