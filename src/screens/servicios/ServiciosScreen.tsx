import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, ScrollView, TextInput,
  AccessibilityInfo, RefreshControl, Animated, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  IconBuildingStore, IconMapPin, IconSearch, IconTool, IconX, IconClock,
  IconChevronRight, IconFilterOff, IconAdjustmentsHorizontal, IconMotorbike, IconCar, IconPackage,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { tokens } from '../../lib/tokens';
import { fetchPromediosBatch, type Promedio } from '../../lib/calificaciones';
import { formatCOP, formatPrecioServicio } from '../../lib/precio';
import {
  buscarProductos, buscarServicios, coincideVehiculo, tipoVehiculoPlural, imagenReferenciaNegocio,
  type Negocio, type ProductoConNegocio, type ServicioConNegocio, type TipoVehiculo,
} from '../../lib/buscadorServicios';
import EstrellasDisplay from '../../components/EstrellasDisplay';
import TopBar from '../../components/TopBar';
import PressableCard from '../../components/PressableCard';

const { colors, spacing, radius, fonts } = tokens;

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

const FILTROS_VEHICULO: { key: TipoVehiculo | 'Todos'; label: string; Icon: typeof IconMotorbike | null }[] = [
  { key: 'Todos', label: 'Todos', Icon: null },
  { key: 'moto',  label: 'Moto',  Icon: IconMotorbike },
  { key: 'carro', label: 'Carro', Icon: IconCar },
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
      {/* Foto (de referencia por rubro mientras el negocio no suba la suya) */}
      <View style={s.foto}>
        <Image source={item.foto_url ? { uri: item.foto_url } : imagenReferenciaNegocio(item.tipo)} style={StyleSheet.absoluteFill} contentFit="cover" />
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

// ─── Tarjetas de resultado (producto / servicio) ───────────────────────────

const ResultadoProductoCard = memo(function ResultadoProductoCard({ item, index, reduceMotion, navigation }: { item: ProductoConNegocio; index: number; reduceMotion: boolean; navigation: any }) {
  return (
    <PressableCard
      index={index}
      reduceMotion={reduceMotion}
      onPress={() => navigation.navigate('DetalleProducto', {
        producto: item,
        negocio: { id: item.negocio.id, nombre: item.negocio.nombre, telefono: item.negocio.telefono },
      })}
      style={s.filaResultado}
    >
      <View style={s.filaFoto}>
        {item.fotos?.[0]
          ? <Image source={{ uri: item.fotos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
          : <IconPackage size={22} color={colors.textTertiary} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.filaNombre} numberOfLines={1}>{item.nombre}</Text>
        <Text style={s.filaMeta} numberOfLines={1}>{item.negocio.nombre}</Text>
      </View>
      <Text style={s.filaPrecio}>{formatCOP(item.precio)}</Text>
    </PressableCard>
  );
});

const ResultadoServicioCard = memo(function ResultadoServicioCard({ item, index, reduceMotion, navigation }: { item: ServicioConNegocio; index: number; reduceMotion: boolean; navigation: any }) {
  return (
    <PressableCard
      index={index}
      reduceMotion={reduceMotion}
      onPress={() => navigation.navigate('NegocioDetalle', { negocio: item.negocio })}
      style={s.filaResultado}
    >
      <View style={s.filaFoto}>
        <IconTool size={20} color={colors.textTertiary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.filaNombre} numberOfLines={1}>{item.nombre}</Text>
        <Text style={s.filaMeta} numberOfLines={1}>{item.negocio.nombre}</Text>
      </View>
      <Text style={s.filaPrecio}>{formatPrecioServicio(item)}</Text>
    </PressableCard>
  );
});

// ─── Pantalla ───────────────────────────────────────────────────────────────

export default function ServiciosScreen({ navigation }: any) {
  const { session }                     = useAuth();
  const { unreadCount }                 = useNotificaciones();
  const [negocios, setNegocios]         = useState<Negocio[]>([]);
  const [busqueda, setBusqueda]         = useState('');
  const [filtroTipo, setFiltroTipo]     = useState('Todos');
  const [filtroVehiculo, setFiltroVehiculo] = useState<TipoVehiculo | 'Todos'>('Todos');
  const [filtroCiudad, setFiltroCiudad] = useState<string | 'Todas'>('Todas');
  const [soloAbiertos, setSoloAbiertos] = useState(false);
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [refrescando, setRefrescando]   = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [promedios, setPromedios]       = useState<Record<string, Promedio>>({});
  const [resultadosProductos, setResultadosProductos] = useState<ProductoConNegocio[]>([]);
  const [resultadosServicios, setResultadosServicios] = useState<ServicioConNegocio[]>([]);
  const [buscandoCatalogo, setBuscandoCatalogo] = useState(false);
  const yaCargo = useRef(false);

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion); }, []);
  useFocusEffect(useCallback(() => { fetchNegocios(); }, []));

  // Preselecciona el filtro de vehículo según el Garage, solo si la persona tiene un único tipo.
  useEffect(() => {
    if (!session?.user.id) return;
    supabase.from('vehiculos').select('tipo').eq('propietario_id', session.user.id).eq('activo', true).then(({ data }) => {
      const tipos = new Set((data ?? []).map((v: any) => v.tipo));
      if (tipos.size === 1) setFiltroVehiculo([...tipos][0] as TipoVehiculo);
    });
  }, [session?.user.id]);

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

  const q = busqueda.trim();
  const buscandoCatalogoActivo = q.length >= 2;

  // Busca en productos y servicios (con poco retraso, para no disparar una consulta por cada letra).
  useEffect(() => {
    if (!buscandoCatalogoActivo) { setResultadosProductos([]); setResultadosServicios([]); return; }
    setBuscandoCatalogo(true);
    const t = setTimeout(async () => {
      const [productos, servicios] = await Promise.all([buscarProductos(q), buscarServicios(q)]);
      setResultadosProductos(productos);
      setResultadosServicios(servicios);
      setBuscandoCatalogo(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q, buscandoCatalogoActivo]);

  const vehiculoActivo = filtroVehiculo === 'Todos' ? null : filtroVehiculo;
  const hayFiltros = filtroTipo !== 'Todos' || filtroVehiculo !== 'Todos' || filtroCiudad !== 'Todas' || soloAbiertos;
  const totalFiltrosActivos = [filtroTipo !== 'Todos', filtroVehiculo !== 'Todos', filtroCiudad !== 'Todas', soloAbiertos].filter(Boolean).length;

  function limpiarFiltros() {
    setBusqueda(''); setFiltroTipo('Todos'); setFiltroVehiculo('Todos'); setFiltroCiudad('Todas'); setSoloAbiertos(false);
  }

  const ciudadesDisponibles = [...new Set(negocios.map(n => n.ciudad).filter((c): c is string => !!c))].sort();

  const visibles = negocios.filter(n => {
    const pasaTipo = filtroTipo === 'Todos'
      ? true
      : filtroTipo === 'taller'
        ? ['taller', 'mixto'].includes(n.tipo)
        : ['tienda', 'mixto'].includes(n.tipo);
    const pasaBusqueda = !q
      || n.nombre.toLowerCase().includes(q.toLowerCase())
      || (n.ciudad ?? '').toLowerCase().includes(q.toLowerCase());
    const pasaVehiculo = coincideVehiculo(n.atiende, vehiculoActivo);
    const pasaCiudad = filtroCiudad === 'Todas' || n.ciudad === filtroCiudad;
    const pasaAbierto = !soloAbiertos || estadoHorario(n.horario).abierto;
    return pasaTipo && pasaBusqueda && pasaVehiculo && pasaCiudad && pasaAbierto;
  });

  const productosVisibles = resultadosProductos.filter(p =>
    coincideVehiculo(p.compatible_con, vehiculoActivo)
    && (filtroCiudad === 'Todas' || p.negocio.ciudad === filtroCiudad)
    && (filtroTipo === 'Todos' || (filtroTipo === 'taller' ? ['taller', 'mixto'] : ['tienda', 'mixto']).includes(p.negocio.tipo))
  );
  const serviciosVisibles = resultadosServicios.filter(sv =>
    coincideVehiculo(sv.aplica_a, vehiculoActivo)
    && (filtroCiudad === 'Todas' || sv.negocio.ciudad === filtroCiudad)
    && (filtroTipo === 'Todos' || (filtroTipo === 'taller' ? ['taller', 'mixto'] : ['tienda', 'mixto']).includes(sv.negocio.tipo))
  );
  const negociosPorNombre = buscandoCatalogoActivo ? visibles : [];
  const sinResultadosCatalogo = buscandoCatalogoActivo && !buscandoCatalogo
    && negociosPorNombre.length === 0 && productosVisibles.length === 0 && serviciosVisibles.length === 0;

  return (
    <View style={s.container}>
      <TopBar
        unreadCount={unreadCount}
        onPressBell={() => navigation.navigate('Notificaciones')}
        onPressMisCitas={() => navigation.navigate('MisCitas')}
      />

      {/* Búsqueda + filtros */}
      <View style={s.topRow}>
        <View style={s.busquedaWrap}>
          <IconSearch size={20} color={colors.textTertiary} />
          <TextInput
            style={s.busquedaInput}
            placeholder="Buscar taller, producto o servicio"
            placeholderTextColor={colors.textTertiary}
            value={busqueda}
            onChangeText={setBusqueda}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Buscar talleres, tiendas, productos o servicios"
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
        <Pressable
          style={({ pressed }) => [s.filtrosBtn, totalFiltrosActivos > 0 && s.filtrosBtnActivo, pressed && { opacity: 0.85 }]}
          onPress={() => setFiltrosVisibles(true)}
          accessibilityRole="button"
          accessibilityLabel="Abrir filtros"
        >
          <IconAdjustmentsHorizontal size={20} color={totalFiltrosActivos > 0 ? colors.accent : colors.textSecondary} />
          {totalFiltrosActivos > 0 && (
            <View style={s.filtrosBadge}><Text style={s.filtrosBadgeTexto}>{totalFiltrosActivos}</Text></View>
          )}
        </Pressable>
      </View>

      {/* Resultados */}
      {loading ? (
        <View style={s.list}>
          {[0, 1, 2].map(i => <EsqueletoCard key={i} reduceMotion={reduceMotion} />)}
        </View>
      ) : buscandoCatalogoActivo ? (
        <ScrollView contentContainerStyle={s.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {buscandoCatalogo ? (
            <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
              <EsqueletoCard reduceMotion={reduceMotion} />
            </View>
          ) : sinResultadosCatalogo ? (
            <View style={s.vacio}>
              <View style={s.vacioIcono}><IconFilterOff size={40} color={colors.textTertiary} /></View>
              <Text style={s.vacioTitulo}>No encontramos resultados</Text>
              <Text style={s.vacioSub}>Prueba con otra búsqueda o quita los filtros.</Text>
              {hayFiltros && (
                <Pressable style={({ pressed }) => [s.vacioBoton, pressed && { opacity: 0.85 }]} onPress={limpiarFiltros} accessibilityRole="button">
                  <Text style={s.vacioBotonTexto}>Quitar filtros</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              {negociosPorNombre.length > 0 && (
                <View style={s.seccion}>
                  <Text style={s.seccionTitulo}>Talleres y tiendas</Text>
                  {negociosPorNombre.map((item, index) => (
                    <NegocioCard key={item.id} item={item} navigation={navigation} index={index} reduceMotion={reduceMotion} promedio={promedios[item.id]} />
                  ))}
                </View>
              )}
              {serviciosVisibles.length > 0 && (
                <View style={s.seccion}>
                  <Text style={s.seccionTitulo}>Servicios</Text>
                  {serviciosVisibles.map((item, index) => (
                    <ResultadoServicioCard key={item.id} item={item} index={index} reduceMotion={reduceMotion} navigation={navigation} />
                  ))}
                </View>
              )}
              {productosVisibles.length > 0 && (
                <View style={s.seccion}>
                  <Text style={s.seccionTitulo}>Productos</Text>
                  {productosVisibles.map((item, index) => (
                    <ResultadoProductoCard key={item.id} item={item} index={index} reduceMotion={reduceMotion} navigation={navigation} />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
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

      {/* Hoja de filtros */}
      <Modal visible={filtrosVisibles} transparent animationType="fade" onRequestClose={() => setFiltrosVisibles(false)}>
        <Pressable style={s.fondoModal} onPress={() => setFiltrosVisibles(false)}>
          <Pressable style={s.hoja} onPress={() => {}}>
            <View style={s.hojaHeader}>
              <Text style={s.hojaTitulo}>Filtros</Text>
              {totalFiltrosActivos > 0 && (
                <Pressable onPress={limpiarFiltros} hitSlop={8}><Text style={s.hojaLimpiar}>Quitar todos</Text></Pressable>
              )}
            </View>

            <Text style={s.hojaSeccion}>Tipo</Text>
            <View style={s.hojaFila}>
              {FILTROS.map(({ key, label, Icon }) => {
                const activo = filtroTipo === key;
                return (
                  <Pressable key={key} style={[s.chip, activo && s.chipActivo]} onPress={() => setFiltroTipo(key)} accessibilityRole="button" accessibilityState={{ selected: activo }}>
                    {Icon && <Icon size={16} color={activo ? colors.accent : colors.textSecondary} />}
                    <Text style={[s.chipTexto, activo && s.chipTextoActivo]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.hojaSeccion}>Vehículo</Text>
            <View style={s.hojaFila}>
              {FILTROS_VEHICULO.map(({ key, label, Icon }) => {
                const activo = filtroVehiculo === key;
                return (
                  <Pressable key={key} style={[s.chip, activo && s.chipActivo]} onPress={() => setFiltroVehiculo(key)} accessibilityRole="button" accessibilityState={{ selected: activo }}>
                    {Icon && <Icon size={16} color={activo ? colors.accent : colors.textSecondary} />}
                    <Text style={[s.chipTexto, activo && s.chipTextoActivo]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {ciudadesDisponibles.length > 1 && (
              <>
                <Text style={s.hojaSeccion}>Ciudad</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.hojaFila}>
                    <Pressable style={[s.chip, filtroCiudad === 'Todas' && s.chipActivo]} onPress={() => setFiltroCiudad('Todas')} accessibilityRole="button">
                      <Text style={[s.chipTexto, filtroCiudad === 'Todas' && s.chipTextoActivo]}>Todas</Text>
                    </Pressable>
                    {ciudadesDisponibles.map(c => (
                      <Pressable key={c} style={[s.chip, filtroCiudad === c && s.chipActivo]} onPress={() => setFiltroCiudad(c)} accessibilityRole="button">
                        <Text style={[s.chipTexto, filtroCiudad === c && s.chipTextoActivo]}>{c}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <Text style={s.hojaSeccion}>Horario</Text>
            <View style={s.hojaFila}>
              <Pressable style={[s.chip, soloAbiertos && s.chipActivo]} onPress={() => setSoloAbiertos(v => !v)} accessibilityRole="button" accessibilityState={{ selected: soloAbiertos }}>
                <View style={[s.punto, s.puntoAbierto, !soloAbiertos && { backgroundColor: colors.textTertiary }]} />
                <Text style={[s.chipTexto, soloAbiertos && s.chipTextoActivo]}>Abiertos ahora</Text>
              </Pressable>
            </View>

            <Pressable style={({ pressed }) => [s.hojaCerrar, pressed && { opacity: 0.9 }]} onPress={() => setFiltrosVisibles(false)} accessibilityRole="button">
              <Text style={s.hojaCerrarTexto}>Ver resultados</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  /* Búsqueda */
  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.xl, marginBottom: spacing.md,
  },
  busquedaWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.lg, minHeight: 52,
  },
  busquedaInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary, paddingVertical: 12 },
  borrarBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  filtrosBtn: {
    width: 52, height: 52, borderRadius: radius.xl, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center',
  },
  filtrosBtnActivo: { borderColor: colors.accent, backgroundColor: 'rgba(72,151,90,0.15)' },
  filtrosBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  filtrosBadgeTexto: { fontFamily: fonts.bold, fontSize: 10, color: colors.onAccent },

  /* Filtros */
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
  },
  chipActivo: { backgroundColor: 'rgba(72,151,90,0.15)', borderColor: colors.accent },
  chipTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.textSecondary },
  chipTextoActivo: { color: colors.accent },

  /* Resultados de búsqueda mixta */
  seccion: { marginBottom: spacing.lg },
  seccionTitulo: { fontFamily: fonts.heading, fontSize: 13, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  filaResultado: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  filaFoto: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  filaNombre: { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  filaMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 1 },
  filaPrecio: { fontFamily: fonts.heading, fontSize: 13, color: colors.accent },

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

  /* Hoja de filtros */
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  hoja: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderWidth: 1, borderColor: colors.bgSurface, padding: spacing.xl, paddingBottom: spacing.xxl,
  },
  hojaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  hojaTitulo: { fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3 },
  hojaLimpiar: { fontFamily: fonts.heading, fontSize: 13, color: colors.accent },
  hojaSeccion: { fontFamily: fonts.heading, fontSize: 13, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.lg },
  hojaFila: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hojaCerrar: {
    marginTop: spacing.xxl, minHeight: 52, borderRadius: radius.md, backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  hojaCerrarTexto: { fontFamily: fonts.bold, fontSize: 15, color: colors.onAccent },
});
