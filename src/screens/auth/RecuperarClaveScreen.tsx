import { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, type TextInput,
} from 'react-native';
import { IconArrowLeft, IconAlertCircle, IconMail } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import { mensajeErrorAuth } from '../../lib/errores';
import RodixLogo from '../../components/RodixLogo';
import FondoAuth from '../../components/FondoAuth';
import { Campo, Entrada } from '../../components/FormField';

const { colors, spacing, radius, fonts } = tokens;

const EMAIL_OK = /^\S+@\S+\.\S+$/;
const ESPERA_REENVIO = 60;

/** Recuperar contrasena en dos pasos: correo -> codigo del correo + contrasena nueva. */
export default function RecuperarClaveScreen({ route, navigation }: any) {
  const [paso, setPaso] = useState<'correo' | 'codigo'>('correo');
  const [email, setEmail] = useState<string>(route.params?.email ?? '');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [intento, setIntento] = useState(false);
  const [espera, setEspera] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const codigoRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(e => e - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const errEmail = !email.trim() ? 'Escribe tu correo' : !EMAIL_OK.test(email.trim()) ? 'Ese correo no parece válido' : undefined;
  const errCodigo = codigo.length < 6 ? 'Escribe el código que llegó a tu correo' : undefined;
  const errPassword = !password ? 'Crea tu contraseña nueva' : password.length < 6 ? 'Usa al menos 6 caracteres' : undefined;

  async function enviarCodigo() {
    setIntento(true);
    if (errEmail) return;
    setLoading(true);
    setError(null);
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (e) { setError(mensajeErrorAuth(e).mensaje); return; }
    setIntento(false);
    setEspera(ESPERA_REENVIO);
    setPaso('codigo');
  }

  async function cambiarClave() {
    setIntento(true);
    if (errCodigo) { codigoRef.current?.focus(); return; }
    if (errPassword) { passwordRef.current?.focus(); return; }
    setLoading(true);
    setError(null);
    const { error: eCodigo } = await supabase.auth.verifyOtp({ email: email.trim(), token: codigo.trim(), type: 'recovery' });
    if (eCodigo) { setLoading(false); setError(mensajeErrorAuth(eCodigo).mensaje); return; }
    // Al verificar el codigo Supabase abre sesion; se cambia la clave de inmediato y la app entra sola.
    const { error: eClave } = await supabase.auth.updateUser({ password });
    if (eClave) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(mensajeErrorAuth(eClave).mensaje);
    }
  }

  return (
    <FondoAuth>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <Pressable
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
            onPress={() => (paso === 'codigo' ? setPaso('correo') : navigation.goBack())}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <IconArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
          <RodixLogo variante="completo" alto={28} />
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={s.titulo}>{paso === 'correo' ? 'Recupera tu contraseña' : 'Revisa tu correo'}</Text>
          <Text style={s.sub}>
            {paso === 'correo'
              ? 'Te enviamos un código para crear una contraseña nueva'
              : `Enviamos un código a ${email.trim()}. Revisa también Spam.`}
          </Text>

          {error && (
            <View style={s.banner} accessibilityLiveRegion="polite">
              <IconAlertCircle size={18} color={colors.dangerAction} />
              <Text style={[s.bannerTexto, { flex: 1 }]}>{error}</Text>
            </View>
          )}

          {paso === 'correo' ? (
            <Campo label="Correo electrónico" sinMarca error={intento ? errEmail : undefined}>
              <Entrada
                icono={<IconMail size={18} color={colors.textTertiary} />}
                value={email}
                onChangeText={setEmail}
                error={!!(intento && errEmail)}
                placeholder="tu@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="done"
                onSubmitEditing={enviarCodigo}
              />
            </Campo>
          ) : (
            <View style={s.form}>
              <Campo label="Código" sinMarca error={intento ? errCodigo : undefined}>
                <Entrada
                  inputRef={codigoRef}
                  value={codigo}
                  onChangeText={v => setCodigo(v.replace(/\D/g, '').slice(0, 8))}
                  error={!!(intento && errCodigo)}
                  placeholder="Código de 6 dígitos"
                  keyboardType="number-pad"
                  maxLength={8}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </Campo>
              <Campo label="Contraseña nueva" sinMarca error={intento ? errPassword : undefined} ayuda="Mínimo 6 caracteres">
                <Entrada
                  inputRef={passwordRef}
                  esContrasena
                  value={password}
                  onChangeText={setPassword}
                  error={!!(intento && errPassword)}
                  placeholder="Crea una contraseña nueva"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={cambiarClave}
                />
              </Campo>
            </View>
          )}
        </ScrollView>

        <View style={s.footer}>
          <Pressable
            style={({ pressed }) => [s.boton, loading && s.botonOcupado, pressed && { opacity: 0.85 }]}
            onPress={paso === 'correo' ? enviarCodigo : cambiarClave}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading
              ? <ActivityIndicator color={colors.onAccent} />
              : <Text style={s.botonTexto}>{paso === 'correo' ? 'Enviar código' : 'Cambiar contraseña'}</Text>}
          </Pressable>

          {paso === 'codigo' && (
            <Pressable
              style={({ pressed }) => [s.secundario, espera > 0 && { opacity: 0.5 }, pressed && { opacity: 0.7 }]}
              onPress={enviarCodigo}
              disabled={espera > 0 || loading}
              accessibilityRole="button"
              accessibilityState={{ disabled: espera > 0 || loading }}
            >
              <Text style={s.secundarioTexto}>{espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}</Text>
            </Pressable>
          )}

          <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8} style={s.enlaceWrap} accessibilityRole="link">
            <Text style={s.enlace}>Volver a <Text style={s.enlaceFuerte}>iniciar sesión</Text></Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </FondoAuth>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },

  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  titulo: { fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl, lineHeight: 22 },

  banner: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.dangerActionBg, borderWidth: 1, borderColor: colors.dangerActionBorder,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  bannerTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },

  form: { gap: spacing.lg },

  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm,
    backgroundColor: 'rgba(2,2,2,0.55)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  boton: {
    backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 54,
    justifyContent: 'center', alignItems: 'center',
  },
  botonOcupado: { opacity: 0.6 },
  botonTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
  secundario: {
    minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  secundarioTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
  enlaceWrap: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  enlace: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  enlaceFuerte: { fontFamily: fonts.bold, color: colors.accent },
});
