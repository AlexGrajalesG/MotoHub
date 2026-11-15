import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { IconCheck } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { estilosTema } from '../../lib/estilosTema';
import CabeceraPantalla from '../../components/CabeceraPantalla';
import { inicialDe } from '../../lib/bandejaTexto';
import { fetchMecanicosDeNegocio, type Mecanico } from '../../lib/mecanicos';
import { fetchParticipantes, agregarMecanicoAConsulta } from '../../lib/conversaciones';

const { colors, spacing, radius, fonts } = tokens;

/** El dueño suma a un mecánico activo de su equipo a una consulta, para que él también responda. */
export default function SumarMecanicoScreen({ route, navigation }: any) {
  const { conversacionId, negocioId } = route.params as { conversacionId: string; negocioId: string };
  const [equipo, setEquipo] = useState<Mecanico[]>([]);
  const [yaEstan, setYaEstan] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [sumando, setSumando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [mecanicos, participantes] = await Promise.all([
      fetchMecanicosDeNegocio(negocioId), fetchParticipantes(conversacionId),
    ]);
    setEquipo(mecanicos.filter(m => m.activo));
    setYaEstan(new Set(participantes.filter(p => p.rol === 'mecanico').map(p => p.usuario_id)));
  }, [negocioId, conversacionId]);

  useFocusEffect(useCallback(() => {
    cargar().finally(() => setCargando(false));
  }, [cargar]));

  async function sumar(m: Mecanico) {
    if (sumando) return;
    setSumando(m.usuario_id);
    setError(null);
    const r = await agregarMecanicoAConsulta(conversacionId, m.usuario_id);
    setSumando(null);
    if (!r.ok) { setError(r.mensaje); return; }
    await cargar();
  }

  return (
    <View style={s.container}>
      <CabeceraPantalla titulo="Sumar a un mecánico" onBack={() => navigation.goBack()} />
      <Text style={s.intro}>El mecánico verá toda la conversación y podrá responder. El cliente verá que lo atiende esa persona.</Text>
      {!!error && <Text style={s.error} accessibilityRole="alert">{error}</Text>}

      {cargando ? (
        <View style={s.centro}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : (
        <FlatList
          data={equipo}
          keyExtractor={m => m.id}
          contentContainerStyle={equipo.length === 0 ? s.listaVacia : s.lista}
          ItemSeparatorComponent={() => <View style={s.separador} />}
          renderItem={({ item }) => {
            const nombre = item.usuario?.nombre ?? 'Mecánico';
            const esta = yaEstan.has(item.usuario_id);
            return (
              <View style={s.fila}>
                <View style={s.avatar}><Text style={s.avatarTexto}>{inicialDe(nombre)}</Text></View>
                <Text style={s.nombre} numberOfLines={1}>{nombre}</Text>
                {esta ? (
                  <View style={s.enConsulta} accessibilityLabel="Ya está en la consulta">
                    <IconCheck size={16} color={colors.accent} />
                    <Text style={s.enConsultaTexto}>En la consulta</Text>
                  </View>
                ) : (
                  <Pressable
                    style={({ pressed }) => [s.btnSumar, sumando === item.usuario_id && s.deshabilitado, pressed && { opacity: 0.85 }]}
                    onPress={() => sumar(item)}
                    disabled={!!sumando}
                    accessibilityRole="button"
                    accessibilityLabel={`Sumar a ${nombre}`}
                  >
                    {sumando === item.usuario_id
                      ? <ActivityIndicator size="small" color={colors.onAccent} />
                      : <Text style={s.btnSumarTexto}>Sumar</Text>}
                  </Pressable>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.vacio}>
              <Text style={s.vacioTitulo}>Aún no tienes mecánicos activos</Text>
              <Text style={s.vacioTexto}>Invítalos con su @usuario desde tu taller y aparecerán aquí.</Text>
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
  intro: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 20, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  error: { fontFamily: fonts.heading, fontSize: 13, color: colors.dangerAction, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  lista: { paddingVertical: spacing.sm },
  listaVacia: { flexGrow: 1 },
  separador: { height: 1, backgroundColor: colors.bgSurface, marginLeft: 80 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center',
  },
  avatarTexto: { fontFamily: fonts.display, fontSize: 17, color: colors.accent },
  nombre: { flex: 1, fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
  btnSumar: { minWidth: 88, minHeight: 44, borderRadius: radius.md, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  btnSumarTexto: { fontFamily: fonts.bold, fontSize: 14, color: colors.onAccent },
  enConsulta: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  enConsultaTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.accent },
  deshabilitado: { opacity: 0.5 },
  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  vacioTitulo: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary, textAlign: 'center' },
  vacioTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
}));
