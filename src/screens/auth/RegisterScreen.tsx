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
import FondoAuth from '../../components/FondoAuth';
import { Campo, Entrada } from '../../components/FormField';

const { colors, spacing, radius, fonts } = tokens;

const EMAIL_OK = /^\S+@\S+\.\S+$/;
const USUARIO_OK = /^[a-z0-9_]{3,20}$/;
const CIUDADES = ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Bogotá', 'Medellín', 'Otra'];

/** "Alex Gómez" -> "alex_gomez". Si queda muy corto se deja vacio para que el usuario lo escriba. */
function usuarioDesdeNombre(nombre: string): string {
  const base = nombre.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .slice(0, 20);
  return base.length >= 3 ? base : '';
}

type Campos = 'nombre' | 'usuario' | 'email' | 'telefono' | 'ciudad' | 'edad' | 'password' | 'acepto';

export default function RegisterScreen({ navigation }: any) {
  const [nombre, setNombre]     = useState('');
  const [usuario, setUsuario]   = useState('');
  const [usuarioEditado, setUsuarioEditado] = useState(false);
  const [usuarioOcupado, setUsuarioOcupado] = useState(false);
  const [email, setEmail]       = useState('');
  const [telefono, setTelefono] = useState('');
  const [ciudadSel, setCiudadSel] = useState('');
  const [ciudadOtra, setCiudadOtra] = useState('');
  const [edad, setEdad]         = useState('');
  const [password, setPassword] = useState('');
  const [acepto, setAcepto]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [intento, setIntento]   = useState(false);
  const [tocados, setTocados]   = useState<Partial<Record<Campos, boolean>>>({});
  const [errorServidor, setErrorServidor] = useState<ErrorAuth | null>(null);

  const nombreRef = useRef<TextInput>(null);
  const usuarioRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const telefonoRef = useRef<TextInput>(null);
  const ciudadOtraRef = useRef<TextInput>(null);
  const edadRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const ciudad = ciudadSel === 'Otra' ? ciudadOtra.trim() : ciudadSel;
  const telefonoDigitos = telefono.replace(/\D/g, '');
  const edadNum = Number(edad);

  const errores: Partial<Record<Campos, string>> = {};
  if (nombre.trim().length < 2) errores.nombre = 'Escribe tu nombre';
  if (!USUARIO_OK.test(usuario)) errores.usuario = 'De 3 a 20 caracteres: letras, números o _';
  else if (usuarioOcupado) errores.usuario = 'Ese usuario ya está en uso. Prueba otro';
  if (!email.trim()) errores.email = 'Escribe tu correo';
  else if (!EMAIL_OK.test(email.trim())) errores.email = 'Ese correo no parece válido';
  if (!telefonoDigitos) errores.telefono = 'Escribe tu celular';
  else if (telefonoDigitos.length < 10) errores.telefono = 'El celular debe tener 10 dígitos';
  if (!ciudadSel) errores.ciudad = 'Elige tu ciudad';
  else if (!ciudad) errores.ciudad = 'Escribe tu ciudad';
  if (!edad) errores.edad = 'Escribe tu edad';
  else if (!Number.isInteger(edadNum) || edadNum < 14 || edadNum > 100) errores.edad = 'Escribe una edad entre 14 y 100';
  if (!password) errores.password = 'Crea una contraseña';
  else if (password.length < 6) errores.password = 'Usa al menos 6 caracteres';
  if (!acepto) errores.acepto = 'Para crear tu cuenta debes aceptar los textos legales';

  const ver = (c: Campos) => (intento || tocados[c] ? errores[c] : undefined);
  const tocar = (c: Campos) => setTocados(t => ({ ...t, [c]: true }));

  function cambiarNombre(v: string) {
    setNombre(v);
    if (!usuarioEditado) { setUsuario(usuarioDesdeNombre(v)); setUsuarioOcupado(false); }
  }

  function cambiarUsuario(v: string) {
    setUsuarioEditado(true);
    setUsuarioOcupado(false);
    setUsuario(v.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '').slice(0, 20));
  }

  /** Avisa antes de enviar si el usuario ya existe; si la consulta falla, la base le asigna uno libre. */
  async function revisarUsuario() {
    tocar('usuario');
    if (!USUARIO_OK.test(usuario)) return;
    const { data, error } = await supabase.rpc('nombre_usuario_disponible', { p_nombre_usuario: usuario });
    if (!error && data === false) setUsuarioOcupado(true);
  }

  async function handleRegister() {
    setIntento(true);
    const orden: [Campos, React.RefObject<TextInput | null>][] = [
      ['nombre', nombreRef], ['usuario', usuarioRef], ['email', emailRef], ['telefono', telefonoRef],
      ['edad', edadRef], ['password', passwordRef],
    ];
    const primero = orden.find(([c]) => errores[c]);
    if (primero) { primero[1].current?.focus(); return; }
    if (errores.ciudad) { if (ciudadSel === 'Otra') ciudadOtraRef.current?.focus(); return; }
    if (errores.acepto) return;

    setLoading(true);
    setErrorServidor(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nombre: nombre.trim(),
          nombre_usuario: usuario,
          telefono: telefonoDigitos,
          ciudad,
          edad: edadNum,
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
    <FondoAuth>
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
            <Campo label="Nombre completo" sinMarca error={ver('nombre')}>
              <Entrada
                inputRef={nombreRef}
                value={nombre}
                onChangeText={cambiarNombre}
                onBlur={() => tocar('nombre')}
                error={!!ver('nombre')}
                placeholder="Tu nombre y apellido"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => usuarioRef.current?.focus()}
                blurOnSubmit={false}
              />
            </Campo>

            <Campo label="Nombre de usuario" sinMarca error={ver('usuario')} ayuda="Así te encuentran los talleres, con @">
              <Entrada
                inputRef={usuarioRef}
                value={usuario}
                onChangeText={cambiarUsuario}
                onBlur={revisarUsuario}
                error={!!ver('usuario')}
                placeholder="tu_usuario"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
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
                onSubmitEditing={() => telefonoRef.current?.focus()}
                blurOnSubmit={false}
              />
            </Campo>

            <Campo label="Celular" sinMarca error={ver('telefono')}>
              <Entrada
                inputRef={telefonoRef}
                value={telefono}
                onChangeText={setTelefono}
                onBlur={() => tocar('telefono')}
                error={!!ver('telefono')}
                placeholder="3001234567"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={14}
                returnKeyType="next"
                onSubmitEditing={() => edadRef.current?.focus()}
                blurOnSubmit={false}
              />
            </Campo>

            <Campo label="Ciudad" sinMarca error={ver('ciudad')}>
              <View style={s.chips}>
                {CIUDADES.map(c => {
                  const on = ciudadSel === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => { setCiudadSel(c); tocar('ciudad'); }}
                      style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { opacity: 0.8 }]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[s.chipTexto, on && s.chipTextoOn]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {ciudadSel === 'Otra' && (
                <Entrada
                  inputRef={ciudadOtraRef}
                  value={ciudadOtra}
                  onChangeText={setCiudadOtra}
                  onBlur={() => tocar('ciudad')}
                  error={!!ver('ciudad')}
                  placeholder="Escribe tu ciudad"
                  autoCapitalize="words"
                  maxLength={60}
                />
              )}
            </Campo>

            <Campo label="Edad" sinMarca error={ver('edad')}>
              <Entrada
                inputRef={edadRef}
                value={edad}
                onChangeText={v => setEdad(v.replace(/\D/g, '').slice(0, 3))}
                onBlur={() => tocar('edad')}
                error={!!ver('edad')}
                placeholder="Ej. 28"
                keyboardType="number-pad"
                maxLength={3}
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
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },

  banner: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.dangerActionBg, borderWidth: 1, borderColor: colors.dangerActionBorder,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  bannerTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  bannerAccion: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },

  form: { gap: spacing.lg },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.md, justifyContent: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  chipTextoOn: { fontFamily: fonts.bold, color: colors.onAccent },

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
    backgroundColor: 'rgba(2,2,2,0.55)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
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
