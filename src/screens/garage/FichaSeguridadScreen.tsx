import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Share, KeyboardAvoidingView, Platform } from 'react-native';
import { IconShieldCheck, IconEngine, IconId, IconFileCertificate, IconShare, IconCircleCheck, IconAlertCircle } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { fetchFichaSeguridad, guardarFichaSeguridad, formatFichaParaDenuncia, type FichaSeguridad } from '../../lib/seguridadVehiculo';
import CabeceraPantalla from '../../components/CabeceraPantalla';
import { Campo, Entrada } from '../../components/FormField';

const { colors, spacing, radius, fonts } = tokens;

const VACIA: FichaSeguridad = { numero_motor: null, numero_chasis: null, aseguradora: null, poliza_numero: null };

export default function FichaSeguridadScreen({ route, navigation }: any) {
  const { vehiculo } = route.params as { vehiculo: { id: string; marca: string; modelo: string; anio: number; placa: string; color: string | null } };

  const [ficha, setFicha] = useState<FichaSeguridad>(VACIA);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { cargar(); }, [vehiculo.id]);

  async function cargar() {
    setCargando(true);
    setFicha((await fetchFichaSeguridad(vehiculo.id)) ?? VACIA);
    setCargando(false);
  }

  function actualizar(campo: keyof FichaSeguridad, valor: string) {
    setFicha(prev => ({ ...prev, [campo]: valor }));
    setGuardado(false);
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    const r = await guardarFichaSeguridad(vehiculo.id, ficha);
    setGuardando(false);
    if (!r.ok) { setError(r.mensaje); return; }
    setGuardado(true);
  }

  async function compartir() {
    const texto = `${formatFichaParaDenuncia(vehiculo, ficha)}\n\n— Generado desde Rodix`;
    try { await Share.share({ message: texto }); } catch { /* el usuario cerro el share sheet */ }
  }

  if (cargando) {
    return <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <CabeceraPantalla titulo="Ficha de seguridad" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.intro}>
          <View style={s.introIcono}><IconShieldCheck size={26} color={colors.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.introTitulo}>Ayuda en caso de robo</Text>
            <Text style={s.introTexto}>
              Guarda aquí los datos que la Policía o tu aseguradora piden en una denuncia. Es opcional, y puedes llenarlo cuando tengas los papeles a mano.
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing.lg }}>
          <Campo label="Número de motor" ayuda="Está en la tarjeta de propiedad">
            <Entrada
              icono={<IconEngine size={18} color={colors.textTertiary} />}
              value={ficha.numero_motor ?? ''}
              onChangeText={t => actualizar('numero_motor', t)}
              placeholder="Ej: JYA2P123456"
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </Campo>

          <Campo label="Número de chasis" ayuda="En carros también se llama VIN">
            <Entrada
              icono={<IconId size={18} color={colors.textTertiary} />}
              value={ficha.numero_chasis ?? ''}
              onChangeText={t => actualizar('numero_chasis', t)}
              placeholder="Ej: 9C6JC4110KR123456"
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </Campo>

          <Campo label="Aseguradora">
            <Entrada
              icono={<IconFileCertificate size={18} color={colors.textTertiary} />}
              value={ficha.aseguradora ?? ''}
              onChangeText={t => actualizar('aseguradora', t)}
              placeholder="Ej: Sura, Mapfre, Allianz"
              autoCapitalize="words"
            />
          </Campo>

          <Campo label="Número de póliza">
            <Entrada
              value={ficha.poliza_numero ?? ''}
              onChangeText={t => actualizar('poliza_numero', t)}
              placeholder="Ej: 123456789"
              autoCapitalize="characters"
            />
          </Campo>
        </View>

        {error && (
          <View style={s.errorRow}>
            <IconAlertCircle size={16} color={colors.dangerAction} />
            <Text style={s.errorTexto}>{error}</Text>
          </View>
        )}
        {guardado && !error && (
          <View style={s.okRow}>
            <IconCircleCheck size={16} color={colors.success} />
            <Text style={s.okTexto}>Guardado</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [s.compartirBtn, pressed && { opacity: 0.85 }]}
          onPress={compartir}
          accessibilityRole="button"
          accessibilityLabel="Compartir ficha para denuncia"
        >
          <IconShare size={18} color={colors.accent} />
          <Text style={s.compartirTexto}>Compartir ficha para denuncia</Text>
        </Pressable>
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.boton, guardando && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
          onPress={guardar}
          disabled={guardando}
          accessibilityRole="button"
        >
          {guardando ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.botonTexto}>Guardar</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },

  intro: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start',
    backgroundColor: colors.accentDark, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)',
    padding: spacing.lg,
  },
  introIcono: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(2,2,2,0.35)', justifyContent: 'center', alignItems: 'center' },
  introTitulo: { fontFamily: fonts.display, fontSize: 17, color: colors.textPrimary, letterSpacing: -0.2 },
  introTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 19 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorTexto: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.dangerAction },
  okRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  okTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.success },

  compartirBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent,
  },
  compartirTexto: { fontFamily: fonts.bold, fontSize: 15, color: colors.accent },

  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl,
    backgroundColor: colors.bgPrimary, borderTopWidth: 1, borderTopColor: colors.bgCard,
  },
  boton: { backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 54, justifyContent: 'center', alignItems: 'center' },
  botonTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
});
