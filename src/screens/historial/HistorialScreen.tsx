import { useState, useCallback, useRef, memo, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, Animated, Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { IconBike, IconCar, IconCarSuv } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

type Vehiculo = {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  tipo: string;
  kilometraje: number;
  fotos: string[];
  total_registros: number;
  total_gastado: number;
};

function TipoIcon({ tipo, size = 24, color }: { tipo: string; size?: number; color?: string }) {
  const c = color ?? colors.iconInactive;
  if (tipo === 'moto')      return <IconBike   size={size} color={c} />;
  if (tipo === 'carro')     return <IconCar    size={size} color={c} />;
  if (tipo === 'camioneta') return <IconCarSuv size={size} color={c} />;
  return <IconBike size={size} color={c} />;
}

function formatCOP(n: number): string {
  if (n <= 0)          return '$0';
  if (n >= 1_000_000)  return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000)    return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString('es-CO')}`;
}

const VehiculoCard = memo(function VehiculoCard({
  item, index, onPress,
}: {
  item: Vehiculo;
  index: number;
  onPress: () => void;
}) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale      = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, delay: index * 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable
        style={s.card}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 60, bounciness: 0 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 60, bounciness: 0 }).start()}
      >
        <View style={s.fotoWrap}>
          {item.fotos?.[0] ? (
            <Image source={item.fotos[0]} style={s.foto} contentFit="cover" />
          ) : (
            <View style={s.fotoPlaceholder}>
              <TipoIcon tipo={item.tipo} size={40} color={colors.bgSurface} />
            </View>
          )}
        </View>

        <View style={s.info}>
          <Text style={s.nombre} numberOfLines={1}>{item.marca} {item.modelo}</Text>
          <Text style={s.sub}>{item.anio} · {item.placa.toUpperCase()}</Text>

          <View style={s.statsRow}>
            <View style={s.statPill}>
              <View style={s.statDot} />
              <Text style={s.statCount}>
                {item.total_registros} servicio{item.total_registros !== 1 ? 's' : ''}
              </Text>
            </View>
            {item.total_gastado > 0 && (
              <Text style={s.statGasto}>{formatCOP(item.total_gastado)}</Text>
            )}
          </View>
        </View>

        <Text style={s.arrow}>›</Text>
      </Pressable>
    </Animated.View>
  );
});

export default function HistorialScreen({ navigation }: any) {
  const { session } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading,   setLoading]   = useState(true);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    setLoading(true);
    try {
      const { data: vData } = await supabase
        .from('vehiculos')
        .select('id, marca, modelo, anio, placa, tipo, kilometraje, fotos')
        .eq('propietario_id', session!.user.id)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (!vData || vData.length === 0) {
        setVehiculos([]);
        setLoading(false);
        return;
      }

      const { data: hData } = await supabase
        .from('historial_mantenimiento')
        .select('vehiculo_id, costo')
        .in('vehiculo_id', vData.map(v => v.id));

      const statsMap: Record<string, { count: number; gastado: number }> = {};
      for (const r of hData ?? []) {
        if (!statsMap[r.vehiculo_id]) statsMap[r.vehiculo_id] = { count: 0, gastado: 0 };
        statsMap[r.vehiculo_id].count++;
        if (r.costo) statsMap[r.vehiculo_id].gastado += Number(r.costo);
      }

      const lista: Vehiculo[] = vData.map(v => ({
        ...v,
        total_registros: statsMap[v.id]?.count   ?? 0,
        total_gastado:   statsMap[v.id]?.gastado ?? 0,
      }));

      // Un solo vehículo → saltar el selector directamente
      if (lista.length === 1) {
        navigation.replace('HistorialVehiculo', { vehiculo: lista[0] });
        return;
      }

      setVehiculos(lista);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  const totalRegistros = vehiculos.reduce((sum, v) => sum + v.total_registros, 0);
  const totalGastado   = vehiculos.reduce((sum, v) => sum + v.total_gastado,   0);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Historial</Text>

        {vehiculos.length > 0 && (
          <View style={s.statsBar}>
            <View style={s.statItem}>
              <Text style={s.statVal}>{totalRegistros}</Text>
              <Text style={s.statLabel}>Servicios</Text>
            </View>
            <View style={s.statSep} />
            <View style={s.statItem}>
              <Text style={s.statVal}>{formatCOP(totalGastado)}</Text>
              <Text style={s.statLabel}>Invertido</Text>
            </View>
            <View style={s.statSep} />
            <View style={s.statItem}>
              <Text style={s.statVal}>{vehiculos.length}</Text>
              <Text style={s.statLabel}>Vehículos</Text>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={vehiculos}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <VehiculoCard
            item={item}
            index={index}
            onPress={() => navigation.navigate('HistorialVehiculo', { vehiculo: item })}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyCard}>
              <IconBike size={52} color={colors.bgSurface} />
            </View>
            <Text style={s.emptyTitle}>Sin vehículos aún</Text>
            <Text style={s.emptySubtitle}>
              Agrega un vehículo en el Garage para llevar el control de mantenimiento
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },

  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 56,
    paddingBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.display, fontSize: 28,
    color: colors.textPrimary, letterSpacing: -0.5,
    marginBottom: spacing.md,
  },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bgSurface,
    paddingVertical: spacing.md,
  },
  statItem:  { flex: 1, alignItems: 'center' },
  statVal:   { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statSep:   { width: 1, backgroundColor: colors.bgSurface, marginVertical: 4 },

  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: 40 },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.bgSurface,
    overflow: 'hidden',
  },
  fotoWrap: { width: 88, height: 88 },
  foto:     { width: '100%', height: '100%' },
  fotoPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },

  info: { flex: 1, paddingHorizontal: spacing.md, gap: 3 },
  nombre: {
    fontFamily: fonts.bold, fontSize: 16,
    color: colors.textPrimary, letterSpacing: -0.2,
  },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },

  statsRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  statPill:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  statCount: { fontFamily: fonts.heading, fontSize: 12, color: colors.accent },
  statGasto: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },

  arrow: { fontSize: 24, color: colors.textTertiary, paddingHorizontal: spacing.md },

  empty: { alignItems: 'center', marginTop: 80, padding: 32 },
  emptyCard: {
    width: 110, height: 110,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1, borderColor: colors.bgSurface,
  },
  emptyTitle: {
    fontFamily: fonts.display, fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.sm, letterSpacing: -0.3, textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.body, fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center', lineHeight: 21,
  },
});
