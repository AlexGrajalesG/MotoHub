import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import {
  IconCalendar, IconClock, IconBike, IconMessageCircle, IconCheck, IconUserPlus,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useModo } from '../../context/ModoContext';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { tokens } from '../../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

type Estado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

type Cita = {
  id: string;
  fecha_solicitada: string;
  hora_solicitada: string | null;
  estado: Estado;
  mecanico_id: string | null;
  vehiculo: { marca: string; modelo: string; placa: string } | null;
  servicio: { nombre: string } | null;
  usuario: { nombre: string | null } | null;
};

const FILTROS: { value: Estado | 'todas'; label: string }[] = [
  { value: 'confirmada', label: 'Confirmadas' },
  { value: 'completada', label: 'Completadas' },
  { value: 'todas',      label: 'Todas' },
];

const DIAS_CORTOS  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS_CORTOS[date.getDay()]} ${d} ${MESES_CORTOS[m - 1]}`;
}

export default function CitasMecanicoScreen({ navigation }: any) {
  const { session } = useAuth();
  const { miMecanico } = useModo();
  const { unreadCount } = useNotificaciones();

  const [filtro, setFiltro]   = useState<Estado | 'todas'>('confirmada');
  const [citas, setCitas]     = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState<string | null>(null);

  useFocusEffect(useCallback(() => { cargar(); }, [filtro, miMecanico?.negocio_id]));

  async function cargar() {
    if (!miMecanico) return;
    setLoading(true);
    let query = supabase
      .from('citas')
      .select(`
        id, fecha_solicitada, hora_solicitada, estado, mecanico_id,
        vehiculos ( marca, modelo, placa ),
        servicios ( nombre ),
        usuario:usuarios ( nombre )
      `)
      .eq('negocio_id', miMecanico.negocio_id)
      .order('fecha_solicitada', { ascending: true });

    if (filtro !== 'todas') query = query.eq('estado', filtro);

    const { data, error } = await query;
    if (error) { console.error(error.message); setLoading(false); return; }

    setCitas((data ?? []).map((c: any) => ({
      id: c.id, fecha_solicitada: c.fecha_solicitada, hora_solicitada: c.hora_solicitada,
      estado: c.estado, mecanico_id: c.mecanico_id,
      vehiculo: c.vehiculos ?? null, servicio: c.servicios ?? null, usuario: c.usuario ?? null,
    })));
    setLoading(false);
  }

  async function asignarme(cita: Cita) {
    if (!miMecanico) return;
    setBusy(cita.id);
    const { error } = await supabase.from('citas').update({ mecanico_id: miMecanico.id }).eq('id', cita.id);
    setBusy(null);
    if (error) { Alert.alert('Error', error.message); return; }
    setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, mecanico_id: miMecanico.id } : c));
  }

  async function marcarCompletada(cita: Cita) {
    setBusy(cita.id);
    const { error } = await supabase.from('citas').update({ estado: 'completada' }).eq('id', cita.id);
    setBusy(null);
    if (error) { Alert.alert('Error', error.message); return; }
    if (filtro === 'todas') setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, estado: 'completada' } : c));
    else setCitas(prev => prev.filter(c => c.id !== cita.id));
  }

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <Text style={s.brand}>RODIX</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.subBrand} numberOfLines={1}>{miMecanico?.negocio_nombre ?? 'Mi taller'}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [s.bellBtn, pressed && { opacity: 0.8 }]}
          onPress={() => navigation.navigate('Notificaciones')}
          hitSlop={8}
          accessibilityLabel="Notificaciones"
        >
          <IconClock size={18} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={s.bellBadge}><Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
          )}
        </Pressable>
      </View>

      <View style={s.filtros}>
        <FlatList
          data={FILTROS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={f => f.value}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xl }}
          renderItem={({ item }) => (
            <Pressable style={[s.chip, filtro === item.value && s.chipOn]} onPress={() => setFiltro(item.value)}>
              <Text style={[s.chipText, filtro === item.value && s.chipTextOn]}>{item.label}</Text>
            </Pressable>
          )}
        />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : citas.length === 0 ? (
        <View style={s.empty}>
          <IconCalendar size={40} color={colors.bgSurface} />
          <Text style={s.emptyTitle}>Sin citas</Text>
        </View>
      ) : (
        <FlatList
          data={citas}
          keyExtractor={c => c.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.cliente}>{item.usuario?.nombre ?? 'Cliente'}</Text>
                <View style={s.fechaRow}>
                  <IconCalendar size={13} color={colors.textTertiary} />
                  <Text style={s.fechaText}>{formatFecha(item.fecha_solicitada)}</Text>
                  {item.hora_solicitada && <Text style={s.fechaText}> · {item.hora_solicitada.slice(0, 5)}</Text>}
                </View>
              </View>
              {item.vehiculo && (
                <View style={s.infoRow}>
                  <IconBike size={14} color={colors.textTertiary} />
                  <Text style={s.infoText}>{item.vehiculo.marca} {item.vehiculo.modelo} · {item.vehiculo.placa}</Text>
                </View>
              )}
              {item.servicio && <Text style={s.servicio}>{item.servicio.nombre}</Text>}
              {!item.mecanico_id && (
                <Text style={s.solCentro}>Sin mecánico asignado · servicio del centro</Text>
              )}

              <View style={s.actions}>
                <Pressable
                  style={({ pressed }) => [s.actionBtn, s.actionBtnOutline, pressed && { opacity: 0.85 }]}
                  onPress={() => navigation.navigate('ChatCita', { citaId: item.id })}
                >
                  <IconMessageCircle size={15} color={colors.accent} />
                  <Text style={s.actionTextOutline}>Chat</Text>
                </Pressable>
                {!item.mecanico_id && item.estado === 'confirmada' && (
                  <Pressable
                    style={({ pressed }) => [s.actionBtn, s.actionBtnOutline, pressed && { opacity: 0.85 }]}
                    onPress={() => asignarme(item)}
                    disabled={busy === item.id}
                  >
                    {busy === item.id ? <ActivityIndicator size="small" color={colors.accent} /> : <><IconUserPlus size={15} color={colors.accent} /><Text style={s.actionTextOutline}>Asignarme</Text></>}
                  </Pressable>
                )}
                {item.estado === 'confirmada' && (
                  <Pressable
                    style={({ pressed }) => [s.actionBtn, s.actionBtnPrimary, pressed && { opacity: 0.85 }]}
                    onPress={() => marcarCompletada(item)}
                    disabled={busy === item.id}
                  >
                    {busy === item.id ? <ActivityIndicator size="small" color="#fff" /> : <><IconCheck size={15} color="#fff" /><Text style={s.actionTextPrimary}>Completar</Text></>}
                  </Pressable>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.sm,
  },
  brand: { fontFamily: fonts.display, fontSize: 18, color: colors.accent, textTransform: 'uppercase' },
  subBrand: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  bellBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: colors.bgPrimary,
  },
  bellBadgeText: { fontFamily: fonts.bold, color: '#fff', fontSize: 10 },

  filtros: { paddingBottom: spacing.md },
  chip: {
    backgroundColor: colors.bgCard, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, paddingVertical: 8, minHeight: 36, justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  chipTextOn: { color: '#fff' },

  list: { paddingHorizontal: spacing.xl, paddingBottom: 32, gap: spacing.md },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.md, gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cliente: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  fechaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fechaText: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  servicio: { fontFamily: fonts.heading, fontSize: 13, color: colors.textPrimary },
  solCentro: { fontFamily: fonts.body, fontSize: 12, color: colors.accent },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.md, minHeight: 42, borderWidth: 1,
  },
  actionBtnOutline: { backgroundColor: 'transparent', borderColor: 'rgba(232,82,42,0.35)' },
  actionTextOutline: { fontFamily: fonts.bold, fontSize: 12, color: colors.accent },
  actionBtnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  actionTextPrimary: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary, marginTop: spacing.sm },
});
