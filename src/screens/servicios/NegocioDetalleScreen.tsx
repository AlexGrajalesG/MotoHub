import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Linking, StyleSheet as RN,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  IconArrowLeft, IconMapPin, IconPhone, IconCalendar, IconBell, IconTools, IconPackage,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { openTel } from '../../lib/openUrl';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { tokens } from '../../lib/tokens';
import { formatPrecioServicio, formatCOP, type TipoPrecio } from '../../lib/precio';
import { fetchPromedio, type Promedio } from '../../lib/calificaciones';
import { fetchProductosDeNegocio, type Producto } from '../../lib/productos';
import EstrellasDisplay from '../../components/EstrellasDisplay';

const { colors, spacing, radius, fonts } = tokens;

type Negocio = {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string | null;
  direccion: string | null;
  ciudad: string | null;
  atiende: string[];
  horario: Record<string, { abre: string; cierra: string } | null> | null;
  telefono: string | null;
  foto_url: string | null;
};

type Servicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  aplica_a: string[];
  duracion_minutos: number | null;
  tipo_precio: TipoPrecio;
  precio_base: number | null;
};

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function estaAbierto(horario: Negocio['horario']): boolean {
  if (!horario) return false;
  const now = new Date();
  const turno = horario[DIAS[now.getDay()]];
  if (!turno) return false;
  const [ah, am] = turno.abre.split(':').map(Number);
  const [ch, cm] = turno.cierra.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= ah * 60 + am && mins < ch * 60 + cm;
}

const BENTO_TINTS = [
  { bg: 'rgba(72,151,90,0.12)',  color: colors.accent  },
  { bg: 'rgba(36,154,209,0.12)', color: '#249ad1'      },
  { bg: 'rgba(47,168,155,0.12)',  color: colors.success },
];

export default function NegocioDetalleScreen({ route, navigation }: any) {
  const negocio: Negocio = route.params.negocio;
  const { unreadCount } = useNotificaciones();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [promedio,  setPromedio]  = useState<Promedio>({ promedio: 0, total: 0 });
  const [tab, setTab] = useState<'servicios' | 'productos'>(negocio.tipo === 'tienda' ? 'productos' : 'servicios');

  const muestraProductos = negocio.tipo !== 'taller';

  useEffect(() => {
    fetchServicios();
    fetchPromedio('negocio', negocio.id).then(setPromedio);
    if (muestraProductos) fetchProductosDeNegocio(negocio.id).then(setProductos);
  }, []);

  async function fetchServicios() {
    const { data, error } = await supabase
      .from('servicios')
      .select('id, nombre, descripcion, categoria, aplica_a, duracion_minutos, tipo_precio, precio_base')
      .eq('negocio_id', negocio.id)
      .eq('activo', true)
      .order('categoria');
    if (error) console.error(error.message);
    setServicios((data as Servicio[]) ?? []);
    setLoading(false);
  }

  const abierto = estaAbierto(negocio.horario);

  function abrirUbicacion() {
    const q = encodeURIComponent(`${negocio.direccion ?? ''}${negocio.ciudad ? ', ' + negocio.ciudad : ''}`);
    Linking.openURL(`https://www.waze.com/ul?q=${q}`);
  }

  // Primeros 3 servicios en bento; el resto como contador
  const bentoServicios = servicios.slice(0, 3);
  const masServicios   = servicios.length - bentoServicios.length;

  return (
    <View style={s.container}>

      {/* Barra flotante sobre el hero */}
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <IconArrowLeft size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.brand}>RODIX</Text>
        <Pressable
          style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.navigate('Notificaciones')}
          hitSlop={8}
          accessibilityLabel="Notificaciones"
        >
          <IconBell size={20} color={colors.textPrimary} />
          {unreadCount > 0 && <View style={s.bellDot} />}
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={s.hero}>
          {negocio.foto_url ? (
            <Image source={negocio.foto_url} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, s.heroPlaceholder]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(2,2,2,0.45)', colors.bgPrimary]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Badge de estado: abierto/cerrado */}
          <View style={s.heroBadges}>
            <View style={s.glassBadge}>
              <View style={[s.glassDot, abierto && s.glassDotOpen]} />
              <Text style={s.glassBadgeText}>
                {abierto ? 'Abierto ahora' : 'Cerrado'}
              </Text>
            </View>
          </View>

          {/* Nombre y ciudad al fondo del hero */}
          <View style={s.heroBottom}>
            <Text style={s.heroTitle}>{negocio.nombre}</Text>
            <View style={s.heroLoc}>
              {negocio.ciudad && (
                <>
                  <IconMapPin size={14} color={colors.accent} />
                  <Text style={s.heroCity}>{negocio.ciudad}</Text>
                </>
              )}
              {promedio.total > 0 && (
                <View style={{ marginLeft: negocio.ciudad ? spacing.sm : 0 }}>
                  <EstrellasDisplay promedio={promedio.promedio} total={promedio.total} size={14} />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Descripción ── */}
        {negocio.descripcion && (
          <View style={s.section}>
            <Text style={s.descripcion}>{negocio.descripcion}</Text>
          </View>
        )}

        {/* ── Toggle Servicios / Productos ── */}
        {muestraProductos && (
          <View style={s.tabsRow}>
            <Pressable style={[s.tabChip, tab === 'servicios' && s.tabChipActive]} onPress={() => setTab('servicios')}>
              <Text style={[s.tabChipText, tab === 'servicios' && s.tabChipTextActive]}>Servicios</Text>
            </Pressable>
            <Pressable style={[s.tabChip, tab === 'productos' && s.tabChipActive]} onPress={() => setTab('productos')}>
              <Text style={[s.tabChipText, tab === 'productos' && s.tabChipTextActive]}>Productos</Text>
            </Pressable>
          </View>
        )}

        {/* ── Productos — grid ── */}
        {muestraProductos && tab === 'productos' && (
          <View style={s.section}>
            {productos.length === 0 ? (
              <Text style={s.emptyText}>Sin productos publicados aún</Text>
            ) : (
              <View style={s.productosGrid}>
                {productos.map(p => (
                  <Pressable
                    key={p.id}
                    style={s.productoCard}
                    onPress={() => navigation.navigate('DetalleProducto', { producto: p, negocio })}
                  >
                    {p.fotos[0]
                      ? <Image source={{ uri: p.fotos[0] }} style={s.productoFoto} contentFit="cover" />
                      : <View style={[s.productoFoto, s.productoFotoPlaceholder]}><IconPackage size={28} color={colors.textTertiary} /></View>
                    }
                    {p.stock === 0 && (
                      <View style={s.agotadoBadge}><Text style={s.agotadoText}>Agotado</Text></View>
                    )}
                    <Text style={s.productoNombre} numberOfLines={2}>{p.nombre}</Text>
                    <Text style={s.productoPrecio}>{formatCOP(p.precio)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Servicios — bento grid ── */}
        {(!muestraProductos || tab === 'servicios') && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Servicios</Text>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.xl }} />
          ) : servicios.length === 0 ? (
            <Text style={s.emptyText}>Sin servicios registrados aún</Text>
          ) : (
            <View style={s.bentoWrap}>

              {/* Card grande — 1er servicio */}
              <View style={s.bentoLarge}>
                <View style={s.bentoLargeLeft}>
                  <View style={[s.bentoIconLg, { backgroundColor: BENTO_TINTS[0].bg }]}>
                    <IconTools size={28} color={BENTO_TINTS[0].color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bentoLargeName}>{bentoServicios[0].nombre}</Text>
                    {bentoServicios[0].descripcion && (
                      <Text style={s.bentoLargeDesc} numberOfLines={1}>
                        {bentoServicios[0].descripcion}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={s.bentoLargeRight}>
                  <Text style={s.bentoDesde}>Desde</Text>
                  <Text style={s.bentoLargePrecio}>{formatPrecioServicio(bentoServicios[0])}</Text>
                </View>
              </View>

              {/* Cards pequeñas — 2do y 3er servicio */}
              {bentoServicios.length > 1 && (
                <View style={s.bentoRow}>
                  {bentoServicios.slice(1).map((sv, idx) => {
                    const tint = BENTO_TINTS[idx + 1] ?? BENTO_TINTS[0];
                    return (
                      <View key={sv.id} style={s.bentoSmall}>
                        <View style={[s.bentoIconSm, { backgroundColor: tint.bg }]}>
                          <IconTools size={18} color={tint.color} />
                        </View>
                        <Text style={s.bentoSmallName} numberOfLines={2}>{sv.nombre}</Text>
                        <Text style={s.bentoSmallPrecio}>{formatPrecioServicio(sv)}</Text>
                      </View>
                    );
                  })}
                  {/* Placeholder si solo hay 2 servicios */}
                  {bentoServicios.length === 2 && <View style={s.bentoSmallEmpty} />}
                </View>
              )}

              {masServicios > 0 && (
                <Text style={s.masServicios}>
                  +{masServicios} servicio{masServicios !== 1 ? 's' : ''} más disponibles
                </Text>
              )}
            </View>
          )}
        </View>
        )}

        {/* ── Ubicación ── */}
        {(negocio.direccion || negocio.telefono) && (
          <View style={s.section}>
            <View style={s.locationCard}>
              {/* Placeholder de mapa */}
              <View style={s.mapPlaceholder}>
                <LinearGradient
                  colors={['rgba(72,151,90,0.1)', 'transparent']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <IconMapPin size={48} color={colors.textTertiary} />
                {negocio.direccion && (
                  <Pressable
                    style={({ pressed }) => [s.wazeChip, pressed && { opacity: 0.8 }]}
                    onPress={abrirUbicacion}
                  >
                    <Text style={s.wazeChipText}>Abrir en Waze</Text>
                  </Pressable>
                )}
              </View>

              {/* Info de contacto */}
              <View style={s.locationInfo}>
                <View style={{ flex: 1 }}>
                  {negocio.direccion && (
                    <Text style={s.locationDir}>{negocio.direccion}</Text>
                  )}
                  {negocio.ciudad && (
                    <Text style={s.locationCity}>{negocio.ciudad}</Text>
                  )}
                  {negocio.telefono && (
                    <Pressable onPress={() => openTel(negocio.telefono)}>
                      <Text style={s.locationPhone}>{negocio.telefono}</Text>
                    </Pressable>
                  )}
                </View>
                {negocio.direccion && (
                  <Pressable
                    style={({ pressed }) => [s.dirBtn, pressed && { opacity: 0.85 }]}
                    onPress={abrirUbicacion}
                    accessibilityLabel="Abrir ubicación en el mapa"
                  >
                    <IconMapPin size={18} color={colors.bgPrimary} />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Espacio para el CTA fijo */}
        <View style={{ height: 96 }} />
      </ScrollView>

      {/* ── CTA fija: Agendar Cita ── */}
      <View style={s.ctaWrap}>
        <LinearGradient
          colors={['transparent', colors.bgPrimary]}
          style={s.ctaGradient}
          pointerEvents="none"
        />
        <Pressable
          style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.88 }]}
          onPress={() => navigation.navigate('SolicitarCita', { negocio, servicios })}
        >
          <IconCalendar size={20} color={colors.onAccent} />
          <Text style={s.ctaBtnText}>Agendar Cita</Text>
        </Pressable>
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  /* ── Header flotante ── */
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.sm,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: 'rgba(2,2,2,0.65)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  brand: {
    fontFamily: fonts.display, fontSize: 18, color: colors.accent,
    textTransform: 'uppercase', letterSpacing: -0.5,
  },
  bellDot: {
    position: 'absolute', top: 5, right: 5,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.accent, borderWidth: 1.5, borderColor: 'rgba(2,2,2,0.7)',
  },

  /* ── Scroll ── */
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 },

  /* ── Hero ── */
  hero: { width: '100%', height: 320, position: 'relative' },
  heroPlaceholder: { backgroundColor: colors.bgElevated },
  heroBadges: { position: 'absolute', top: 100, right: spacing.xl, gap: 8 },
  glassBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  glassDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textTertiary },
  glassDotOpen: { backgroundColor: colors.success },
  glassBadgeText: {
    fontFamily: fonts.bold, fontSize: 11, color: '#fff',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  heroBottom: {
    position: 'absolute', bottom: spacing.xl,
    left: spacing.xl, right: spacing.xl,
  },
  heroTitle: {
    fontFamily: fonts.display, fontSize: 36, color: '#fff',
    lineHeight: 44, letterSpacing: -0.5,
  },
  heroLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, opacity: 0.85 },
  heroCity: { fontFamily: fonts.body, fontSize: 15, color: '#fff' },

  /* ── Secciones ── */
  section: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  sectionTitle: {
    fontFamily: fonts.heading, fontSize: 20, lineHeight: 26, color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  descripcion: {
    fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, lineHeight: 22,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textTertiary },

  tabsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  tabChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
  },
  tabChipActive: { borderColor: colors.accent, backgroundColor: 'rgba(72,151,90,0.12)' },
  tabChipText: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  tabChipTextActive: { color: colors.accent },

  productosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  productoCard: {
    width: '47%', backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface, padding: spacing.sm, gap: 4,
  },
  productoFoto: { width: '100%', height: 110, borderRadius: radius.md, backgroundColor: colors.bgSurface },
  productoFotoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  agotadoBadge: {
    position: 'absolute', top: spacing.sm + 4, left: spacing.sm + 4,
    backgroundColor: 'rgba(192,57,43,0.85)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  agotadoText: { fontFamily: fonts.bold, fontSize: 10, color: '#fff', textTransform: 'uppercase' },
  productoNombre: { fontFamily: fonts.heading, fontSize: 13, color: colors.textPrimary, marginTop: 4 },
  productoPrecio: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },

  /* ── Bento de servicios ── */
  bentoWrap: { gap: spacing.sm },
  bentoLarge: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  bentoLargeLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  bentoIconLg: {
    width: 48, height: 48, borderRadius: radius.lg,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  bentoLargeName: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  bentoLargeDesc: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  bentoLargeRight: { alignItems: 'flex-end', flexShrink: 0 },
  bentoDesde: {
    fontFamily: fonts.bold, fontSize: 11, color: colors.accent,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  bentoLargePrecio: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },

  bentoRow: { flexDirection: 'row', gap: spacing.sm },
  bentoSmall: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: spacing.md, gap: spacing.sm,
  },
  bentoSmallEmpty: { flex: 1 },
  bentoIconSm: {
    width: 40, height: 40, borderRadius: radius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  bentoSmallName: {
    fontFamily: fonts.bold, fontSize: 11, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  bentoSmallPrecio: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  masServicios: {
    fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary,
    textAlign: 'center', paddingTop: spacing.xs,
  },

  /* ── Ubicación ── */
  locationCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  mapPlaceholder: {
    height: 128, backgroundColor: colors.bgElevated,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  wazeChip: {
    position: 'absolute', bottom: 10, left: 12,
    backgroundColor: 'rgba(2,2,2,0.85)',
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  wazeChipText: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },
  locationInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md,
  },
  locationDir:   { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  locationCity:  { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  locationPhone: { fontFamily: fonts.body, fontSize: 13, color: colors.accent, marginTop: 4 },
  dirBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },

  /* ── CTA fija ── */
  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.xl, paddingBottom: spacing.xl,
  },
  ctaGradient: {
    position: 'absolute', top: -32, left: 0, right: 0, bottom: 0,
  },
  ctaBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaBtnText: {
    fontFamily: fonts.bold, fontSize: 15, color: colors.onAccent,
    textTransform: 'uppercase', letterSpacing: 1.5,
  },
});
