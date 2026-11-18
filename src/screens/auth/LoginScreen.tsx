import { useState, useRef } from 'react';
import {
  View, Text, Pressable, Animated, KeyboardAvoidingView,
  Platform, ScrollView, useWindowDimensions, type TextInput,
} from 'react-native';
import { IconMail, IconLock, IconAlertCircle } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import { mensajeErrorAuth, type ErrorAuth } from '../../lib/errores';
import { alturaHero } from '../../lib/animacionAuth';
import RodixLogo from '../../components/RodixLogo';
import FondoAuth, { tintaHero } from '../../components/FondoAuth';
import Aparece from '../../components/auth/Aparece';
import BotonAuth from '../../components/auth/BotonAuth';
import { useSacudida } from '../../components/auth/useSacudida';
import { Campo, Entrada } from '../../components/FormField';
import { estilosTema } from '../../lib/estilosTema';

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
  const sacudida = useSacudida();
  const { height } = useWindowDimensions();
  const altoHero = alturaHero('hero', height);
  const tinta = tintaHero();

  const errEmail = !email.trim() ? 'Escribe tu correo' : !EMAIL_OK.test(email.trim()) ? 'Ese correo no parece válido' : undefined;
  const errPassword = !password ? 'Escribe tu contraseña' : undefined;
  const verEmail = intento || tocados.email ? errEmail : undefined;
  const verPassword = intento || tocados.password ? errPassword : undefined;

  async function handleLogin() {
    setIntento(true);
    if (errEmail) { sacudida.sacudir(); emailRef.current?.focus(); return; }
    if (errPassword) { sacudida.sacudir(); passwordRef.current?.focus(); return; }

    setLoading(true);
    setErrorServidor(null);
    setReenviado(false);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) { setErrorServidor(mensajeErrorAuth(error)); sacudida.sacudir(); }
    // si entra bien, AppNavigator cambia de pila solo al detectar la sesion
  }

  async function reenviarCorreo() {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (error) setErrorServidor(mensajeErrorAuth(error));
    else setReenviado(true);
  }

  return (
    <FondoAuth variante="hero">
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[s.hero, { height: altoHero }]}>
            <Aparece indice={0}>
              <RodixLogo variante="monograma" alto={58} color={tinta} />
            </Aparece>
            <Aparece indice={1}>
              <Text style={[s.lema, { color: tinta }]}>Tu vehículo y tus talleres, en un solo lugar</Text>
            </Aparece>
          </View>

          <Aparece indice={2} desde={28} style={s.tarjetaZona}>
            <Animated.View style={[s.tarjeta, sacudida.estilo]}>
              <View style={s.encabezado}>
                <Text style={s.titulo}>Bienvenido de vuelta</Text>
                <Text style={s.sub}>Entra para ver el estado de tu vehículo</Text>
              </View>

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

              <BotonAuth texto="Ingresar" cargando={loading} onPress={handleLogin} />
            </Animated.View>
          </Aparece>

          <Aparece indice={4} style={s.pie}>
            <Pressable onPress={() => navigation.navigate('Register')} hitSlop={8} style={s.enlaceWrap} accessibilityRole="link">
              <Text style={s.enlace}>
                ¿No tienes cuenta? <Text style={s.enlaceFuerte}>Crea una gratis</Text>
              </Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('RegistrarNegocioCuenta')} hitSlop={8} style={s.enlaceWrap} accessibilityRole="link">
              <Text style={s.enlaceNegocio}>Tengo un taller o tienda</Text>
            </Pressable>
          </Aparece>
        </ScrollView>
      </KeyboardAvoidingView>
    </FondoAuth>
  );
}

const s = estilosTema(() => ({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: spacing.xl },

  hero: { alignItems: 'center', paddingTop: 72, paddingHorizontal: spacing.xl, gap: spacing.md },
  lema: { fontFamily: fonts.heading, fontSize: 14, textAlign: 'center' },

  tarjetaZona: { paddingHorizontal: spacing.xl, marginTop: -40 },
  tarjeta: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.xl, gap: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 10,
  },
  encabezado: { gap: spacing.xs },
  titulo: { fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },

  banner: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.dangerActionBg, borderWidth: 1, borderColor: colors.dangerActionBorder,
    borderRadius: radius.md, padding: spacing.md,
  },
  bannerTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  bannerAccion: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },
  bannerOk: { fontFamily: fonts.body, fontSize: 13, color: colors.success },

  olvide: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', marginTop: -spacing.sm },
  olvideTexto: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },

  pie: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.xs },
  enlaceWrap: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  enlace: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  enlaceFuerte: { fontFamily: fonts.bold, color: colors.accent },
  enlaceNegocio: { fontFamily: fonts.heading, fontSize: 13, color: colors.textTertiary, textDecorationLine: 'underline' },
}));
