import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  IconShieldCheck, IconTool, IconDroplet, IconDisc, IconLink, IconCircleDot, IconBattery,
  IconBookmark, IconCalendar, IconRoad, IconAlertTriangle, IconCheck, IconTrash, IconBellRinging, IconPlus,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import CabeceraPantalla from '../../components/CabeceraPantalla';

const { colors, spacing, radius, fonts } = tokens;

type Recordatorio = {
  id: string;
  tipo: string;
  descripcion: string | null;
  fecha_limite: string | null;
  km_limite: number | null;
  estado: string;
};

export const TIPOS_INFO: Record<string, { label: string; Icon: typeof IconShieldCheck }> = {
  soat:             { label: 'SOAT',         Icon: IconShieldCheck },
  revision_tecnica: { label: 'Rev. Técnica', Icon: IconTool },
  aceite:           { label: 'Aceite',       Icon: IconDroplet },
  frenos:           { label: 'Frenos',       Icon: IconDisc },
  cadena:           { label: 'Cadena',       Icon: IconLink },
  llantas:          { label: 'Llantas',      Icon: IconCircleDot },
  bateria:          { label: 'Batería',      Icon: IconBattery },
  personalizado:    { label: 'Personalizado', Icon: IconBookmark },
};

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function RecordatoriosScreen({ route, navigation }: any) {
  const { vehiculo } = route.params;
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { fetchRecordatorios(); }, []));

  async function fetchRecordatorios() {
    try {
      const { data } = await supabase
        .from('recordatorios')
        .select('*')
        .eq('vehiculo_id', vehiculo.id)
        .order('created_at', { ascending: false });
      setRecordatorios(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function marcarCompletado(id: string) {
    await supabase.from('recordatorios').update({ estado: 'completado' }).eq('id', id);
    setRecordatorios(rs => rs.map(r => r.id === id ? { ...r, estado: 'completado' } : r));
  }

  function eliminar(id: string) {
    Alert.alert('Eliminar', '¿Eliminar este recordatorio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('recordatorios').delete().eq('id', id);
          setRecordatorios(rs => rs.filter(r => r.id !== id));
        },
      },
    ]);
  }

  function esVencido(r: Recordatorio): boolean {
    if (r.estado !== 'pendiente') return false;
    if (r.fecha_limite) {
      // new Date('YYYY-MM-DD') parsea como medianoche UTC -- comparado
      // contra new Date() (instante real) marcaba "vencido" desde la noche
      // anterior en timezones detras de UTC (Colombia -5). Comparar fechas
      // locales, no instantes.
      const [y, m, d] = r.fecha_limite.split('-').map(Number);
      const limite = new Date(y, m - 1, d);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (limite < hoy) return true;
    }
    if (r.km_limite && r.km_limite <= vehiculo.kilometraje) return true;
    return false;
  }

  const pendientes = recordatorios.filter(r => r.estado !== 'completado');
  const completados = recordatorios.filter(r => r.estado === 'completado');

  function renderCard({ item }: { item: Recordatorio }) {
    const info = TIPOS_INFO[item.tipo] ?? { label: item.tipo, Icon: IconBookmark };
    const vencido = esVencido(item);
    const completado = item.estado === 'completado';
    const { Icon } = info;

    return (
      <View style={[s.card, vencido && s.cardVencido, completado && s.cardCompletado]}>
        <View style={[s.cardIcono, vencido && s.cardIconoVencido]}>
          <Icon size={22} color={vencido ? colors.dangerAction : colors.accent} />
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardTipo}>{info.label}</Text>
          {!!item.descripcion && <Text style={s.cardDesc}>{item.descripcion}</Text>}
          <View style={s.cardLimites}>
            {item.fecha_limite && (
              <View style={s.limiteChip}>
                <IconCalendar size={12} color={vencido ? colors.dangerAction : colors.textTertiary} />
                <Text style={[s.cardLimite, vencido && s.textVencido]}>{formatFecha(item.fecha_limite)}</Text>
              </View>
            )}
            {item.km_limite && (
              <View style={s.limiteChip}>
                <IconRoad size={12} color={vencido ? colors.dangerAction : colors.textTertiary} />
                <Text style={[s.cardLimite, vencido && s.textVencido]}>{item.km_limite.toLocaleString()} km</Text>
              </View>
            )}
          </View>
          {vencido && (
            <View style={s.badgeVencido}>
              <IconAlertTriangle size={11} color={colors.dangerAction} />
              <Text style={s.badgeVencidoTexto}>Vencido</Text>
            </View>
          )}
        </View>
        <View style={s.cardAcciones}>
          {!completado && (
            <Pressable style={s.checkBtn} onPress={() => marcarCompletado(item.id)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Marcar completado">
              <IconCheck size={16} color={colors.onAccent} />
            </Pressable>
          )}
          <Pressable onPress={() => eliminar(item.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Eliminar recordatorio">
            <IconTrash size={18} color={colors.textTertiary} />
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <CabeceraPantalla titulo="Recordatorios" onBack={() => navigation.goBack()} />
        <Pressable
          style={({ pressed }) => [s.nuevoBtn, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('CrearRecordatorio', { vehiculo })}
          accessibilityRole="button"
          accessibilityLabel="Nuevo recordatorio"
        >
          <IconPlus size={16} color={colors.onAccent} />
          <Text style={s.nuevoBtnText}>Nuevo</Text>
        </Pressable>
      </View>
      <Text style={s.subtitulo}>{vehiculo.marca} {vehiculo.modelo}</Text>

      <FlatList
        data={[...pendientes, ...completados]}
        keyExtractor={item => item.id}
        contentContainerStyle={s.lista}
        showsVerticalScrollIndicator={false}
        renderItem={renderCard}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconWrap}><IconBellRinging size={40} color={colors.textTertiary} /></View>
            <Text style={s.emptyTitle}>Sin recordatorios</Text>
            <Text style={s.emptySubtitle}>Crea uno para no olvidar el SOAT, el aceite o cualquier mantenimiento</Text>
          </View>
        }
        ListFooterComponent={
          completados.length > 0 && pendientes.length > 0 ? <Text style={s.seccionLabel}>Completados</Text> : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },

  headerRow: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.xl },
  subtitulo: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, paddingHorizontal: spacing.xl, marginTop: -spacing.sm, marginBottom: spacing.sm },
  nuevoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent,
    borderRadius: radius.md, minHeight: 40, paddingHorizontal: spacing.md,
  },
  nuevoBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.onAccent },

  lista: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: 40 },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.bgSurface, gap: spacing.md,
  },
  cardVencido: { borderColor: colors.dangerActionBorder, backgroundColor: colors.dangerActionBg },
  cardCompletado: { opacity: 0.5 },
  cardIcono: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentDark,
    justifyContent: 'center', alignItems: 'center',
  },
  cardIconoVencido: { backgroundColor: 'rgba(255,69,58,0.15)' },
  cardBody: { flex: 1, gap: 3 },
  cardTipo: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  cardDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  cardLimites: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  limiteChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLimite: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  textVencido: { color: colors.dangerAction },
  badgeVencido: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  badgeVencidoTexto: { fontFamily: fonts.bold, fontSize: 11, color: colors.dangerAction },
  cardAcciones: { gap: spacing.md, alignItems: 'center' },
  checkBtn: {
    backgroundColor: colors.accent, borderRadius: 16, width: 32, height: 32,
    justifyContent: 'center', alignItems: 'center',
  },
  seccionLabel: {
    fontFamily: fonts.heading, fontSize: 12, color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.xs, paddingHorizontal: spacing.xs,
  },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: spacing.xxl },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: radius.xl, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg,
  },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, marginBottom: spacing.sm, letterSpacing: -0.3 },
  emptySubtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
