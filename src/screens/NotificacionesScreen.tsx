import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
  Animated, Easing, AccessibilityInfo,
} from 'react-native';
import {
  IconArrowLeft, IconCalendarPlus, IconCalendarCheck, IconChecks, IconBellOff, IconTool,
} from '@tabler/icons-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotificaciones } from '../context/NotificacionesContext';
import { tokens } from '../lib/tokens';
import {
  fetchNotificaciones, marcarLeida, marcarTodasLeidas, type Notificacion,
} from '../lib/notificacionesApp';

const { colors, spacing, radius, fonts } = tokens;

function formatRelativo(iso: string): string {
  const fecha = new Date(iso);
  const diffMin = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (diffMin < 1)  return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `Hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1)  return 'Ayer';
  if (diffD < 7)    return `Hace ${diffD} días`;
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

const NotificacionCard = memo(function NotificacionCard({
  item, index, reduceMotion, onPress,
}: { item: Notificacion; index: number; reduceMotion: boolean; onPress: (item: Notificacion) => void }) {
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
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        style={({ pressed }) => [s.card, !item.leida && s.cardUnread, pressed && { opacity: 0.85 }]}
        onPress={() => onPress(item)}
      >
        <View style={[s.iconWrap, !item.leida && s.iconWrapUnread]}>
          {item.tipo === 'cita_nueva'
            ? <IconCalendarPlus size={18} color={colors.accent} />
            : item.tipo === 'registro_servicio_nuevo' || item.tipo === 'registro_servicio_resuelto'
            ? <IconTool size={18} color={colors.accent} />
            : <IconCalendarCheck size={18} color={colors.accent} />
          }
        </View>
        <View style={s.cardBody}>
          <View style={s.cardTop}>
            <Text style={s.titulo} numberOfLines={1}>{item.titulo}</Text>
            {!item.leida && <View style={s.dot} />}
          </View>
          <Text style={s.cuerpo} numberOfLines={2}>{item.cuerpo}</Text>
          <Text style={s.fecha}>{formatRelativo(item.created_at)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default function NotificacionesScreen({ navigation }: any) {
  const { session } = useAuth();
  const { refreshUnreadCount } = useNotificaciones();

  const [notis,   setNotis]   = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, []));

  async function cargar() {
    setLoading(true);
    setNotis(await fetchNotificaciones(session!.user.id));
    setLoading(false);
  }

  async function marcarTodas() {
    await marcarTodasLeidas(session!.user.id);
    setNotis(prev => prev.map(n => ({ ...n, leida: true })));
    refreshUnreadCount();
  }

  async function onPressItem(item: Notificacion) {
    if (!item.leida) {
      await marcarLeida(item.id);
      setNotis(prev => prev.map(n => n.id === item.id ? { ...n, leida: true } : n));
      refreshUnreadCount();
    }

    if (item.tipo === 'cita_estado') {
      navigation.navigate('Servicios', { screen: 'MisCitas' });
      return;
    }

    if (item.tipo === 'registro_servicio_nuevo' && item.cita_id) {
      navigation.navigate('Servicios', { screen: 'ChatCita', params: { citaId: item.cita_id } });
      return;
    }

    if (item.tipo === 'registro_servicio_resuelto' && item.cita_id) {
      navigation.navigate('ChatCita', { citaId: item.cita_id });
      return;
    }

    const { data: negocio } = await supabase
      .from('negocios')
      .select('id')
      .eq('propietario_id', session!.user.id)
      .maybeSingle();
    if (negocio) navigation.navigate('CitasNegocio', { negocioId: negocio.id });
  }

  const hayNoLeidas = notis.some(n => !n.leida);

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
        <Text style={s.headerTitle}>Notificaciones</Text>
        {hayNoLeidas && (
          <Pressable
            style={({ pressed }) => [s.marcarBtn, pressed && { opacity: 0.7 }]}
            onPress={marcarTodas}
          >
            <IconChecks size={15} color={colors.accent} />
            <Text style={s.marcarBtnText}>Marcar leídas</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : notis.length === 0 ? (
        <View style={s.empty}>
          <IconBellOff size={40} color={colors.bgSurface} />
          <Text style={s.emptyTitle}>Sin notificaciones</Text>
          <Text style={s.emptySubtitle}>Aquí verás novedades sobre tus citas</Text>
        </View>
      ) : (
        <FlatList
          data={notis}
          keyExtractor={n => n.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <NotificacionCard item={item} index={index} reduceMotion={reduceMotion} onPress={onPressItem} />
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
  marcarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingVertical: 8, paddingHorizontal: spacing.sm, minHeight: 44,
    borderWidth: 1, borderColor: colors.bgSurface,
  },
  marcarBtnText: { fontFamily: fonts.heading, fontSize: 12, color: colors.accent },

  list: { paddingHorizontal: spacing.xl, paddingBottom: 32, gap: spacing.sm },

  card: {
    flexDirection: 'row', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.md,
  },
  cardUnread: { borderColor: 'rgba(232,82,42,0.35)' },

  iconWrap: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  iconWrapUnread: { backgroundColor: 'rgba(232,82,42,0.15)' },

  cardBody: { flex: 1, gap: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titulo: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  cuerpo: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  fecha: { fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, marginTop: 2 },

  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xxl, gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary,
    letterSpacing: -0.3, textAlign: 'center', marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center',
  },
});
