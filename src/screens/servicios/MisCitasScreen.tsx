import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert,
  Animated, Easing, AccessibilityInfo,
} from 'react-native';
import {
  IconArrowLeft, IconCalendar, IconClock, IconBike,
  IconBuildingStore, IconNotes, IconX, IconMessageCircle, IconStar,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { formatPrecioServicio, formatCOP, type TipoPrecio } from '../../lib/precio';
import { fetchCitasNoLeidas } from '../../lib/lecturas';

const { colors, spacing, radius, fonts } = tokens;

type Estado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

type Cita = {
  id: string;
  fecha_solicitada: string;
  hora_solicitada: string | null;
  descripcion: string | null;
  estado: Estado;
  precio_acordado: number | null;
  negocio: { nombre: string } | null;
  vehiculo: { marca: string; modelo: string; placa: string } | null;
  servicio: { nombre: string; tipo_precio: TipoPrecio; precio_base: number | null } | null;
};

const FILTROS: { value: Estado | 'todas'; label: string }[] = [
  { value: 'todas',      label: 'Todas' },
  { value: 'pendiente',  label: 'Pendientes' },
  { value: 'confirmada', label: 'Confirmadas' },
  { value: 'completada', label: 'Completadas' },
  { value: 'cancelada',  label: 'Canceladas' },
];

const ESTADO_LABELS: Record<Estado, string> = {
  pendiente: 'Pendiente', confirmada: 'Confirmada',
  completada: 'Completada', cancelada: 'Cancelada',
};
const ESTADO_COLORS: Record<Estado, string> = {
  pendiente: '#f5a623', confirmada: '#5ac8fa',
  completada: '#34c759', cancelada: colors.dangerAction,
};

const DIAS_CORTOS  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS_CORTOS[date.getDay()]} ${d} ${MESES_CORTOS[m - 1]}`;
}

const CitaCard = memo(function CitaCard({
  item, index, reduceMotion, busy, onCancelar, onChat, onCalificar, calificada, noLeida,
}: {
  item: Cita; index: number; reduceMotion: boolean; busy: string | null;
  onCancelar: (cita: Cita) => void; onChat: (cita: Cita) => void;
  onCalificar: (cita: Cita) => void; calificada: boolean; noLeida: boolean;
}) {
  const opacity    = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 12)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 280, delay: index * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, delay: index * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[s.card, { opacity, transform: [{ translateY }] }]}>
      <View style={s.cardTop}>
        <View style={[s.estadoBadge, { backgroundColor: `${ESTADO_COLORS[item.estado]}22` }]}>
          <View style={[s.estadoDot, { backgroundColor: ESTADO_COLORS[item.estado] }]} />
          <Text style={[s.estadoText, { color: ESTADO_COLORS[item.estado] }]}>
            {ESTADO_LABELS[item.estado]}
          </Text>
        </View>
        <View style={s.fechaRow}>
          <IconCalendar size={13} color={colors.textTertiary} />
          <Text style={s.fechaText}>{formatFecha(item.fecha_solicitada)}</Text>
          {item.hora_solicitada && (
            <>
              <IconClock size={13} color={colors.textTertiary} style={{ marginLeft: spacing.sm }} />
              <Text style={s.fechaText}>{item.hora_solicitada.slice(0, 5)}</Text>
            </>
          )}
        </View>
      </View>

      {item.negocio && (
        <View style={s.infoRow}>
          <IconBuildingStore size={14} color={colors.accent} />
          <Text style={[s.infoText, s.negocioNombre]}>{item.negocio.nombre}</Text>
          {noLeida && <View style={s.noLeidoDot} />}
        </View>
      )}

      {item.vehiculo && (
        <View style={s.infoRow}>
          <IconBike size={14} color={colors.textTertiary} />
          <Text style={s.infoText}>
            {item.vehiculo.marca} {item.vehiculo.modelo}
            {item.vehiculo.placa ? ` · ${item.vehiculo.placa}` : ''}
          </Text>
        </View>
      )}

      {item.servicio && (
        <View style={s.servicioRow}>
          <Text style={s.servicioNombre} numberOfLines={1}>{item.servicio.nombre}</Text>
          <Text style={s.servicioPrecio}>
            {item.precio_acordado != null ? formatCOP(item.precio_acordado) : formatPrecioServicio(item.servicio)}
          </Text>
        </View>
      )}

      {item.descripcion && (
        <View style={s.infoRow}>
          <IconNotes size={14} color={colors.textTertiary} style={{ marginTop: 1 }} />
          <Text style={[s.infoText, s.descripcion]}>{item.descripcion}</Text>
        </View>
      )}

      {item.estado !== 'cancelada' && (
        <View style={s.actions}>
          <Pressable
            style={({ pressed }) => [s.actionBtn, s.actionBtnChat, pressed && { opacity: 0.85 }]}
            onPress={() => onChat(item)}
          >
            <IconMessageCircle size={15} color={colors.accent} />
            <Text style={s.actionTextChat}>Chat</Text>
          </Pressable>
          {item.estado === 'pendiente' && (
            <Pressable
              style={({ pressed }) => [s.actionBtn, s.actionBtnDanger, pressed && { opacity: 0.85 }]}
              onPress={() => onCancelar(item)}
              disabled={busy === item.id}
            >
              {busy === item.id
                ? <ActivityIndicator size="small" color={colors.dangerAction} />
                : <><IconX size={15} color={colors.dangerAction} /><Text style={s.actionTextDanger}>Cancelar solicitud</Text></>
              }
            </Pressable>
          )}
          {item.estado === 'completada' && !calificada && (
            <Pressable
              style={({ pressed }) => [s.actionBtn, s.actionBtnChat, pressed && { opacity: 0.85 }]}
              onPress={() => onCalificar(item)}
            >
              <IconStar size={15} color={colors.accent} />
              <Text style={s.actionTextChat}>Calificar</Text>
            </Pressable>
          )}
        </View>
      )}
    </Animated.View>
  );
});

export default function MisCitasScreen({ navigation }: any) {
  const { session } = useAuth();

  const [filtro,  setFiltro]  = useState<Estado | 'todas'>('todas');
  const [citas,   setCitas]   = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState<string | null>(null);
  const [calificadas, setCalificadas] = useState<Set<string>>(new Set());
  const [noLeidas, setNoLeidas] = useState<Set<string>>(new Set());
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useFocusEffect(useCallback(() => { fetchCitas(); }, [filtro]));

  async function fetchCitas() {
    setLoading(true);
    let query = supabase
      .from('citas')
      .select(`
        id, fecha_solicitada, hora_solicitada, descripcion, estado, precio_acordado,
        negocios ( nombre ),
        vehiculos ( marca, modelo, placa ),
        servicios ( nombre, tipo_precio, precio_base )
      `)
      .eq('usuario_id', session!.user.id)
      .order('fecha_solicitada', { ascending: false })
      .order('hora_solicitada', { ascending: false, nullsFirst: false });

    if (filtro !== 'todas') query = query.eq('estado', filtro);

    const { data, error } = await query;
    if (error) { console.error(error.message); setLoading(false); return; }

    const lista: Cita[] = (data ?? []).map((c: any) => ({
      id:               c.id,
      fecha_solicitada: c.fecha_solicitada,
      hora_solicitada:  c.hora_solicitada,
      descripcion:      c.descripcion,
      estado:           c.estado,
      precio_acordado:  c.precio_acordado,
      negocio:          c.negocios ?? null,
      vehiculo:         c.vehiculos ?? null,
      servicio:         c.servicios ?? null,
    }));

    setCitas(lista);
    setLoading(false);
    fetchCitasNoLeidas(lista.map(c => c.id), session!.user.id).then(setNoLeidas);

    const completadas = lista.filter(c => c.estado === 'completada').map(c => c.id);
    if (completadas.length > 0) {
      const { data: califs } = await supabase
        .from('calificaciones')
        .select('cita_id')
        .eq('autor_id', session!.user.id)
        .eq('destino_tipo', 'negocio')
        .in('cita_id', completadas);
      setCalificadas(new Set((califs ?? []).map((r: any) => r.cita_id)));
    }
  }

  function cancelarCita(cita: Cita) {
    Alert.alert(
      'Cancelar cita',
      '¿Seguro que quieres cancelar esta solicitud?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar', style: 'destructive',
          onPress: async () => {
            setBusy(cita.id);
            const { error } = await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', cita.id);
            setBusy(null);
            if (error) { Alert.alert('Error', error.message); return; }
            if (filtro === 'todas') {
              setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, estado: 'cancelada' } : c));
            } else {
              setCitas(prev => prev.filter(c => c.id !== cita.id));
            }
          },
        },
      ]
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Mis citas</Text>
      </View>

      <View style={s.filtros}>
        <FlatList
          data={FILTROS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={f => f.value}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xl }}
          renderItem={({ item }) => (
            <Pressable
              style={[s.chip, filtro === item.value && s.chipOn]}
              onPress={() => setFiltro(item.value)}
            >
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
          <Text style={s.emptyTitle}>Sin citas {filtro !== 'todas' ? FILTROS.find(f => f.value === filtro)?.label.toLowerCase() : ''}</Text>
          <Text style={s.emptySubtitle}>Tus solicitudes a talleres y tiendas aparecerán aquí</Text>
        </View>
      ) : (
        <FlatList
          data={citas}
          keyExtractor={c => c.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <CitaCard
              item={item} index={index} reduceMotion={reduceMotion} busy={busy}
              onCancelar={cancelarCita}
              onChat={cita => navigation.navigate('ChatCita', { citaId: cita.id })}
              onCalificar={cita => navigation.navigate('CalificarCita', { citaId: cita.id })}
              calificada={calificadas.has(item.id)}
              noLeida={noLeidas.has(item.id)}
            />
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
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 },

  filtros: { paddingBottom: spacing.md },
  chip: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, paddingVertical: 8, minHeight: 36, justifyContent: 'center',
  },
  chipOn:     { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText:   { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  chipTextOn: { color: colors.onAccent },

  list: { paddingHorizontal: spacing.xl, paddingBottom: 32, gap: spacing.md },

  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.md, gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  estadoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  estadoDot:  { width: 6, height: 6, borderRadius: 3 },
  estadoText: { fontFamily: fonts.heading, fontSize: 11 },
  fechaRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fechaText:  { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, flex: 1 },
  negocioNombre: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  noLeidoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginLeft: 4 },
  descripcion: { color: colors.textSecondary, lineHeight: 18 },

  servicioRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bgSurface, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 8, marginTop: 2,
  },
  servicioNombre: { flex: 1, fontFamily: fonts.heading, fontSize: 13, color: colors.textPrimary, marginRight: spacing.sm },
  servicioPrecio: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.md, minHeight: 42, borderWidth: 1,
  },
  actionBtnDanger:  { backgroundColor: 'transparent', borderColor: colors.dangerActionBorder },
  actionTextDanger: { fontFamily: fonts.bold, fontSize: 13, color: colors.dangerAction },
  actionBtnChat:    { backgroundColor: 'transparent', borderColor: 'rgba(72,151,90,0.35)' },
  actionTextChat:   { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },

  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xxl, gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary,
    letterSpacing: -0.3, textAlign: 'center', textTransform: 'capitalize', marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center',
  },
});
