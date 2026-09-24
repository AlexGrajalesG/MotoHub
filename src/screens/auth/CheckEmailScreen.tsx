import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { IconMailCheck, IconAlertCircle } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import { mensajeErrorAuth } from '../../lib/errores';
import FondoAuth from '../../components/FondoAuth';

const { colors, spacing, radius, fonts } = tokens;

const ESPERA_REENVIO = 60;

const PASOS = [
  'Abre el correo que te enviamos',
  'Toca el enlace para activar tu cuenta',
  'Vuelve aquí e inicia sesión',
];

export default function CheckEmailScreen({ route, navigation }: any) {
  const email: string = route.params?.email ?? '';
  const [espera, setEspera] = useState(ESPERA_REENVIO);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(e => e - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function reenviar() {
    if (espera > 0 || enviando || !email) return;
    setEnviando(true);
    setAviso(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setEnviando(false);
    if (error) { setAviso({ tipo: 'error', texto: mensajeErrorAuth(error).mensaje }); return; }
    setAviso({ tipo: 'ok', texto: 'Listo, te enviamos otro correo.' });
    setEspera(ESPERA_REENVIO);
  }

  return (
    <FondoAuth>
    <View style={s.container}>
      <View style={s.centro}>
        <View style={s.icono}>
          <IconMailCheck size={40} color={colors.accent} />
        </View>

        <Text style={s.titulo}>Revisa tu correo</Text>
        <Text style={s.sub}>Enviamos un enlace de confirmación a</Text>
        <View style={s.emailPill}>
          <Text style={s.email} numberOfLines={1}>{email}</Text>
        </View>

        <View style={s.pasos}>
          {PASOS.map((p, i) => (
            <View key={p} style={s.paso}>
              <View style={s.pasoNum}><Text style={s.pasoNumTexto}>{i + 1}</Text></View>
              <Text style={s.pasoTexto}>{p}</Text>
            </View>
          ))}
        </View>

        <Text style={s.spam}>¿No lo ves? Revisa Spam o Promociones.</Text>

        {aviso && (
          <View style={s.aviso} accessibilityLiveRegion="polite">
            {aviso.tipo === 'error' && <IconAlertCircle size={16} color={colors.dangerAction} />}
            <Text style={[s.avisoTexto, aviso.tipo === 'ok' && { color: colors.success }]}>{aviso.texto}</Text>
          </View>
        )}
      </View>

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.boton, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="button"
        >
          <Text style={s.botonTexto}>Ya confirmé, iniciar sesión</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.secundario, (espera > 0 || enviando) && { opacity: 0.5 }, pressed && { opacity: 0.7 }]}
          onPress={reenviar}
          disabled={espera > 0 || enviando}
          accessibilityRole="button"
          accessibilityState={{ disabled: espera > 0 || enviando }}
        >
          <Text style={s.secundarioTexto}>
            {enviando ? 'Enviando...' : espera > 0 ? `Reenviar correo en ${espera} s` : 'Reenviar correo'}
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Register')} hitSlop={8} style={s.enlaceWrap} accessibilityRole="link">
          <Text style={s.enlace}>Usar otro correo</Text>
        </Pressable>
      </View>
    </View>
    </FondoAuth>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },

  icono: {
    width: 88, height: 88, borderRadius: radius.xl, backgroundColor: colors.accentDark,
    borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl,
  },
  titulo: { fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, marginTop: spacing.sm },
  emailPill: {
    marginTop: spacing.md, maxWidth: '100%', paddingHorizontal: spacing.lg, paddingVertical: 10,
    borderRadius: radius.pill, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
  },
  email: { fontFamily: fonts.bold, fontSize: 15, color: colors.accent },

  pasos: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.xl },
  paso: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pasoNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center',
  },
  pasoNumTexto: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  pasoTexto: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary },

  spam: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, marginTop: spacing.xl, textAlign: 'center' },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  avisoTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.dangerAction, textAlign: 'center' },

  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(2,2,2,0.55)',
  },
  boton: {
    backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 54,
    justifyContent: 'center', alignItems: 'center',
  },
  botonTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
  secundario: {
    minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  secundarioTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
  enlaceWrap: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  enlace: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
});
