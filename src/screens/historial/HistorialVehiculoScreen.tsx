import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, Alert, Image, Share,
} from 'react-native';
import {
  IconArrowLeft, IconPlus, IconTrash, IconUser,
  IconBuildingStore, IconTool, IconShare2,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import { TIPO_LABEL, formatFecha, formatHistorialCompartible } from '../../lib/historial';

const { colors, fonts, spacing, radius } = tokens;

// ─── types ────────────────────────────────────────────────────────────────────
type Registro = {
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
  detalles: Record<string, string> | null;
  recomendaciones: string[] | null;
};

// accent colors per tipo for the badge
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
function detallesTexto(tipo: string, d: Record<string, string> | null): string | null {
  if (!d) return null;
  if (tipo === 'aceite') {
    const parts = [d.tipo_aceite, d.marca, d.viscosidad].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
  }
  return null;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function HistorialVehiculoScreen({ route, navigation }: any) {
  const { vehiculo } = route.params;
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchHistorial();
    }, [])
  );

  async function fetchHistorial() {
    try {
      const { data } = await supabase
        .from('historial_mantenimiento')
        .select('id,tipo,descripcion,fecha,km_en_servicio,taller,negocio_nombre,mecanico_nombre,costo,notas,fotos,detalles,recomendaciones')
        .eq('vehiculo_id', vehiculo.id)
        .order('fecha', { ascending: false });
      setRegistros(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function compartirHistorial() {
    if (registros.length === 0) return;
    const texto = formatHistorialCompartible(vehiculo, registros);
    try {
      await Share.share({ message: texto });
    } catch (e) {
      console.error(e);
    }
  }

  async function eliminar(id: string) {
    Alert.alert('Eliminar registro', '¿Eliminar este registro del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('historial_mantenimiento').delete().eq('id', id);
          setRegistros(rs => rs.filter(r => r.id !== id));
        },
      },
    ]);
  }

  // ─── card ────────────────────────────────────────────────────────────────────
  function renderCard({ item }: { item: Registro }) {
    const label       = item.tipo === 'personalizado' && item.descripcion
      ? item.descripcion
      : (TIPO_LABEL[item.tipo] ?? item.tipo);
    const badgeColor  = TIPO_COLOR[item.tipo] ?? '#888';
    const tallerTexto = item.negocio_nombre || item.taller;
    const detStr      = detallesTexto(item.tipo, item.detalles);
    const primeraFoto = item.fotos?.[0] ?? null;

    return (
      <Pressable
        style={s.card}
        onPress={() => navigation.navigate('DetalleHistorial', { registro: item, vehiculo })}
      >
        {/* tipo badge + top row */}
        <View style={s.cardHeader}>
          <View style={[s.tipoBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor + '55' }]}>
            <Text style={[s.tipoBadgeText, { color: badgeColor }]}>{TIPO_LABEL[item.tipo] ?? item.tipo}</Text>
          </View>
          <Text style={s.cardFecha}>{formatFecha(item.fecha)}</Text>
        </View>

        {/* title */}
        <Text style={s.cardTitle}>{label}</Text>

        {/* detalles aceite */}
        {detStr ? (
          <Text style={s.cardDetalle}>{detStr}</Text>
        ) : null}

        {/* meta row */}
        <View style={s.metaRow}>
          {item.km_en_servicio ? (
            <View style={s.metaChip}>
              <Text style={s.metaText}>🛣 {item.km_en_servicio.toLocaleString('es-CO')} km</Text>
            </View>
          ) : null}
          {item.costo ? (
            <View style={s.metaChip}>
              <Text style={s.metaText}>${item.costo.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</Text>
            </View>
          ) : null}
        </View>

        {/* taller + mecánico */}
        {(tallerTexto || item.mecanico_nombre) ? (
          <View style={s.proveedorRow}>
            {tallerTexto ? (
              <View style={s.proveedorChip}>
                <IconBuildingStore size={12} color={colors.textTertiary} />
                <Text style={s.proveedorText} numberOfLines={1}>{tallerTexto}</Text>
              </View>
            ) : null}
            {item.mecanico_nombre ? (
              <View style={s.proveedorChip}>
                <IconUser size={12} color={colors.textTertiary} />
                <Text style={s.proveedorText} numberOfLines={1}>{item.mecanico_nombre}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* notas */}
        {item.notas ? (
          <Text style={s.notasText} numberOfLines={2}>{item.notas}</Text>
        ) : null}

        {/* fotos strip */}
        {primeraFoto ? (
          <View style={s.fotosStrip}>
            {(item.fotos ?? []).slice(0, 3).map((url, idx) => (
              <Image key={idx} source={{ uri: url }} style={s.fotoThumb} resizeMode="cover" />
            ))}
          </View>
        ) : null}

        {/* delete */}
        <Pressable style={s.deleteBtn} onPress={() => eliminar(item.id)} hitSlop={8} accessibilityLabel="Eliminar registro">
          <IconTrash size={16} color={colors.textTertiary} />
        </Pressable>
      </Pressable>
    );
  }

  // ─── loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  // ─── main ────────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Volver">
          <IconArrowLeft size={22} color={colors.accent} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.title}>{vehiculo.marca} {vehiculo.modelo}</Text>
          <Text style={s.subtitle}>
            {registros.length} registro{registros.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {registros.length > 0 && (
          <Pressable style={s.shareBtn} onPress={compartirHistorial} hitSlop={8} accessibilityLabel="Compartir historial">
            <IconShare2 size={20} color={colors.textSecondary} />
          </Pressable>
        )}
        <Pressable
          style={s.nuevoBtn}
          onPress={() => navigation.navigate('AgregarHistorial', { vehiculo })}
        >
          <IconPlus size={18} color={colors.onAccent} />
          <Text style={s.nuevoBtnText}>Agregar</Text>
        </Pressable>
      </View>

      <FlatList
        data={registros}
        keyExtractor={item => item.id}
        contentContainerStyle={s.lista}
        renderItem={renderCard}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <IconTool size={52} color={colors.bgSurface} />
            <Text style={s.emptyTitle}>Sin registros aún</Text>
            <Text style={s.emptySubtitle}>
              Registra el primer mantenimiento de tu {vehiculo.tipo} para llevar el control
            </Text>
            <Pressable
              style={s.emptyBtn}
              onPress={() => navigation.navigate('AgregarHistorial', { vehiculo })}
            >
              <Text style={s.emptyBtnText}>Agregar registro</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: spacing.xl,
    paddingTop:       56,
    paddingBottom:    spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSurface,
  },
  backBtn:     { padding: 4 },
  headerCenter:{ flex: 1, marginLeft: spacing.md },
  title:       { color: colors.textPrimary, fontSize: 18, fontFamily: fonts.bold },
  subtitle:    { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body, marginTop: 2 },
  nuevoBtn:    {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    backgroundColor: colors.accent,
    borderRadius:    radius.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  nuevoBtnText: { color: colors.onAccent, fontSize: 13, fontFamily: fonts.heading },
  shareBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm,
  },

  lista: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    borderWidth:     1,
    borderColor:     colors.bgSurface,
    gap:             6,
    position:        'relative',
  },

  cardHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tipoBadge: {
    borderRadius:    radius.sm,
    borderWidth:     1,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tipoBadgeText: { fontSize: 11, fontFamily: fonts.heading },
  cardFecha:     { color: colors.textTertiary, fontSize: 12, fontFamily: fonts.body },
  cardTitle:     { color: colors.textPrimary, fontSize: 15, fontFamily: fonts.bold },
  cardDetalle:   { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body },

  metaRow:   { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  metaChip:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:  { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body },

  proveedorRow:  { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: 2 },
  proveedorChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  proveedorText: { color: colors.textTertiary, fontSize: 12, fontFamily: fonts.body, maxWidth: 160 },

  notasText: { color: colors.textTertiary, fontSize: 12, fontFamily: fonts.body, fontStyle: 'italic' },

  fotosStrip: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  fotoThumb:  { width: 72, height: 72, borderRadius: radius.md },

  deleteBtn: { position: 'absolute', top: spacing.md, right: spacing.md },

  empty:        { alignItems: 'center', marginTop: 60, padding: 32 },
  emptyTitle:   { color: colors.textPrimary, fontSize: 20, fontFamily: fonts.bold, marginTop: spacing.lg, marginBottom: spacing.sm },
  emptySubtitle:{ color: colors.textSecondary, fontSize: 14, fontFamily: fonts.body, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  emptyBtn: {
    backgroundColor: colors.accent,
    borderRadius:    radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  emptyBtnText: { color: colors.onAccent, fontFamily: fonts.bold, fontSize: 15 },
});
