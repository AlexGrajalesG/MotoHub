import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, ScrollView, TextInput,
  AccessibilityInfo, RefreshControl, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  IconBuildingStore, IconMapPin, IconSearch, IconTool, IconX, IconClock,
  IconChevronRight, IconFilterOff,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { tokens } from '../../lib/tokens';
import { fetchPromediosBatch, type Promedio } from '../../lib/calificaciones';
import EstrellasDisplay from '../../components/EstrellasDisplay';
import TopBar from '../../components/TopBar';
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

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/** Estado de hoy con una frase util ("Cierra a las 18:00") en vez de solo abierto/cerrado. */
function estadoHorario(horario: Negocio['horario']): { abierto: boolean; detalle: string } {
  if (!horario) return { abierto: false, detalle: 'Horario no disponible' };
  const now = new Date();
  const dia = horario[DIAS[now.getDay()]];
  if (!dia) return { abierto: false, detalle: 'Cerrado hoy' };
  const [ah, am] = dia.abre.split(':').map(Number);
  const [ch, cm] = dia.cierra.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < ah * 60 + am) return { abierto: false, detalle: `Abre a las ${dia.abre}` };
  if (mins < ch * 60 + cm) return { abierto: true, detalle: `Cierra a las ${dia.cierra}` };
  return { abierto: false, detalle: 'Cerrado por hoy' };
}

const TIPO_LABELS: Record<string, string> = {
  taller: 'Taller', tienda: 'Tienda', concesionario: 'Concesionario', mixto: 'Taller y tienda',
};

const FILTROS = [
  { key: 'Todos',  label: 'Todos',    Icon: null },
  { key: 'taller', label: 'Talleres', Icon: IconTool },
  { key: 'tienda', label: 'Tiendas',  Icon: IconBuildingStore },
];

// ─── Esqueleto de carga ─────────────────────────────────────────────────────

function EsqueletoCard({ reduceMotion }: { reduceMotion: boolean }) {
  const opacidad = useRef(new Animated.Value(reduceMotion ? 0.6 : 0.4)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(opacidad, { toValue: 0.9, duration: 700, useNativeDriver: true }),
      Animated.timing(opacidad, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View style={[s.card, { opacity: opacidad }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[s.foto, { backgroundColor: colors.bgSurface }]} />
      <View style={s.cardBody}>
        <View style={[s.esqLinea, { width: '65%', height: 20 }]} />
        <View style={[s.esqLinea, { width: '40%' }]} />
        <View style={[s.esqLinea, { width: '55%' }]} />
      </View>
    </Animated.View>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

const NegocioCard = memo(function NegocioCard({
  item, navigation, index, reduceMotion, promedio,
}: { item: Negocio; navigation: any; index: number; reduceMotion: boolean; promedio?: Promedio }) {
  const { abierto, detalle } = estadoHorario(item.horario);

  return (
    <PressableCard
      index={index}
      reduceMotion={reduceMotion}
      onPress={() => navigation.navigate('NegocioDetalle', { negocio: item })}
      style={s.card}
    >
      {/* Foto */}
      <View style={s.foto}>
        {item.foto_url ? (
          <Image source={{ uri: item.foto_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <>
            <LinearGradient
              colors={[colors.accentDark, colors.bgSurface]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <IconBuildingStore size={44} color="rgba(72,151,90,0.35)" />
          </>
        )}
        <LinearGradient colors={['transparent', colors.bgCard]} style={s.fotoDegradado} pointerEvents="none" />

        <View style={[s.insignia, s.insigniaIzq]}>
          <View style={[s.punto, abierto && s.puntoAbierto]} />
          <Text style={[s.insigniaTexto, abierto && s.textoAbierto]}>{abierto ? 'Abierto' : 'Cerrado'}</Text>
        </View>
        <View style={[s.insignia, s.insigniaDer]}>
          <Text style={s.insigniaTexto}>{TIPO_LABELS[item.tipo] ?? item.tipo}</Text>
        </View>
      </View>

      {/* Contenido */}
      <View style={s.cardBody}>
        <Text style={s.nombre} numberOfLines={1}>{item.nombre}</Text>

        <View style={s.meta}>
          <IconMapPin size={14} color={colors.textTertiary} />
          <Text style={s.metaTexto} numberOfLines={1}>
            {[item.direccion, item.ciudad].filter(Boolean).join(', ') || 'Ubicación no disponible'}
          </Text>
        </View>

        <View style={s.meta}>
          <IconClock size={14} color={abierto ? colors.success : colors.textTertiary} />
          <Text style={[s.metaTexto, abierto && { color: colors.success }]}>{detalle}</Text>
          {promedio && promedio.total > 0 && (
            <View style={s.estrellas}>
              <EstrellasDisplay promedio={promedio.promedio} total={promedio.total} size={12} />
            </View>
          )}
        </View>

        {item.atiende.length > 0 && (
          <View style={s.tags}>
            {item.atiende.map(a => (
              <View key={a} style={s.tag}>
                <Text style={s.tagTexto}>{a.charAt(0).toUpperCase() + a.slice(1)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.cta}>
          <Text style={s.ctaTexto}>Ver servicios y agendar</Text>
          <IconChevronRight size={18} color={colors.accent} />
        </View>
      </View>
    </PressableCard>
  );
});

// ─── Pantalla ───────────────────────────────────────────────────────────────

export default function ServiciosScreen({ navigation }: any) {
  const { unreadCount }                 = useNotificaciones();
  const [negocios, setNegocios]         = useState<Negocio[]>([]);
  const [busqueda, setBusqueda]         = useState('');
  const [filtroTipo, setFiltroTipo]     = useState('Todos');
  const [soloAbiertos, setSoloAbiertos] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [refrescando, setRefrescando]   = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [promedios, setPromedios]       = useState<Record<string, Promedio>>({});
  const yaCargo = useRef(false);

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion); }, []);
  useFocusEffect(useCallback(() => { fetchNegocios(); }, []));

  async function fetchNegocios() {
    // el esqueleto solo se ve la primera vez; despues se recarga sin borrar la lista
    if (!yaCargo.current) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('negocios')
        .select('id, nombre, tipo, descripcion, direccion, ciudad, atiende, horario, telefono, foto_url')
        .eq('activo', true)
        .order('nombre', { ascending: true });
      if (error) console.error(error.message);
      const lista = (data as Negocio[]) ?? [];
      setNegocios(lista);
      yaCargo.current = true;
      fetchPromediosBatch('negocio', lista.map(n => n.id)).then(setPromedios);
    } finally {
      setLoading(false);
    }
  }

  async function refrescar() {
    setRefrescando(true);
    await fetchNegocios();
    setRefrescando(false);
  }

  const q = busqueda.trim().toLowerCase();
  const hayFiltros = q !== '' || filtroTipo !== 'Todos' || soloAbiertos;

  function limpiarFiltros() {
    setBusqueda(''); setFiltroTipo('Todos'); setSoloAbiertos(false);
  }

  const visibles = negocios.filter(n => {
    const pasaTipo = filtroTipo === 'Todos'
      ? true
      : filtroTipo === 'taller'
        ? ['taller', 'mixto'].includes(n.tipo)
        : ['tienda', 'mixto'].includes(n.tipo);
    const pasaBusqueda = !q
      || n.nombre.toLowerCase().includes(q)
      || (n.ciudad ?? '').toLowerCase().includes(q);
    const pasaAbierto = !soloAbiertos || estadoHorario(n.horario).abierto;
    return pasaTipo && pasaBusqueda && pasaAbierto;
  });

  return (
    <View style={s.container}>
      <TopBar
        unreadCount={unreadCount}
        onPressBell={() => navigation.navigate('Notificaciones')}
        onPressMisCitas={() => navigation.navigate('MisCitas')}
      />

      {/* Búsqueda */}
      <View style={s.busquedaWrap}>
        <IconSearch size={20} color={colors.textTertiary} />
        <TextInput
          style={s.busquedaInput}
          placeholder="Buscar por nombre o ciudad"
          placeholderTextColor={colors.textTertiary}
          value={busqueda}
          onChangeText={setBusqueda}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Buscar talleres y tiendas por nombre o ciudad"
        />
        {busqueda.length > 0 && (
          <Pressable
            onPress={() => setBusqueda('')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Borrar búsqueda"
            style={({ pressed }) => [s.borrarBtn, pressed && { opacity: 0.6 }]}
          >
            <IconX size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
        style={s.chipsScroll}
      >
        {FILTROS.map(({ key, label, Icon }) => {
          const activo = filtroTipo === key;
          return (
            <Pressable
              key={key}
              style={({ pressed }) => [s.chip, activo && s.chipActivo, pressed && { opacity: 0.85 }]}
              onPress={() => setFiltroTipo(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
            >
              {Icon && <Icon size={16} color={activo ? colors.accent : colors.textSecondary} />}
              <Text style={[s.chipTexto, activo && s.chipTextoActivo]}>{label}</Text>
            </Pressable>
          );
        })}
        <View style={s.separador} />
        <Pressable
          style={({ pressed }) => [s.chip, soloAbiertos && s.chipActivo, pressed && { opacity: 0.85 }]}
          onPress={() => setSoloAbiertos(v => !v)}
          accessibilityRole="button"
          accessibilityState={{ selected: soloAbiertos }}
        >
          <View style={[s.punto, s.puntoAbierto, !soloAbiertos && { backgroundColor: colors.textTertiary }]} />
          <Text style={[s.chipTexto, soloAbiertos && s.chipTextoActivo]}>Abiertos ahora</Text>
        </Pressable>
      </ScrollView>

      {/* Lista */}
      {loading ? (
        <View style={s.list}>
          {[0, 1, 2].map(i => <EsqueletoCard key={i} reduceMotion={reduceMotion} />)}
        </View>
      ) : visibles.length === 0 ? (
        <View style={s.vacio}>
          <View style={s.vacioIcono}>
            {hayFiltros
              ? <IconFilterOff size={40} color={colors.textTertiary} />
              : <IconBuildingStore size={40} color={colors.textTertiary} />}
          </View>
          <Text style={s.vacioTitulo}>
            {hayFiltros ? 'No encontramos resultados' : 'Aún no hay talleres ni tiendas'}
          </Text>
          <Text style={s.vacioSub}>
            {hayFiltros ? 'Prueba con otra búsqueda o quita los filtros.' : 'Vuelve pronto: estamos sumando negocios.'}
          </Text>
          {hayFiltros && (
            <Pressable
              style={({ pressed }) => [s.vacioBoton, pressed && { opacity: 0.85 }]}
              onPress={limpiarFiltros}
              accessibilityRole="button"
            >
              <Text style={s.vacioBotonTexto}>Quitar filtros</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={visibles}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={refrescar}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.bgCard}
            />
          }
          ListHeaderComponent={
            <View style={s.listHeader}>
              <Text style={s.listHeaderTitulo}>Talleres y tiendas</Text>
              <Text style={s.listHeaderConteo}>
                {visibles.length} {visibles.length === 1 ? 'lugar' : 'lugares'}
              </Text>
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

  /* Búsqueda */
  busquedaWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.xl, marginBottom: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.lg, minHeight: 52,
  },
  busquedaInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary, paddingVertical: 12 },
  borrarBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },

  /* Filtros */
  chipsScroll: { flexGrow: 0 },
  chipsRow: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
  },
  chipActivo: { backgroundColor: 'rgba(72,151,90,0.15)', borderColor: colors.accent },
  chipTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.textSecondary },
  chipTextoActivo: { color: colors.accent },
  separador: { width: 1, height: 22, backgroundColor: colors.bgSurface, marginHorizontal: 2 },

  /* Lista */
  list: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, marginTop: spacing.xs,
  },
  listHeaderTitulo: { fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3 },
  listHeaderConteo: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },

  /* Card */
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.bgSurface, marginBottom: spacing.lg,
  },
  foto: {
    height: 150, width: '100%', backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  fotoDegradado: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },

  insignia: {
    position: 'absolute', top: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(2,2,2,0.6)', borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  insigniaIzq: { left: spacing.md },
  insigniaDer: { right: spacing.md },
  insigniaTexto: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },
  textoAbierto: { color: colors.success },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textTertiary },
  puntoAbierto: { backgroundColor: colors.success },

  cardBody: { padding: spacing.lg, gap: spacing.sm },
  nombre: { fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3, lineHeight: 26 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTexto: { flexShrink: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  estrellas: { marginLeft: 'auto' },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.bgElevated, borderRadius: radius.pill },
  tagTexto: { fontFamily: fonts.heading, fontSize: 12, color: colors.textPrimary },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.sm, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.bgSurface,
  },
  ctaTexto: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },

  /* Esqueleto */
  esqLinea: { height: 14, borderRadius: 7, backgroundColor: colors.bgSurface },

  /* Vacío */
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, paddingBottom: 60 },
  vacioIcono: {
    width: 88, height: 88, borderRadius: radius.xl, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  vacioTitulo: { fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3, textAlign: 'center' },
  vacioSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  vacioBoton: {
    marginTop: spacing.xl, minHeight: 48, paddingHorizontal: spacing.xl, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.accent, justifyContent: 'center',
  },
  vacioBotonTexto: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },
});
