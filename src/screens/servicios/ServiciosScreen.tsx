import { useState, useCallback, useEffect, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
  ScrollView, TextInput, AccessibilityInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  IconBuildingStore, IconMapPin,
  IconSearch, IconTool, IconAdjustmentsHorizontal,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { tokens } from '../../lib/tokens';
import { fetchPromediosBatch, type Promedio } from '../../lib/calificaciones';
import EstrellasDisplay from '../../components/EstrellasDisplay';
import TopBar from '../../components/TopBar';
import IconButton from '../../components/IconButton';
import PressableCard from '../../components/PressableCard';

const { colors, spacing, radius, fonts } = tokens;

type Negocio = {
  id: string;
  nombre: string;
  tipo: 'taller' | 'tienda' | 'concesionario' | 'mixto';
  descripcion: string | null;
  direccion: string | null;
  ciudad: string | null;
  atiende: string[];
  horario: Record<string, { abre: string; cierra: string } | null> | null;
  telefono: string | null;
  foto_url: string | null;
};

const DIAS = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];

function estaAbierto(horario: Negocio['horario']): boolean {
  if (!horario) return false;
  const now  = new Date();
  const dia  = horario[DIAS[now.getDay()]];
  if (!dia) return false;
  const [ah, am] = dia.abre.split(':').map(Number);
  const [ch, cm] = dia.cierra.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= ah * 60 + am && mins < ch * 60 + cm;
}

const TIPO_LABELS: Record<string, string> = {
  taller: 'Taller', tienda: 'Tienda', concesionario: 'Concesion.', mixto: 'Mixto',
};

const FILTROS = [
  { key: 'Todos',   label: 'TODOS',    Icon: null             },
  { key: 'taller',  label: 'TALLERES', Icon: IconTool         },
  { key: 'tienda',  label: 'TIENDAS',  Icon: IconBuildingStore },
];

// ─── Card ───────────────────────────────────────────────────────────────────

const NegocioCard = memo(function NegocioCard({
  item, navigation, index, reduceMotion, promedio,
}: { item: Negocio; navigation: any; index: number; reduceMotion: boolean; promedio?: Promedio }) {
  const abierto = estaAbierto(item.horario);

  const goDetalle = () => navigation.navigate('NegocioDetalle', { negocio: item });

  return (
    <PressableCard index={index} reduceMotion={reduceMotion} onPress={goDetalle} style={s.card}>

        {/* ── Hero 180px ── */}
        <View style={s.photoWrap}>
          {item.foto_url ? (
            <Image source={{ uri: item.foto_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={['rgba(232,82,42,0.18)', colors.bgSurface]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}
          {/* Gradient fade bottom */}
          <LinearGradient
            colors={['transparent', colors.bgCard]}
            style={s.photoGradient}
            pointerEvents="none"
          />
          {/* Badge izquierda: abierto/cerrado */}
          <View style={[s.glassBadge, s.badgeLeft]}>
            <View style={[s.statusDot, abierto && s.dotOpen]} />
            <Text style={[s.glassBadgeText, abierto && s.openText]}>
              {abierto ? 'Abierto' : 'Cerrado'}
            </Text>
          </View>
          {/* Badge derecha: tipo */}
          <View style={[s.glassBadge, s.badgeRight]}>
            <Text style={s.glassBadgeText}>{TIPO_LABELS[item.tipo] ?? item.tipo}</Text>
          </View>
          {/* Icon placeholder cuando no hay foto */}
          {!item.foto_url && (
            <IconBuildingStore size={48} color="rgba(232,82,42,0.2)" />
          )}
        </View>

        {/* ── Body ── */}
        <View style={s.cardBody}>
          <Text style={s.cardNombre} numberOfLines={1}>{item.nombre}</Text>
          <View style={s.metaRow}>
            <IconMapPin size={13} color={colors.textTertiary} />
            <Text style={s.metaText} numberOfLines={1}>{item.ciudad ?? '—'}</Text>
            {promedio && promedio.total > 0 && (
              <>
                <Text style={s.metaText}>·</Text>
                <EstrellasDisplay promedio={promedio.promedio} total={promedio.total} size={12} />
              </>
            )}
          </View>

          {/* Service tags */}
          {item.atiende.length > 0 && (
            <View style={s.tagsRow}>
              {item.atiende.map(a => (
                <View key={a} style={s.tag}>
                  <Text style={s.tagText}>{a.charAt(0).toUpperCase() + a.slice(1)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* CTA — no es un Pressable propio: toda la card ya navega al detalle */}
          <View style={s.agendarBtn}>
            <Text style={s.agendarText}>VER DISPONIBILIDAD</Text>
          </View>
        </View>
    </PressableCard>
  );
});

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function ServiciosScreen({ navigation }: any) {
  const { unreadCount }                    = useNotificaciones();
  const [negocios, setNegocios]            = useState<Negocio[]>([]);
  const [busqueda, setBusqueda]            = useState('');
  const [filtroTipo, setFiltroTipo]        = useState('Todos');
  const [loading, setLoading]              = useState(true);
  const [reduceMotion, setReduceMotion]    = useState(false);
  const [promedios, setPromedios]          = useState<Record<string, Promedio>>({});

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion); }, []);
  useFocusEffect(useCallback(() => { fetchNegocios(); }, []));

  async function fetchNegocios() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('negocios')
        .select('id, nombre, tipo, descripcion, direccion, ciudad, atiende, horario, telefono, foto_url')
        .eq('activo', true)
        .order('nombre', { ascending: true });
      if (error) console.error(error.message);
      const lista = (data as Negocio[]) ?? [];
      setNegocios(lista);
      fetchPromediosBatch('negocio', lista.map(n => n.id)).then(setPromedios);
    } finally {
      setLoading(false);
    }
  }

  const visibles = negocios.filter(n => {
    const pasaTipo = filtroTipo === 'Todos'
      ? true
      : filtroTipo === 'taller'
        ? ['taller', 'mixto'].includes(n.tipo)
        : n.tipo === filtroTipo;
    const q = busqueda.trim().toLowerCase();
    const pasaBusqueda = !q
      || n.nombre.toLowerCase().includes(q)
      || (n.ciudad ?? '').toLowerCase().includes(q);
    return pasaTipo && pasaBusqueda;
  });

  return (
    <View style={s.container}>

      {/* ── Barra RODIX ── */}
      <TopBar unreadCount={unreadCount} onPressBell={() => navigation.navigate('Notificaciones')} />

      {/* ── Búsqueda ── */}
      <View style={s.searchSection}>
        <View style={s.searchWrap}>
          <IconSearch size={18} color={colors.textTertiary} />
          <TextInput
            style={s.searchInput}
            placeholder="Busca talleres, repuestos..."
            placeholderTextColor={colors.textTertiary}
            value={busqueda}
            onChangeText={setBusqueda}
            returnKeyType="search"
          />
        </View>
        <IconButton size={50} style={s.filterBtn} accessibilityLabel="Filtros (próximamente)" disabled>
          <IconAdjustmentsHorizontal size={18} color={colors.textTertiary} />
        </IconButton>
      </View>

      {/* ── Categorías — fila única con iconos ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
        style={{ flexGrow: 0 }}
      >
        {FILTROS.map(({ key, label, Icon }) => {
          const active = filtroTipo === key;
          return (
            <Pressable
              key={key}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setFiltroTipo(key)}
            >
              {Icon && <Icon size={16} color={active ? colors.accent : colors.textSecondary} />}
              <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Lista ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : visibles.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconWrap}>
            <IconBuildingStore size={44} color={colors.bgSurface} />
          </View>
          <Text style={s.emptyTitle}>Sin resultados</Text>
          <Text style={s.emptySub}>Prueba con otros filtros</Text>
        </View>
      ) : (
        <FlatList
          data={visibles}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={s.listHeader}>
              <Text style={s.listHeaderTitle}>Servicios Disponibles</Text>
              <Text style={s.listHeaderCount}>{visibles.length}</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <NegocioCard
              item={item}
              navigation={navigation}
              index={index}
              reduceMotion={reduceMotion}
              promedio={promedios[item.id]}
            />
          )}
        />
      )}
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* ── Búsqueda ── */
  searchSection: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.xl, marginBottom: spacing.md,
  },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgSurface, borderRadius: radius.xl,
    paddingHorizontal: spacing.md, minHeight: 50,
  },
  searchInput: {
    flex: 1, fontFamily: fonts.body, fontSize: 15,
    color: colors.textPrimary, paddingVertical: 13,
  },
  filterBtn: { borderRadius: radius.xl },

  /* ── Chips filtro ── */
  chipsRow: {
    paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: radius.pill, borderWidth: 1,
    backgroundColor: colors.bgSurface, borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: 'transparent', borderColor: colors.accent,
  },
  chipText: {
    fontFamily: fonts.bold, fontSize: 11, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  chipTextActive: { color: colors.accent },

  /* ── Lista ── */
  list: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  listHeaderTitle: {
    fontFamily: fonts.heading, fontSize: 16, color: colors.textPrimary,
  },
  listHeaderCount: {
    fontFamily: fonts.bold, fontSize: 12, color: colors.accent,
  },

  /* ── Card ── */
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    overflow: 'hidden', marginBottom: spacing.md,
  },

  photoWrap: {
    height: 180, width: '100%',
    backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  photoGradient: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%',
  },
  glassBadge: {
    position: 'absolute', top: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeLeft:  { left: spacing.md  },
  badgeRight: { right: spacing.md },
  glassBadgeText: {
    fontFamily: fonts.bold, fontSize: 10, color: '#fff',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textTertiary },
  dotOpen:    { backgroundColor: colors.success },
  openText:   { color: colors.success },

  cardBody: { padding: spacing.lg, gap: spacing.sm },
  cardNombre: {
    fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary,
    letterSpacing: -0.3, lineHeight: 26,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: colors.bgElevated, borderRadius: radius.pill,
  },
  tagText: { fontFamily: fonts.bold, fontSize: 11, color: colors.textPrimary },

  agendarBtn: {
    marginTop: 4, backgroundColor: colors.accent,
    paddingVertical: 14, borderRadius: radius.md,
    alignItems: 'center',
  },
  agendarText: {
    fontFamily: fonts.bold, fontSize: 13, color: '#fff',
    textTransform: 'uppercase', letterSpacing: 1.5,
  },

  /* ── Empty ── */
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl,
  },
  emptyIconWrap: {
    width: 90, height: 90, backgroundColor: colors.bgCard,
    borderRadius: radius.xl, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.bgSurface,
  },
  emptyTitle: {
    fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary,
    marginBottom: spacing.sm, letterSpacing: -0.3,
  },
  emptySub: {
    fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center',
  },
});
