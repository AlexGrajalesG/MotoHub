import { useState, useCallback, useRef, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { IconMessageCircle, IconLock } from '@tabler/icons-react-native';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { useRealtimeRefresh } from '../../lib/useRealtimeRefresh';
import { fetchBandeja } from '../../lib/bandeja';
import {
  repartirConversaciones, contarNoLeidas, vistaPreviaUltimo, etiquetaFecha, inicialDe, textoVacioBandeja,
  esConversacionCerrada, type ComoBandeja, type ConversacionBandeja, type PestanaBandeja,
} from '../../lib/bandejaTexto';
import { estilosTema } from '../../lib/estilosTema';

const { colors, spacing, radius, fonts } = tokens;

const PESTANAS: { key: PestanaBandeja; label: string }[] = [
  { key: 'activas', label: 'Activas' },
  { key: 'cerradas', label: 'Cerradas' },
];

const Fila = memo(function Fila({ item, miId, onPress }: {
  item: ConversacionBandeja; miId: string | undefined; onPress: (citaId: string) => void;
}) {
  const nombre = item.contraparte_nombre ?? 'Sin nombre';
  const cerrada = esConversacionCerrada(item);
  const preview = vistaPreviaUltimo(item, miId);
  const hora = etiquetaFecha(item.ultimo_at ?? item.orden_at);

  return (
    <Pressable
      style={({ pressed }) => [s.fila, pressed && { opacity: 0.85 }]}
      onPress={() => onPress(item.cita_id)}
      accessibilityRole="button"
      accessibilityLabel={`${nombre}. ${preview}${item.no_leido ? '. Mensaje sin leer' : ''}`}
    >
      <View style={s.avatar}><Text style={s.avatarTexto}>{inicialDe(nombre)}</Text></View>

      <View style={s.cuerpo}>
        <View style={s.lineaSuperior}>
          <Text style={[s.nombre, item.no_leido && s.nombreNoLeido]} numberOfLines={1}>{nombre}</Text>
          <Text style={[s.hora, item.no_leido && s.horaNoLeida]}>{hora}</Text>
        </View>

        {(item.vehiculo_texto || cerrada) && (
          <View style={s.lineaMeta}>
            {cerrada && <IconLock size={12} color={colors.textTertiary} />}
            <Text style={s.meta} numberOfLines={1}>
              {[cerrada ? (item.estado === 'cancelada' ? 'Cancelada' : 'Finalizado') : null, item.vehiculo_texto]
                .filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}

        <View style={s.lineaInferior}>
          <Text style={[s.preview, item.no_leido && s.previewNoLeido]} numberOfLines={1}>{preview}</Text>
          {item.no_leido && <View style={s.punto} accessibilityLabel="Sin leer" />}
        </View>
      </View>
    </Pressable>
  );
});

/** Bandeja única de conversaciones: activas y cerradas, con el último mensaje y el punto de no leído. */
export default function BandejaMensajesScreen({ route, navigation }: any) {
  const como = (route.params?.como ?? 'cliente') as ComoBandeja;
  const { session } = useAuth();
  const miId = session?.user.id;

  const [lista, setLista] = useState<ConversacionBandeja[]>([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [pestana, setPestana] = useState<PestanaBandeja>('activas');
  const primeraCarga = useRef(true);

  const cargar = useCallback(async () => {
    setLista(await fetchBandeja(como));
  }, [como]);

  useFocusEffect(useCallback(() => {
    if (primeraCarga.current) setLoading(true);
    cargar().finally(() => { primeraCarga.current = false; setLoading(false); });
  }, [cargar]));

  // Mensajes nuevos o cambios de estado: la base solo envía lo que el usuario puede ver (RLS)
  useRealtimeRefresh('mensajes_cita', '', cargar);
  useRealtimeRefresh('citas', '', cargar);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  const { activas, cerradas } = repartirConversaciones(lista);
  const noLeidasActivas = contarNoLeidas(activas);
  const noLeidasCerradas = contarNoLeidas(cerradas);
  const visibles = pestana === 'activas' ? activas : cerradas;

  const abrir = useCallback((citaId: string) => navigation.navigate('ChatCita', { citaId }), [navigation]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.titulo} accessibilityRole="header">Mensajes</Text>
      </View>

      <View style={s.pestanas}>
        {PESTANAS.map(p => {
          const activa = pestana === p.key;
          const pendientes = p.key === 'activas' ? noLeidasActivas : noLeidasCerradas;
          return (
            <Pressable
              key={p.key}
              style={[s.pestana, activa && s.pestanaActiva]}
              onPress={() => setPestana(p.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
            >
              <Text style={[s.pestanaTexto, activa && s.pestanaTextoActiva]}>{p.label}</Text>
              {pendientes > 0 && (
                <View style={s.contador}><Text style={s.contadorTexto}>{pendientes}</Text></View>
              )}
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={s.centro}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : (
        <FlatList
          data={visibles}
          keyExtractor={c => c.cita_id}
          renderItem={({ item }) => <Fila item={item} miId={miId} onPress={abrir} />}
          contentContainerStyle={visibles.length === 0 ? s.listaVacia : s.lista}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colors.accent} />}
          ItemSeparatorComponent={() => <View style={s.separador} />}
          ListEmptyComponent={
            <View style={s.vacio}>
              <IconMessageCircle size={40} color={colors.bgSurface} />
              <Text style={s.vacioTitulo}>{pestana === 'activas' ? 'Sin conversaciones activas' : 'Sin conversaciones cerradas'}</Text>
              <Text style={s.vacioTexto}>{textoVacioBandeja(pestana, como)}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = estilosTema(() => ({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  titulo: { fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary, letterSpacing: -0.5 },

  pestanas: {
    flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.bgSurface,
  },
  pestana: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
  },
  pestanaActiva: { backgroundColor: colors.accent, borderColor: colors.accent },
  pestanaTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.textSecondary },
  pestanaTextoActiva: { color: colors.onAccent },
  contador: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
  },
  contadorTexto: { fontFamily: fonts.heading, fontSize: 11, color: colors.onAccent },

  lista: { paddingVertical: spacing.sm },
  listaVacia: { flexGrow: 1 },
  separador: { height: 1, backgroundColor: colors.bgSurface, marginLeft: 80 },

  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center',
  },
  avatarTexto: { fontFamily: fonts.display, fontSize: 18, color: colors.accent },
  cuerpo: { flex: 1, gap: 2 },
  lineaSuperior: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nombre: { flex: 1, fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
  nombreNoLeido: { fontFamily: fonts.display },
  hora: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  horaNoLeida: { color: colors.accent },
  lineaMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  lineaInferior: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  preview: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  previewNoLeido: { color: colors.textPrimary, fontFamily: fonts.heading },
  punto: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },

  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  vacioTitulo: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary, textAlign: 'center' },
  vacioTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
}));
