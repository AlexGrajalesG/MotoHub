import { useState, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, type TextInput,
} from 'react-native';
import { IconArrowLeft, IconAlertCircle, IconCheck } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import { mensajeErrorAuth, type ErrorAuth } from '../../lib/errores';
import { VERSION_LEGAL } from '../../lib/legal';
import RodixLogo from '../../components/RodixLogo';
import { Campo, Entrada } from '../../components/FormField';

const { colors, spacing, radius, fonts } = tokens;

const EMAIL_OK = /^\S+@\S+\.\S+$/;

/** "Alex Gómez" -> "alex_gomez". Si queda muy corto se omite y la base genera uno. */
function usuarioDesdeNombre(nombre: string): string {
  const base = nombre.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .slice(0, 20);
  return base.length >= 3 ? base : '';
}

type Campos = 'nombre' | 'email' | 'password' | 'acepto';

export default function RegisterScreen({ navigation }: any) {
  const [nombre, setNombre]     = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [acepto, setAcepto]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [intento, setIntento]   = useState(false);
  const [tocados, setTocados]   = useState<Partial<Record<Campos, boolean>>>({});
  const [errorServidor, setErrorServidor] = useState<ErrorAuth | null>(null);

  const nombreRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const errores: Partial<Record<Campos, string>> = {};
  if (nombre.trim().length < 2) errores.nombre = 'Escribe tu nombre';
  if (!email.trim()) errores.email = 'Escribe tu correo';
  else if (!EMAIL_OK.test(email.trim())) errores.email = 'Ese correo no parece válido';
  if (!password) errores.password = 'Crea una contraseña';
  else if (password.length < 6) errores.password = 'Usa al menos 6 caracteres';
  if (!acepto) errores.acepto = 'Para crear tu cuenta debes aceptar los textos legales';

  const ver = (c: Campos) => (intento || tocados[c] ? errores[c] : undefined);
  const tocar = (c: Campos) => setTocados(t => ({ ...t, [c]: true }));

  async function handleRegister() {
    setIntento(true);
    const primero = (['nombre', 'email', 'password'] as const).find(c => errores[c]);
    if (primero) { ({ nombre: nombreRef, email: emailRef, password: passwordRef })[primero].current?.focus(); return; }
    if (errores.acepto) return;

    setLoading(true);
    setErrorServidor(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nombre: nombre.trim(),
          nombre_usuario: usuarioDesdeNombre(nombre),
          consentimiento_version: VERSION_LEGAL,
          consentimiento_fecha: new Date().toISOString(),
        },
      },
    });
    setLoading(false);

    if (error) { setErrorServidor(mensajeErrorAuth(error)); return; }
    navigation.navigate('CheckEmail', { email: email.trim() });
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
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
        <Text style={s.titulo}>Crea tu cuenta</Text>
        <Text style={s.sub}>Gratis y en menos de un minuto</Text>

        {errorServidor && (
          <View style={s.banner} accessibilityLiveRegion="polite">
            <IconAlertCircle size={18} color={colors.dangerAction} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.bannerTexto}>{errorServidor.mensaje}</Text>
              {errorServidor.cuentaExistente && (
                <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8} accessibilityRole="button">
                  <Text style={s.bannerAccion}>Ir a iniciar sesión</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        <View style={s.form}>
          <Campo label="Nombre" sinMarca error={ver('nombre')}>
            <Entrada
              inputRef={nombreRef}
              value={nombre}
              onChangeText={setNombre}
              onBlur={() => tocar('nombre')}
              error={!!ver('nombre')}
              placeholder="Tu nombre y apellido"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
            />
          </Campo>

          <Campo label="Correo electrónico" sinMarca error={ver('email')}>
            <Entrada
              inputRef={emailRef}
              value={email}
              onChangeText={setEmail}
              onBlur={() => tocar('email')}
              error={!!ver('email')}
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

          <Campo label="Contraseña" sinMarca error={ver('password')} ayuda="Mínimo 6 caracteres">
            <Entrada
              inputRef={passwordRef}
              esContrasena
              value={password}
              onChangeText={setPassword}
              onBlur={() => tocar('password')}
              error={!!ver('password')}
              placeholder="Crea una contraseña"
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </Campo>

          <View style={{ gap: 6 }}>
            <Pressable
              style={s.consent}
              onPress={() => { setAcepto(a => !a); tocar('acepto'); }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acepto }}
              accessibilityLabel="Acepto los términos y la política de datos"
            >
              <View style={[s.check, acepto && s.checkOn, ver('acepto') ? s.checkError : null]}>
                {acepto && <IconCheck size={16} color={colors.onAccent} />}
              </View>
              <Text style={s.consentTexto}>
                Acepto los{' '}
                <Text style={s.enlaceLegal} onPress={() => navigation.navigate('Legal', { documento: 'terminos' })}>Términos</Text>
                {' '}y la{' '}
                <Text style={s.enlaceLegal} onPress={() => navigation.navigate('Legal', { documento: 'datos' })}>Política de datos</Text>
              </Text>
            </Pressable>
            {ver('acepto') && (
              <View style={s.errorRow} accessibilityLiveRegion="polite">
                <IconAlertCircle size={14} color={colors.dangerAction} />
                <Text style={s.errorTexto}>{errores.acepto}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.boton, loading && s.botonOcupado, pressed && { opacity: 0.85 }]}
          onPress={handleRegister}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Crear cuenta"
        >
          {loading ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.botonTexto}>Crear cuenta</Text>}
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8} style={s.enlaceWrap} accessibilityRole="link">
          <Text style={s.enlace}>
            ¿Ya tienes cuenta? <Text style={s.enlaceFuerte}>Inicia sesión</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

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
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },

  banner: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.dangerActionBg, borderWidth: 1, borderColor: colors.dangerActionBorder,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  bannerTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  bannerAccion: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },

  form: { gap: spacing.lg },

  consent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  check: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: colors.bgSurface,
    backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center',
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkError: { borderColor: colors.dangerAction },
  consentTexto: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  enlaceLegal: { fontFamily: fonts.bold, color: colors.accent },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorTexto: { flexShrink: 1, fontFamily: fonts.body, fontSize: 12, color: colors.dangerAction },

  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm,
    backgroundColor: colors.bgPrimary, borderTopWidth: 1, borderTopColor: colors.bgCard,
  },
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
