import { useState, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, type TextInput,
} from 'react-native';
import { IconArrowLeft, IconAlertCircle, IconCheck, IconBike, IconCar } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import { mensajeErrorAuth, type ErrorAuth } from '../../lib/errores';
import { VERSION_LEGAL } from '../../lib/legal';
import RodixLogo from '../../components/RodixLogo';
import FondoAuth from '../../components/FondoAuth';
import { Campo, Entrada } from '../../components/FormField';

const { colors, spacing, radius, fonts } = tokens;

const EMAIL_OK = /^\S+@\S+\.\S+$/;

const TIPOS: { value: 'taller' | 'tienda' | 'concesionario' | 'mixto'; label: string }[] = [
  { value: 'taller',        label: 'Taller' },
  { value: 'tienda',        label: 'Tienda' },
  { value: 'concesionario', label: 'Concesionario' },
  { value: 'mixto',         label: 'Mixto' },
];

type Campos = 'nombre' | 'email' | 'password' | 'atiende' | 'acepto';

/**
 * Cuenta de negocio independiente: NO agrega el rol 'negocio' a una cuenta personal existente
 * (eso lo sigue haciendo RegistrarNegocioScreen, sin tocar). Esto crea un login propio —
 * el trigger handle_new_user() ve tipo_cuenta:'negocio' en la metadata y crea usuarios.roles=['negocio']
 * + la fila de negocios en la misma operación, sin pasos extra después de confirmar el correo.
 */
export default function RegistrarNegocioCuentaScreen({ navigation }: any) {
  const [nombre, setNombre]           = useState('');
  const [tipo, setTipo]               = useState<'taller' | 'tienda' | 'concesionario' | 'mixto'>('taller');
  const [atiende, setAtiende]         = useState<string[]>(['motos', 'carros']);
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion]     = useState('');
  const [ciudad, setCiudad]           = useState('');
  const [telefono, setTelefono]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [acepto, setAcepto]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [intento, setIntento]         = useState(false);
  const [tocados, setTocados]         = useState<Partial<Record<Campos, boolean>>>({});
  const [errorServidor, setErrorServidor] = useState<ErrorAuth | null>(null);

  const nombreRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const errores: Partial<Record<Campos, string>> = {};
  if (nombre.trim().length < 2) errores.nombre = 'Escribe el nombre de tu taller o tienda';
  if (atiende.length === 0) errores.atiende = '¿A qué atiende: motos, carros o ambos?';
  if (!email.trim()) errores.email = 'Escribe un correo';
  else if (!EMAIL_OK.test(email.trim())) errores.email = 'Ese correo no parece válido';
  if (!password) errores.password = 'Crea una contraseña';
  else if (password.length < 6) errores.password = 'Usa al menos 6 caracteres';
  if (!acepto) errores.acepto = 'Para crear tu cuenta debes aceptar los textos legales';

  const ver = (c: Campos) => (intento || tocados[c] ? errores[c] : undefined);
  const tocar = (c: Campos) => setTocados(t => ({ ...t, [c]: true }));

  function toggleAtiende(v: string) {
    setAtiende(prev => (prev.includes(v) ? prev.filter(a => a !== v) : [...prev, v]));
    tocar('atiende');
  }

  async function handleRegistrar() {
    setIntento(true);
    if (errores.nombre) { nombreRef.current?.focus(); return; }
    if (errores.atiende) return;
    if (errores.email) { emailRef.current?.focus(); return; }
    if (errores.password) { passwordRef.current?.focus(); return; }
    if (errores.acepto) return;

    setLoading(true);
    setErrorServidor(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          tipo_cuenta: 'negocio',
          nombre: nombre.trim(),
          ciudad: ciudad.trim(),
          telefono: telefono.replace(/\D/g, ''),
          negocio_tipo: tipo,
          negocio_descripcion: descripcion.trim(),
          negocio_direccion: direccion.trim(),
          atiende,
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
          <Text style={s.titulo}>Crea tu cuenta de negocio</Text>
          <Text style={s.sub}>Una cuenta propia para tu taller o tienda, separada de tu cuenta personal</Text>

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
            <Campo label="Nombre del negocio" sinMarca error={ver('nombre')}>
              <Entrada
                inputRef={nombreRef}
                value={nombre}
                onChangeText={setNombre}
                onBlur={() => tocar('nombre')}
                error={!!ver('nombre')}
                placeholder="Ej: MotoExpress Servicio"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </Campo>

            <Campo label="Tipo de negocio" sinMarca>
              <View style={s.chips}>
                {TIPOS.map(t => (
                  <Pressable
                    key={t.value}
                    onPress={() => setTipo(t.value)}
                    style={({ pressed }) => [s.chip, tipo === t.value && s.chipOn, pressed && { opacity: 0.8 }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: tipo === t.value }}
                  >
                    <Text style={[s.chipTexto, tipo === t.value && s.chipTextoOn]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Campo>

            <Campo label="Atiende" sinMarca error={ver('atiende')}>
              <View style={s.chips}>
                <Pressable
                  onPress={() => toggleAtiende('motos')}
                  style={({ pressed }) => [s.chip, atiende.includes('motos') && s.chipOn, pressed && { opacity: 0.8 }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: atiende.includes('motos') }}
                >
                  <IconBike size={14} color={atiende.includes('motos') ? colors.onAccent : colors.textSecondary} />
                  <Text style={[s.chipTexto, atiende.includes('motos') && s.chipTextoOn]}>Motos</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleAtiende('carros')}
                  style={({ pressed }) => [s.chip, atiende.includes('carros') && s.chipOn, pressed && { opacity: 0.8 }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: atiende.includes('carros') }}
                >
                  <IconCar size={14} color={atiende.includes('carros') ? colors.onAccent : colors.textSecondary} />
                  <Text style={[s.chipTexto, atiende.includes('carros') && s.chipTextoOn]}>Carros</Text>
                </Pressable>
              </View>
            </Campo>

            <Campo label="Descripción" sinMarca ayuda="Opcional">
              <Entrada
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Qué ofreces, especialidades..."
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
            </Campo>

            <Campo label="Dirección" sinMarca ayuda="Opcional">
              <Entrada value={direccion} onChangeText={setDireccion} placeholder="Ej: Carrera 27 #45-12" returnKeyType="next" />
            </Campo>

            <Campo label="Ciudad" sinMarca ayuda="Opcional">
              <Entrada value={ciudad} onChangeText={setCiudad} placeholder="Ej: Bucaramanga" returnKeyType="next" />
            </Campo>

            <Campo label="Teléfono" sinMarca ayuda="Opcional">
              <Entrada value={telefono} onChangeText={setTelefono} placeholder="3151234567" keyboardType="phone-pad" returnKeyType="next" />
            </Campo>

            <Campo label="Correo de la cuenta de negocio" sinMarca error={ver('email')} ayuda="Distinto al de tu cuenta personal, si ya tienes una">
              <Entrada
                inputRef={emailRef}
                value={email}
                onChangeText={setEmail}
                onBlur={() => tocar('email')}
                error={!!ver('email')}
                placeholder="negocio@correo.com"
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
                onSubmitEditing={handleRegistrar}
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
            onPress={handleRegistrar}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Crear cuenta de negocio"
          >
            {loading ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.botonTexto}>Crear cuenta de negocio</Text>}
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8} style={s.enlaceWrap} accessibilityRole="link">
            <Text style={s.enlace}>
              ¿Ya tienes cuenta de negocio? <Text style={s.enlaceFuerte}>Inicia sesión</Text>
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
  titulo: { fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl, lineHeight: 20 },

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
    flexDirection: 'row', alignItems: 'center', gap: 6,
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
