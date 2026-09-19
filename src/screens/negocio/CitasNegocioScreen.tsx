import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import {
  IconArrowLeft, IconCalendarEvent, IconTool, IconCar,
  IconSearch, IconHistoryOff, IconAlertTriangle,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useModo } from '../../context/ModoContext';
import { tokens } from '../../lib/tokens';
import { type TipoPrecio } from '../../lib/precio';
import { fetchCitasNoLeidas } from '../../lib/lecturas';

const { colors, spacing, radius, fonts } = tokens;

type Estado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
type Tab = 'pendientes' | 'proximas' | 'revisar' | 'historial';

type Cita = {
  id: string;
  usuario_id: string;
  fecha_solicitada: string;
  hora_solicitada: string | null;
  estado: Estado;
  vehiculo: { marca: string; modelo: string; placa: string } | null;
  servicio: { nombre: string; tipo_precio: TipoPrecio; precio_base: number | null } | null;
  usuario: { nombre: string | null; foto_url: string | null } | null;
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'proximas',   label: 'Próximas' },
  { key: 'revisar',    label: 'Revisar' },
  { key: 'historial',  label: 'Historial' },
];

function hoyISO(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Cuantos dias pasaron desde fecha_solicitada — parseo con componentes locales
// (mismo cuidado que en lib/documentos.ts) para no correrse un dia en Colombia (UTC-5).
function diasDeAtraso(fechaISO: string): number {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
}

function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  if (fecha.getTime() === hoy.getTime())    return 'Hoy';
  if (fecha.getTime() === manana.getTime()) return 'Mañana';
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${MESES[m - 1]}`;
}

function getInitials(nombre: string | null | undefined): string {
  if (!nombre) return '?';
  return nombre.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export default function CitasNegocioScreen({ route, navigation }: any) {
  const negocioIdParam = route.params?.negocioId as string | undefined;
  const { session } = useAuth();
  const { citasPendientes, refreshCitasPendientes } = useModo();

  const [negocioId, setNegocioId] = useState<string | undefined>(negocioIdParam);
  const [tab, setTab]           = useState<Tab>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [citas, setCitas]       = useState<Cita[]>([]);
  const [noLeidas, setNoLeidas] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<string | null>(null);
  const [revisarCount, setRevisarCount] = useState(0);

  useFocusEffect(useCallback(() => {
    if (negocioId) return;
    supabase.from('negocios').select('id').eq('propietario_id', session!.user.id).maybeSingle()
      .then(({ data }) => setNegocioId(data?.id));
  }, [negocioId]));

  useFocusEffect(useCallback(() => {
    if (!negocioId) return;
    fetchCitas();
    refreshCitasPendientes();
    fetchRevisarCount();
  }, [tab, negocioId]));

  async function fetchRevisarCount() {
    if (!negocioId) return;
    const { count } = await supabase
      .from('citas')
      .select('*', { count: 'exact', head: true })
      .eq('negocio_id', negocioId)
      .eq('estado', 'confirmada')
      .lt('fecha_solicitada', hoyISO());
    setRevisarCount(count ?? 0);
  }

  async function fetchCitas() {
    setLoading(true);
    const hoy = hoyISO();
    let query = supabase
      .from('citas')
      .select(`
        id, usuario_id, fecha_solicitada, hora_solicitada, estado,
        vehiculos ( marca, modelo, placa ),
        servicios ( nombre, tipo_precio, precio_base )
      `)
      .eq('negocio_id', negocioId);

    let asc = true;
    if (tab === 'pendientes') {
      query = query.eq('estado', 'pendiente');
    } else if (tab === 'proximas') {
      query = query.eq('estado', 'confirmada').gte('fecha_solicitada', hoy);
    } else if (tab === 'revisar') {
      query = query.eq('estado', 'confirmada').lt('fecha_solicitada', hoy);
    } else {
      query = query.in('estado', ['completada', 'cancelada']);
      asc = false;
    }

    const { data, error } = await query
      .order('fecha_solicitada', { ascending: asc })
      .order('hora_solicitada', { ascending: asc, nullsFirst: false });

    if (error) { console.error(error.message); setLoading(false); return; }

    const filas = (data ?? []) as any[];
    const usuarioIds = [...new Set(filas.map(c => c.usuario_id))];

    let usuariosMap: Record<string, { nombre: string | null; foto_url: string | null }> = {};
    if (usuarioIds.length > 0) {
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, nombre, foto_url')
        .in('id', usuarioIds);
      (usuarios ?? []).forEach((u: any) => { usuariosMap[u.id] = { nombre: u.nombre, foto_url: u.foto_url }; });
    }

    const lista: Cita[] = filas.map(c => ({
      id: c.id, usuario_id: c.usuario_id,
      fecha_solicitada: c.fecha_solicitada, hora_solicitada: c.hora_solicitada,
      estado: c.estado,
      vehiculo: c.vehiculos ?? null, servicio: c.servicios ?? null,
      usuario: usuariosMap[c.usuario_id] ?? null,
    }));

    setCitas(lista);
    setLoading(false);
    fetchCitasNoLeidas(lista.map(c => c.id), session!.user.id).then(setNoLeidas);
  }

  async function cambiarEstado(cita: Cita, nuevo: Estado, confirmMsg?: { title: string; body: string }) {
    const aplicar = async () => {
      setBusy(cita.id);
      const { error } = await supabase.from('citas').update({ estado: nuevo }).eq('id', cita.id);
      setBusy(null);
      if (error) { Alert.alert('Error', error.message); return; }
      setCitas(prev => prev.filter(c => c.id !== cita.id));
      if (cita.estado === 'pendiente') refreshCitasPendientes();
      if (tab === 'revisar') fetchRevisarCount();
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

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return citas;
    return citas.filter(c =>
      (c.usuario?.nombre ?? '').toLowerCase().includes(q) ||
      (c.vehiculo?.placa ?? '').toLowerCase().includes(q)
    );
  }, [citas, busqueda]);

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
            <IconArrowLeft size={20} color={colors.accent} />
          </Pressable>
        )}
        <Text style={s.headerTitle}>RODIX</Text>
      </View>

      <Text style={s.titulo}>Agenda de Citas</Text>

      <View style={s.searchWrap}>
        <IconSearch size={16} color={colors.textTertiary} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar cliente o placa..."
          placeholderTextColor={colors.textTertiary}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      <View style={s.tabs}>
        {TABS.map(t => {
          const activo = tab === t.key;
          return (
            <Pressable key={t.key} style={[s.tab, activo && s.tabOn]} onPress={() => setTab(t.key)}>
              <Text style={[s.tabText, activo && s.tabTextOn]}>{t.label}</Text>
              {t.key === 'pendientes' && citasPendientes > 0 && (
                <View style={s.tabBadge}><Text style={s.tabBadgeText}>{citasPendientes}</Text></View>
              )}
              {t.key === 'revisar' && revisarCount > 0 && (
                <View style={s.tabBadgeAlerta}><Text style={s.tabBadgeText}>{revisarCount}</Text></View>
              )}
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : visibles.length === 0 ? (
        <View style={s.empty}>
          <IconHistoryOff size={48} color={colors.textTertiary} style={{ opacity: 0.6 }} />
          <Text style={s.emptyTitle}>
            {tab === 'pendientes' ? 'Sin citas pendientes'
              : tab === 'proximas'  ? 'Sin citas próximas'
              : tab === 'revisar'   ? 'Todo al día, nada por revisar'
              : 'No hay citas pasadas registradas'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibles}
          keyExtractor={c => c.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const nombre = item.usuario?.nombre ?? 'Cliente';
            return (
              <Pressable
                style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}
                onPress={() => navigation.navigate('DetalleCitaNegocio', { citaId: item.id })}
              >
                <View style={s.cardTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                    <View style={s.avatar}>
                      {item.usuario?.foto_url
                        ? <Image source={{ uri: item.usuario.foto_url }} style={s.avatarImg} contentFit="cover" />
                        : <Text style={s.avatarText}>{getInitials(nombre)}</Text>
                      }
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={s.cliente} numberOfLines={1}>{nombre}</Text>
                        {noLeidas.has(item.id) && <View style={s.noLeidoDot} />}
                      </View>
                      <Text style={s.vehiculoText} numberOfLines={1}>
                        {item.vehiculo ? `${item.vehiculo.marca} ${item.vehiculo.modelo}` : 'Vehículo'}
                        {item.vehiculo?.placa ? <Text style={s.placaInline}> • {item.vehiculo.placa}</Text> : null}
                      </Text>
                    </View>
                  </View>
                  {tab === 'proximas' && (
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={s.confirmadaBadge}><Text style={s.confirmadaBadgeText}>Confirmada</Text></View>
                      <IconCar size={18} color={colors.accent} />
                    </View>
                  )}
                  {tab !== 'proximas' && <IconCar size={18} color={colors.accent} />}
                </View>

                {tab === 'revisar' && (
                  <View style={s.alertaBanner}>
                    <IconAlertTriangle size={16} color={colors.dangerAction} />
                    <Text style={s.alertaText}>
                      Venció hace {diasDeAtraso(item.fecha_solicitada)} día{diasDeAtraso(item.fecha_solicitada) === 1 ? '' : 's'} — sin cerrar
                    </Text>
                  </View>
                )}

                {tab === 'proximas' ? (
                  <View style={s.statsRow}>
                    <View style={s.statCol}>
                      <Text style={s.statLabel}>HORA</Text>
                      <Text style={[s.statValue, { color: colors.accent }]}>{item.hora_solicitada?.slice(0, 5) ?? '—'}</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statCol}>
                      <Text style={s.statLabel}>FECHA</Text>
                      <Text style={s.statValue}>{formatFechaCorta(item.fecha_solicitada)}</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statCol}>
                      <Text style={s.statLabel}>ESTADO</Text>
                      <Text style={[s.statValue, { color: colors.success }]}>Agendada</Text>
                    </View>
                  </View>
                ) : (
                  <View style={s.metaRow}>
                    <View style={s.metaItem}>
                      <IconCalendarEvent size={16} color={colors.accent} />
                      <Text style={s.metaText}>
                        {formatFechaCorta(item.fecha_solicitada)}{item.hora_solicitada ? `, ${item.hora_solicitada.slice(0, 5)}` : ''}
                      </Text>
                    </View>
                    {item.servicio && (
                      <View style={s.metaItem}>
                        <IconTool size={16} color={colors.accent} />
                        <Text style={s.metaText} numberOfLines={1}>{item.servicio.nombre}</Text>
                      </View>
                    )}
                  </View>
                )}

                {tab === 'pendientes' && (
                  <View style={s.actions}>
                    <Pressable
                      style={({ pressed }) => [s.confirmarBtn, pressed && { opacity: 0.9 }]}
                      onPress={() => cambiarEstado(item, 'confirmada')}
                      disabled={busy === item.id}
                    >
                      {busy === item.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.confirmarText}>CONFIRMAR</Text>
                      }
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [s.rechazarBtn, pressed && { opacity: 0.8 }]}
                      onPress={() => cambiarEstado(item, 'cancelada', {
                        title: 'Rechazar cita', body: '¿Seguro que quieres rechazar esta solicitud?',
                      })}
                      disabled={busy === item.id}
                    >
                      <Text style={s.rechazarText}>RECHAZAR</Text>
                    </Pressable>
                  </View>
                )}

                {tab === 'revisar' && (
                  <View style={s.actions}>
                    <Pressable
                      style={({ pressed }) => [s.confirmarBtn, pressed && { opacity: 0.9 }]}
                      onPress={() => cambiarEstado(item, 'completada')}
                      disabled={busy === item.id}
                    >
                      {busy === item.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.confirmarText}>COMPLETADA</Text>
                      }
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [s.rechazarBtn, pressed && { opacity: 0.8 }]}
                      onPress={() => cambiarEstado(item, 'cancelada', {
                        title: 'Marcar como no realizada',
                        body: '¿Seguro que esta cita no se realizó? Se marcará como cancelada.',
                      })}
                      disabled={busy === item.id}
                    >
                      <Text style={s.rechazarText}>NO SE REALIZÓ</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.accent, textTransform: 'uppercase', letterSpacing: -0.5 },

  titulo: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary, paddingHorizontal: spacing.xl, marginBottom: spacing.md },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgSurface, borderRadius: radius.md,
    marginHorizontal: spacing.xl, paddingHorizontal: spacing.md, minHeight: 46,
    marginBottom: spacing.lg,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, paddingVertical: 10 },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.bgSurface,
  },
  tab: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabOn: { borderBottomColor: colors.accent },
  tabText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textTertiary, letterSpacing: 0.5 },
  tabTextOn: { color: colors.accent },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  tabBadgeAlerta: {
    minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.dangerAction,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  tabBadgeText: { fontFamily: fonts.bold, color: '#fff', fontSize: 10 },

  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 32, gap: spacing.md },

  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: spacing.md, gap: spacing.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },

  avatar: {
    width: 48, height: 48, borderRadius: 24, overflow: 'hidden',
    backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: 'rgba(232,82,42,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: fonts.bold, fontSize: 15, color: colors.accent },

  cliente: { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  noLeidoDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.accent },
  vehiculoText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  placaInline: { color: colors.accent },

  confirmadaBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  confirmadaBadgeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.success, textTransform: 'uppercase' },

  alertaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.dangerActionBg, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 8,
  },
  alertaText: { fontFamily: fonts.bold, fontSize: 12, color: colors.dangerAction, flexShrink: 1 },

  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    backgroundColor: colors.bgSurface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  metaText: { fontFamily: fonts.body, fontSize: 12, color: colors.textPrimary, flexShrink: 1 },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bgSurface, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase' },
  statValue: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  statDivider: { width: 1, height: 28, backgroundColor: colors.bgSurface },

  actions: { flexDirection: 'row', gap: spacing.sm },
  confirmarBtn: {
    flex: 1, backgroundColor: colors.accent, borderRadius: radius.md,
    minHeight: 42, justifyContent: 'center', alignItems: 'center',
  },
  confirmarText: { fontFamily: fonts.bold, fontSize: 12, color: '#fff', letterSpacing: 0.5 },
  rechazarBtn: {
    flex: 1, backgroundColor: colors.bgSurface, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 42, justifyContent: 'center', alignItems: 'center',
  },
  rechazarText: { fontFamily: fonts.bold, fontSize: 12, color: colors.textSecondary, letterSpacing: 0.5 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.md },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.textTertiary, textAlign: 'center' },
});
