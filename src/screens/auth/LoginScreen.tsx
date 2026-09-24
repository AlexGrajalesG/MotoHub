import { useState, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, type TextInput,
} from 'react-native';
import { IconMail, IconLock, IconAlertCircle } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import { mensajeErrorAuth, type ErrorAuth } from '../../lib/errores';
import RodixLogo from '../../components/RodixLogo';
import FondoAuth from '../../components/FondoAuth';
import { Campo, Entrada } from '../../components/FormField';

const { colors, spacing, radius, fonts } = tokens;

const EMAIL_OK = /^\S+@\S+\.\S+$/;

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [intento, setIntento]   = useState(false);
  const [tocados, setTocados]   = useState<{ email?: boolean; password?: boolean }>({});
  const [errorServidor, setErrorServidor] = useState<ErrorAuth | null>(null);
  const [reenviado, setReenviado] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const errEmail = !email.trim() ? 'Escribe tu correo' : !EMAIL_OK.test(email.trim()) ? 'Ese correo no parece válido' : undefined;
  const errPassword = !password ? 'Escribe tu contraseña' : undefined;
  const verEmail = intento || tocados.email ? errEmail : undefined;
  const verPassword = intento || tocados.password ? errPassword : undefined;

  async function handleLogin() {
    setIntento(true);
    if (errEmail) { emailRef.current?.focus(); return; }
    if (errPassword) { passwordRef.current?.focus(); return; }

    setLoading(true);
    setErrorServidor(null);
    setReenviado(false);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) setErrorServidor(mensajeErrorAuth(error));
    // si entra bien, AppNavigator cambia de pila solo al detectar la sesion
  }

  async function reenviarCorreo() {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (error) setErrorServidor(mensajeErrorAuth(error));
    else setReenviado(true);
  }

  return (
    <FondoAuth>
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.logo}>
          <RodixLogo variante="completo" alto={40} />
        </View>

        <Text style={s.titulo}>Bienvenido de vuelta</Text>
        <Text style={s.sub}>Entra para ver el estado de tu vehículo</Text>

        {errorServidor && (
          <View style={s.banner} accessibilityLiveRegion="polite">
            <IconAlertCircle size={18} color={colors.dangerAction} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.bannerTexto}>{errorServidor.mensaje}</Text>
              {errorServidor.correoSinConfirmar && (
                reenviado
                  ? <Text style={s.bannerOk}>Listo, te enviamos otro correo. Revisa también Spam.</Text>
                  : (
                    <Pressable onPress={reenviarCorreo} hitSlop={8} accessibilityRole="button">
                      <Text style={s.bannerAccion}>Reenviar correo de confirmación</Text>
                    </Pressable>
                  )
              )}
            </View>
          </View>
        )}

        <View style={s.form}>
          <Campo label="Correo electrónico" sinMarca error={verEmail}>
            <Entrada
              inputRef={emailRef}
              icono={<IconMail size={18} color={colors.textTertiary} />}
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTocados(t => ({ ...t, email: true }))}
              error={!!verEmail}
              placeholder="tu@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </Campo>

          <Campo label="Contraseña" sinMarca error={verPassword}>
            <Entrada
              inputRef={passwordRef}
              icono={<IconLock size={18} color={colors.textTertiary} />}
              esContrasena
              value={password}
              onChangeText={setPassword}
              onBlur={() => setTocados(t => ({ ...t, password: true }))}
              error={!!verPassword}
              placeholder="Tu contraseña"
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </Campo>

          <Pressable
            onPress={() => navigation.navigate('RecuperarClave', { email: email.trim() })}
            hitSlop={8}
            style={s.olvide}
            accessibilityRole="link"
          >
            <Text style={s.olvideTexto}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.boton, loading && s.botonOcupado, pressed && { opacity: 0.85 }]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Ingresar"
        >
          {loading ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.botonTexto}>Ingresar</Text>}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Register')} hitSlop={8} style={s.enlaceWrap} accessibilityRole="link">
          <Text style={s.enlace}>
            ¿No tienes cuenta? <Text style={s.enlaceFuerte}>Crea una gratis</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </FondoAuth>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.xl },

  logo: { alignItems: 'center', marginBottom: spacing.xxl },
  titulo: { fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary, letterSpacing: -0.5, textAlign: 'center' },
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },

  banner: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.dangerActionBg, borderWidth: 1, borderColor: colors.dangerActionBorder,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  bannerTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  bannerAccion: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },
  bannerOk: { fontFamily: fonts.body, fontSize: 13, color: colors.success },

  form: { gap: spacing.lg },

  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.md,
    backgroundColor: 'rgba(2,2,2,0.55)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  olvide: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  olvideTexto: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },
  boton: {
    backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 54,
    justifyContent: 'center', alignItems: 'center',
  },
  botonOcupado: { opacity: 0.6 },
  botonTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
  enlaceWrap: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  enlace: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  enlaceFuerte: { fontFamily: fonts.bold, color: colors.accent },
});
