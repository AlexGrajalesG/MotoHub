import { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, AccessibilityInfo, RefreshControl,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  IconBike, IconCar, IconCarSuv, IconCar as IconCarDefault,
  IconPlus,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import TopBar from '../../components/TopBar';
import IconButton from '../../components/IconButton';
import PressableCard from '../../components/PressableCard';
import { useAuth } from '../../context/AuthContext';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { tokens } from '../../lib/tokens';
import { getDocStatus, DocStatus } from '../../lib/documentos';
import {
  calcularAlertas, calcularPrimerosPasos, type Alerta, type PasoInicial, type RecordatorioInicio,
} from '../../lib/inicio';
import { ResumenAtencion, PrimerosPasos, AccionesRapidas, SelectorVehiculo } from '../../components/InicioWidgets';

const { colors, spacing, radius, fonts } = tokens;
const CARD_WIDTH = Dimensions.get('window').width - spacing.xl * 2;

const VENCIMIENTO_CHIPS: { key: string; label: string }[] = [
  { key: 'soat',          label: 'SOAT'  },
  { key: 'tecnomecanica', label: 'Tecno' },
];

const FILTROS = [
  { key: 'todas', label: 'Todas' },
  { key: 'moto',  label: 'Motos' },
  { key: 'otros', label: 'Carros' },
] as const;

type FiltroKey = typeof FILTROS[number]['key'];

type Vehiculo = {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  tipo: string;
  kilometraje: number;
  fotos: string[];
  documentos: { tipo: string; fecha_vencimiento: string | null; created_at: string }[];
};

/** Estado de vencimiento del documento más reciente con fecha capturada, por tipo. */
function getEstadoDocumento(documentos: Vehiculo['documentos'], tipo: string): DocStatus | null {
  const docs = documentos.filter(d => d.tipo === tipo && d.fecha_vencimiento);
  if (docs.length === 0) return null;
  const masReciente = docs.reduce((a, b) => (a.fecha_vencimiento! > b.fecha_vencimiento! ? a : b));
  return getDocStatus(masReciente.fecha_vencimiento);
}

function vencimientoBadgeText(label: string, status: DocStatus): string {
  if (status.estado === 'vencido')  return `${label}: Vencido`;
  if (status.estado === 'proximo')  {
    return status.diasRestantes <= 7
      ? `${label}: Vence pronto`
      : `${label}: ${status.diasRestantes} días`;
  }
  return `${label}: Al día`;
}

function saludoPorHora(): string {
  const h = new Date().getHours();
  if (h < 12) return '¡Buenos días, parcero!';
  if (h < 19) return '¡Buenas tardes, parcero!';
  return '¡Buenas noches, parcero!';
}

function TipoIcon({ tipo, size = 24, color }: { tipo: string; size?: number; color?: string }) {
  const c = color ?? colors.iconInactive;
  if (tipo === 'moto')      return <IconBike   size={size} color={c} />;
  if (tipo === 'carro')     return <IconCar    size={size} color={c} />;
  if (tipo === 'camioneta') return <IconCarSuv size={size} color={c} />;
  return <IconCarDefault size={size} color={c} />;
}

const VehiculoCard = memo(function VehiculoCard({ item, index, navigation, reduceMotion }: {
  item: Vehiculo;
  index: number;
  navigation: any;
  reduceMotion: boolean;
}) {
  return (
    <PressableCard
      index={index}
      reduceMotion={reduceMotion}
      onPress={() => navigation.navigate('DetalleVehiculo', { vehiculo: item })}
      style={styles.card}
      entranceDistance={24}
      scaleTo={0.97}
    >
        {/* Foto */}
        <View style={styles.photoWrap}>
          {item.fotos?.[0] ? (
            <Image source={item.fotos[0]} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <TipoIcon tipo={item.tipo} size={56} color={colors.bgSurface} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', colors.bgCard]}
            style={styles.photoGradient}
            pointerEvents="none"
          />

          {/* Badges de vencimiento SOAT/Tecno */}
          <View style={styles.vencimientoBadges}>
            {VENCIMIENTO_CHIPS.map(({ key, label }) => {
              const status = getEstadoDocumento(item.documentos ?? [], key);
              if (!status) return null;
              return (
                <View key={key} style={styles.vencimientoBadge}>
                  <View style={[styles.vencimientoDot, { backgroundColor: status.color }]} />
                  <Text style={styles.vencimientoBadgeText}>
                    {vencimientoBadgeText(label, status)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.infoLeft}>
            <Text style={styles.nombre} numberOfLines={1}>{item.marca} {item.modelo}</Text>
            <Text style={styles.cardSubtitle}>{item.anio} · {item.kilometraje.toLocaleString()} km</Text>
          </View>
          <View style={styles.placaChip}>
            <Text style={styles.placaText}>{item.placa.toUpperCase()}</Text>
          </View>
        </View>
    </PressableCard>
  );
});

export default function GarageScreen({ navigation }: any) {
  const { session } = useAuth();
  const { unreadCount } = useNotificaciones();
  const [vehiculos, setVehiculos]         = useState<Vehiculo[]>([]);
  const [recordatorios, setRecordatorios] = useState<RecordatorioInicio[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refrescando, setRefrescando]     = useState(false);
  const [errorCarga, setErrorCarga]       = useState(false);
  const [reduceMotion, setReduceMotion]   = useState(false);
  const [filtro, setFiltro]               = useState<FiltroKey>('todas');
  const [selector, setSelector]           = useState<{ titulo: string; accion: (v: Vehiculo) => void } | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // El spinner de pantalla completa solo se ve la primera vez (loading arranca en true y nunca vuelve a true).
  useFocusEffect(useCallback(() => { fetchTodo(); }, []));

  async function fetchTodo() {
    try {
      setErrorCarga(false);
      const { data, error } = await supabase
        .from('vehiculos')
        .select('id, marca, modelo, anio, placa, tipo, kilometraje, fotos, documentos(tipo, fecha_vencimiento, created_at)')
        .eq('propietario_id', session?.user.id)
        .eq('activo', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const lista = (data as Vehiculo[]) ?? [];
      setVehiculos(lista);

      if (lista.length === 0) {
        setRecordatorios([]);
      } else {
        const { data: recs, error: errRec } = await supabase
          .from('recordatorios')
          .select('id, vehiculo_id, tipo, fecha_limite, km_limite, km_aviso, estado')
          .in('vehiculo_id', lista.map(v => v.id));
        if (errRec) throw errRec;
        setRecordatorios((recs as RecordatorioInicio[]) ?? []);
      }
    } catch (e) {
      console.error(e);
      setErrorCarga(true);
    } finally {
      setLoading(false);
    }
  }

  async function refrescar() {
    setRefrescando(true);
    await fetchTodo();
    setRefrescando(false);
  }

  const alertas = useMemo(() => calcularAlertas(vehiculos, recordatorios), [vehiculos, recordatorios]);
  const primerosPasos = useMemo(() => calcularPrimerosPasos(vehiculos, recordatorios), [vehiculos, recordatorios]);

  const hayMezcla = vehiculos.some(v => v.tipo === 'moto') && vehiculos.some(v => v.tipo !== 'moto');
  const vehiculosFiltrados = vehiculos.filter(v => {
    if (filtro === 'todas' || !hayMezcla) return true;
    if (filtro === 'moto')  return v.tipo === 'moto';
    return v.tipo !== 'moto';
  });

  // Con un solo vehiculo la accion es directa; con varios se pregunta cual.
  function conVehiculo(titulo: string, accion: (v: Vehiculo) => void) {
    if (vehiculos.length === 0) { navigation.navigate('AgregarVehiculo'); return; }
    if (vehiculos.length === 1) { accion(vehiculos[0]); return; }
    setSelector({ titulo, accion });
  }

  const irKm = () => conVehiculo('¿A qué vehículo?', v => navigation.navigate('DetalleVehiculo', { vehiculo: v, abrirKm: true }));
  const irRecordatorio = () => conVehiculo('¿Para qué vehículo?', v => navigation.navigate('CrearRecordatorio', { vehiculo: v }));
  const irServicio = () => conVehiculo('¿En qué vehículo?', v => navigation.navigate('AgregarHistorial', { vehiculo: v }));

  function onPressPaso(p: PasoInicial) {
    if (p.key === 'vehiculo' || vehiculos.length === 0) { navigation.navigate('AgregarVehiculo'); return; }
    if (p.key === 'soat') {
      const v = vehiculos.find(x => !(x.documentos ?? []).some(d => d.tipo === 'soat')) ?? vehiculos[0];
      navigation.navigate('Documentos', { vehiculo: v });
      return;
    }
    irRecordatorio();
  }

  function onPressAlerta(a: Alerta) {
    const v = vehiculos.find(x => x.id === a.vehiculoId);
    if (v) navigation.navigate(a.destino === 'documentos' ? 'Documentos' : 'Recordatorios', { vehiculo: v });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const subtitulo = vehiculos.length === 0
    ? 'Empecemos por tu primer vehículo'
    : alertas.length > 0
      ? `Tienes ${alertas.length} ${alertas.length === 1 ? 'cosa' : 'cosas'} por revisar`
      : 'Tu garage está al día.';

  const encabezado = (
    <View>
      <View style={styles.headerLista}>
        <Text style={styles.title}>{saludoPorHora()}</Text>
        <Text style={styles.subtitle}>{subtitulo}</Text>
      </View>

      {errorCarga && (
        <Pressable style={styles.bannerError} onPress={refrescar} accessibilityRole="button" accessibilityLabel="Reintentar">
          <Text style={styles.bannerErrorTexto}>No pudimos actualizar. Toca para reintentar.</Text>
        </Pressable>
      )}

      <View style={styles.bloques}>
        {vehiculos.length > 0 && <ResumenAtencion alertas={alertas} onPressAlerta={onPressAlerta} />}
        {!primerosPasos.completo && (
          <PrimerosPasos
            pasos={primerosPasos.pasos}
            hechos={primerosPasos.hechos}
            total={primerosPasos.total}
            onPressPaso={onPressPaso}
          />
        )}
        {vehiculos.length > 0 && (
          <AccionesRapidas onKm={irKm} onRecordatorio={irRecordatorio} onServicio={irServicio} />
        )}
      </View>

      {vehiculos.length > 0 && (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Mis vehículos</Text>
          <Text style={styles.seccionConteo}>{vehiculos.length}</Text>
        </View>
      )}

      {hayMezcla && (
        <View style={[styles.filtros, { marginHorizontal: -spacing.xl }]}>
          {FILTROS.map(({ key, label }) => {
            const activo = filtro === key;
            return (
              <Pressable
                key={key}
                style={[styles.filtroChip, activo && styles.filtroChipActivo]}
                onPress={() => setFiltro(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
              >
                <Text style={[styles.filtroChipText, activo && styles.filtroChipTextActivo]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <TopBar unreadCount={unreadCount} onPressBell={() => navigation.navigate('Notificaciones')} />

      <FlatList
        data={vehiculosFiltrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={encabezado}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={refrescar}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.bgCard}
          />
        }
        ListEmptyComponent={
          vehiculos.length === 0 ? (
            <View style={styles.vacioCta}>
              <Pressable
                style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85 }]}
                onPress={() => navigation.navigate('AgregarVehiculo')}
                accessibilityRole="button"
                accessibilityLabel="Agregar mi primer vehículo"
              >
                <IconPlus size={20} color={colors.onAccent} />
                <Text style={styles.emptyBtnText}>Agregar mi primer vehículo</Text>
              </Pressable>
              <Text style={styles.emptySubtitle}>Documentos, recordatorios e historial en un solo lugar</Text>
            </View>
          ) : (
            <View style={styles.vacioCta}>
              <Text style={styles.emptyTitle}>Sin vehículos en esta categoría</Text>
              <Text style={styles.emptySubtitle}>Prueba con otro filtro arriba</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <VehiculoCard item={item} index={index} navigation={navigation} reduceMotion={reduceMotion} />
        )}
      />

      {vehiculos.length > 0 && (
        <IconButton
          size={56}
          style={styles.fab}
          onPress={() => navigation.navigate('AgregarVehiculo')}
          accessibilityLabel="Agregar vehículo"
        >
          <IconPlus size={26} color={colors.onAccent} />
        </IconButton>
      )}

      <SelectorVehiculo
        visible={!!selector}
        titulo={selector?.titulo ?? ''}
        vehiculos={vehiculos}
        onElegir={(id) => {
          const v = vehiculos.find(x => x.id === id);
          const accion = selector?.accion;
          setSelector(null);
          if (v && accion) accion(v);
        }}
        onCerrar={() => setSelector(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },

  /* ── Inicio: bloques ── */
  headerLista: { paddingBottom: spacing.lg },
  bloques: { gap: spacing.md, marginBottom: spacing.xl },
  seccion: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.md },
  seccionTitulo: { fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3 },
  seccionConteo: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  bannerError: {
    minHeight: 44, justifyContent: 'center', borderRadius: radius.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: colors.dangerActionBg, borderWidth: 1, borderColor: colors.dangerActionBorder,
  },
  bannerErrorTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary },
  vacioCta: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },

  /* ── Header (saludo) ── */
  header: {
    paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.heading, fontSize: 20, lineHeight: 26, color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 3,
  },

  /* ── Botón flotante: agregar vehículo ── */
  fab: {
    position: 'absolute', right: spacing.xl, bottom: spacing.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 6,
  },

  /* ── Filtros ── */
  filtros: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
  },
  filtroChip: {
    paddingVertical: 8, paddingHorizontal: spacing.xl,
    borderRadius: radius.pill, backgroundColor: colors.bgSurface,
    borderWidth: 1, borderColor: colors.bgSurface,
  },
  filtroChipActivo: {
    backgroundColor: 'rgba(72,151,90,0.1)', borderColor: colors.accent,
  },
  filtroChipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary },
  filtroChipTextActivo: { color: colors.accent },

  /* ── Lista ── */
  list: { paddingHorizontal: spacing.xl, paddingBottom: 32, gap: spacing.lg },

  /* ── Card ── */
  card: {
    width: CARD_WIDTH, backgroundColor: colors.bgCard,
    borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.bgSurface,
  },

  photoWrap:       { width: '100%', height: 180, position: 'relative' },
  photo:           { width: '100%', height: '100%' },
  photoPlaceholder: {
    width: '100%', height: '100%', backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  photoGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 90,
  },

  /* ── Badges de vencimiento (SOAT/Tecno) ── */
  vencimientoBadges: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    gap: 6, alignItems: 'flex-end',
  },
  vencimientoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(2,2,2,0.75)', borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  vencimientoDot: { width: 8, height: 8, borderRadius: 4 },
  vencimientoBadgeText: {
    fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.3,
    color: '#fff', textTransform: 'uppercase',
  },

  info: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  infoLeft: { flex: 1, marginRight: spacing.sm },
  nombre: {
    fontFamily: fonts.heading, fontSize: 20, lineHeight: 26, color: colors.textPrimary,
  },
  cardSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  placaChip: {
    backgroundColor: colors.bgSurface, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(169,138,130,0.2)',
    paddingHorizontal: 12, paddingVertical: 4,
  },
  placaText: {
    fontFamily: fonts.display, fontSize: 14, color: colors.textPrimary,
    letterSpacing: 2, textTransform: 'uppercase',
  },

  /* ── Empty state ── */
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  emptyCard: {
    width: 110, height: 110, backgroundColor: colors.bgCard,
    borderRadius: radius.xl, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.bgSurface,
  },
  emptyTitle: {
    fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary,
    marginBottom: spacing.sm, letterSpacing: -0.3, textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 21, marginBottom: spacing.xxl,
  },
  emptyBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl,
    minHeight: 52, justifyContent: 'center',
  },
  emptyBtnText: { fontFamily: fonts.bold, color: colors.onAccent, fontSize: 16 },
});
