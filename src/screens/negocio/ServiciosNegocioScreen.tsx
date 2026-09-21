import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
} from 'react-native';
import {
  IconArrowLeft, IconPlus, IconClock, IconChevronRight,
  IconEye, IconEyeOff,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { formatPrecioServicio, type TipoPrecio } from '../../lib/precio';

const { colors, spacing, radius, fonts } = tokens;

type Servicio = {
  id: string;
  nombre: string;
  categoria: string;
  aplica_a: string[];
  duracion_minutos: number | null;
  tipo_precio: TipoPrecio;
  precio_base: number | null;
  activo: boolean;
};

const CAT_LABELS: Record<string, string> = {
  mantenimiento: 'Mantenimiento', reparacion: 'Reparación',
  diagnostico: 'Diagnóstico',    estetico: 'Estética',
};

export default function ServiciosNegocioScreen({ route, navigation }: any) {
  const negocioIdParam = route.params?.negocioId as string | undefined;
  const { session } = useAuth();
  const [negocioId, setNegocioId] = useState<string | undefined>(negocioIdParam);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading,   setLoading]   = useState(true);

  useFocusEffect(useCallback(() => {
    if (negocioId) return;
    supabase.from('negocios').select('id').eq('propietario_id', session!.user.id).maybeSingle()
      .then(({ data }) => setNegocioId(data?.id));
  }, [negocioId]));

  useFocusEffect(useCallback(() => { if (negocioId) fetchServicios(); }, [negocioId]));

  async function fetchServicios() {
    setLoading(true);
    const { data, error } = await supabase
      .from('servicios')
      .select('id, nombre, categoria, aplica_a, duracion_minutos, tipo_precio, precio_base, activo')
      .eq('negocio_id', negocioId)
      .order('categoria')
      .order('nombre');
    if (error) console.error(error.message);
    setServicios((data as Servicio[]) ?? []);
    setLoading(false);
  }

  async function toggleActivo(servicio: Servicio) {
    const nuevo = !servicio.activo;
    setServicios(prev => prev.map(s => s.id === servicio.id ? { ...s, activo: nuevo } : s));
    const { error } = await supabase.from('servicios').update({ activo: nuevo }).eq('id', servicio.id);
    if (error) {
      setServicios(prev => prev.map(s => s.id === servicio.id ? { ...s, activo: servicio.activo } : s));
    }
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        {navigation.canGoBack() && (
          <Pressable
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityLabel="Volver"
          >
            <IconArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
        )}
        <Text style={s.headerTitle}>Servicios</Text>
        <Pressable
          style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('EditarServicio', { negocioId, servicio: null })}
          hitSlop={8}
          accessibilityLabel="Agregar servicio"
        >
          <IconPlus size={20} color={colors.onAccent} />
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : servicios.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Sin servicios</Text>
          <Text style={s.emptySubtitle}>Agrega los servicios que ofrece tu negocio</Text>
          <Pressable
            style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate('EditarServicio', { negocioId, servicio: null })}
          >
            <IconPlus size={16} color={colors.onAccent} />
            <Text style={s.ctaBtnText}>Agregar servicio</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={servicios}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
              onPress={() => navigation.navigate('EditarServicio', { negocioId, servicio: item })}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <View style={s.row}>
                  <Text style={[s.nombre, !item.activo && s.inactivo]} numberOfLines={1}>{item.nombre}</Text>
                  <Text style={s.precio}>{formatPrecioServicio(item)}</Text>
                </View>
                <View style={s.row}>
                  <View style={s.catBadge}>
                    <Text style={s.catBadgeText}>{CAT_LABELS[item.categoria] ?? item.categoria}</Text>
                  </View>
                  {item.duracion_minutos != null && (
                    <View style={s.metaItem}>
                      <IconClock size={11} color={colors.textTertiary} />
                      <Text style={s.metaText}>{item.duracion_minutos} min</Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => toggleActivo(item)}
                style={s.eyeBtn}
                accessibilityLabel={item.activo ? `Ocultar ${item.nombre}` : `Mostrar ${item.nombre}`}
              >
                {item.activo
                  ? <IconEye size={18} color="#34c759" />
                  : <IconEyeOff size={18} color={colors.textTertiary} />
                }
              </Pressable>
              <IconChevronRight size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 },
  addBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },

  list: { paddingHorizontal: spacing.xl, paddingBottom: 32, gap: spacing.sm },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nombre: { flex: 1, fontFamily: fonts.heading, fontSize: 14, color: colors.textPrimary },
  inactivo: { color: colors.textTertiary, textDecorationLine: 'line-through' },
  precio: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },

  catBadge: {
    backgroundColor: colors.bgSurface, borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  catBadgeText: { fontFamily: fonts.heading, fontSize: 10, color: colors.textSecondary },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary },

  eyeBtn: { padding: 4 },

  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary,
    marginBottom: spacing.sm, letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', marginBottom: spacing.xl,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.accent, borderRadius: radius.lg,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl,
    minHeight: 52, justifyContent: 'center',
  },
  ctaBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
});
