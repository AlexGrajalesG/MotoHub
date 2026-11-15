import { View, Text, Pressable, ScrollView } from 'react-native';
import { IconCheck } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { estilosTema } from '../../lib/estilosTema';
import { useTema } from '../../context/TemaContext';
import { PALETAS, TEMAS, ETIQUETA_TEMA, type NombreTema } from '../../lib/paletas';
import CabeceraPantalla from '../../components/CabeceraPantalla';

const { colors, spacing, radius, fonts } = tokens;

/** Mini pantalla que muestra cómo se ve cada tema, con sus propios colores. */
function Muestra({ nombre }: { nombre: NombreTema }) {
  const p = PALETAS[nombre];
  return (
    <View style={[s.muestra, { backgroundColor: p.bgPrimary, borderColor: p.bgSurface }]}>
      <View style={[s.muestraTarjeta, { backgroundColor: p.bgCard, borderColor: p.bgSurface }]}>
        <View style={[s.muestraLinea, { backgroundColor: p.textPrimary, width: '70%' }]} />
        <View style={[s.muestraLinea, { backgroundColor: p.textSecondary, width: '45%' }]} />
      </View>
      <View style={[s.muestraBoton, { backgroundColor: p.accent }]} />
    </View>
  );
}

export default function AparienciaScreen({ navigation }: any) {
  const { tema, cambiarTema } = useTema();

  return (
    <View style={s.container}>
      <CabeceraPantalla titulo="Apariencia" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>Elige cómo quieres ver Rodix. Se guarda en este teléfono.</Text>

        {TEMAS.map(nombre => {
          const activo = tema === nombre;
          const info = ETIQUETA_TEMA[nombre];
          return (
            <Pressable
              key={nombre}
              style={({ pressed }) => [s.opcion, activo && s.opcionActiva, pressed && { opacity: 0.85 }]}
              onPress={() => cambiarTema(nombre)}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`${info.titulo}. ${info.detalle}`}
            >
              <Muestra nombre={nombre} />
              <View style={s.opcionTexto}>
                <Text style={s.opcionTitulo}>{info.titulo}</Text>
                <Text style={s.opcionDetalle}>{info.detalle}</Text>
              </View>
              <View style={[s.marca, activo && s.marcaActiva]}>
                {activo && <IconCheck size={16} color={colors.onAccent} />}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = estilosTema(() => ({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  intro: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.bgSurface,
  },
  opcionActiva: { borderColor: colors.accent },
  opcionTexto: { flex: 1, gap: 2 },
  opcionTitulo: { fontFamily: fonts.heading, fontSize: 16, color: colors.textPrimary },
  opcionDetalle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  muestra: {
    width: 72, height: 88, borderRadius: radius.md, borderWidth: 1, padding: 8, justifyContent: 'space-between',
  },
  muestraTarjeta: { borderRadius: radius.sm, borderWidth: 1, padding: 6, gap: 5 },
  muestraLinea: { height: 5, borderRadius: 3 },
  muestraBoton: { height: 14, borderRadius: 7 },
  marca: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  marcaActiva: { backgroundColor: colors.accent, borderColor: colors.accent },
}));
