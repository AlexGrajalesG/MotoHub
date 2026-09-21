import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { IconTrash, IconCheck, IconAlertCircle, IconCircleCheck } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useModo } from '../../context/ModoContext';
import { tokens } from '../../lib/tokens';
import { solicitarEliminacion, formatearFecha, DIAS_DE_GRACIA } from '../../lib/cuenta';
import CabeceraPantalla from '../../components/CabeceraPantalla';

const { colors, spacing, radius, fonts } = tokens;

export default function EliminarCuentaScreen({ navigation }: any) {
  const { tieneNegocio } = useModo();
  const [entiendo, setEntiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fecha, setFecha] = useState<Date | null>(null);

  const seElimina = [
    'Tus vehículos, documentos, recordatorios e historial',
    'Tus citas, calificaciones y notificaciones',
    'Tu perfil y tus fotos',
    ...(tieneNegocio ? ['Tu taller o tienda, con su equipo y sus servicios'] : []),
  ];

  async function eliminar() {
    setEnviando(true);
    setError(null);
    const r = await solicitarEliminacion();
    setEnviando(false);
    if (r.ok) setFecha(r.valor);
    else setError(r.mensaje);
  }

  // ─── Confirmacion: la cuenta ya quedo programada ───────────────────────────
  if (fecha) {
    return (
      <View style={s.container}>
        <ScrollView contentContainerStyle={s.confirmacion} showsVerticalScrollIndicator={false}>
          <View style={s.iconoOk}><IconCircleCheck size={44} color={colors.accent} /></View>
          <Text style={s.titulo}>Tu cuenta quedó programada</Text>
          <Text style={s.texto}>La eliminaremos el {formatearFecha(fecha)}.</Text>
          <Text style={s.textoSuave}>
            Si cambias de idea, inicia sesión antes de esa fecha y podrás conservarla.
          </Text>
        </ScrollView>
        <View style={s.footer}>
          <Pressable
            style={({ pressed }) => [s.botonPrimario, pressed && { opacity: 0.85 }]}
            onPress={() => supabase.auth.signOut()}
            accessibilityRole="button"
          >
            <Text style={s.botonPrimarioTexto}>Entendido</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <CabeceraPantalla titulo="Eliminar cuenta" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.aviso}>
          <View style={s.iconoPeligro}><IconTrash size={26} color={colors.dangerAction} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.avisoTitulo}>Antes de seguir</Text>
            <Text style={s.avisoTexto}>
              Tu cuenta se desactiva ahora y se elimina para siempre en {DIAS_DE_GRACIA} días.
            </Text>
          </View>
        </View>

        <View style={s.tarjeta}>
          <Text style={s.tarjetaTitulo}>Se eliminará</Text>
          {seElimina.map(t => (
            <View key={t} style={s.punto}>
              <View style={s.vineta} />
              <Text style={s.puntoTexto}>{t}</Text>
            </View>
          ))}
        </View>

        <View style={s.tarjeta}>
          <Text style={s.tarjetaTitulo}>Puedes arrepentirte</Text>
          <Text style={s.puntoTexto}>
            Durante {DIAS_DE_GRACIA} días, si inicias sesión verás la opción de conservar tu cuenta y todo seguirá como estaba.
          </Text>
        </View>

        <Pressable
          style={s.consent}
          onPress={() => setEntiendo(v => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: entiendo }}
        >
          <View style={[s.check, entiendo && s.checkOn]}>
            {entiendo && <IconCheck size={16} color={colors.onAccent} />}
          </View>
          <Text style={s.consentTexto}>Entiendo que mi cuenta y mis datos se eliminarán</Text>
        </Pressable>

        {error && (
          <View style={s.error} accessibilityLiveRegion="polite">
            <IconAlertCircle size={16} color={colors.dangerAction} />
            <Text style={s.errorTexto}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.botonPeligro, (!entiendo || enviando) && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
          onPress={eliminar}
          disabled={!entiendo || enviando}
          accessibilityRole="button"
          accessibilityState={{ disabled: !entiendo || enviando }}
        >
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={s.botonPeligroTexto}>Eliminar mi cuenta</Text>}
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.botonSecundario, pressed && { opacity: 0.8 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={s.botonSecundarioTexto}>Mejor no</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },

  aviso: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'center',
    backgroundColor: colors.dangerActionBg, borderWidth: 1, borderColor: colors.dangerActionBorder,
    borderRadius: radius.lg, padding: spacing.lg,
  },
  iconoPeligro: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(2,2,2,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  avisoTitulo: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary },
  avisoTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, marginTop: 2, lineHeight: 20 },

  tarjeta: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.lg, gap: spacing.sm,
  },
  tarjetaTitulo: { fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
  punto: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  vineta: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dangerAction, marginTop: 8 },
  puntoTexto: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, lineHeight: 22 },

  consent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  check: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: colors.bgSurface,
    backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center',
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  consentTexto: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, lineHeight: 21 },

  error: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorTexto: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.dangerAction },

  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm,
    backgroundColor: colors.bgPrimary, borderTopWidth: 1, borderTopColor: colors.bgCard,
  },
  botonPeligro: {
    backgroundColor: colors.dangerAction, borderRadius: radius.md, minHeight: 54,
    justifyContent: 'center', alignItems: 'center',
  },
  botonPeligroTexto: { fontFamily: fonts.bold, fontSize: 16, color: '#fff' },
  botonSecundario: {
    minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  botonSecundarioTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
  botonPrimario: {
    backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 54,
    justifyContent: 'center', alignItems: 'center',
  },
  botonPrimarioTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },

  confirmacion: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  iconoOk: {
    width: 88, height: 88, borderRadius: radius.xl, backgroundColor: colors.accentDark,
    borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  titulo: { fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary, letterSpacing: -0.4, textAlign: 'center' },
  texto: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary, textAlign: 'center' },
  textoSuave: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
