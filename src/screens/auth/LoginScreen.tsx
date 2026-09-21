import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { IconMail, IconLock, IconEye, IconEyeOff } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>

        {/* Wordmark Rodix */}
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>R</Text>
          </View>
          <View style={styles.wordmark}>
            <View style={styles.wordmarkRow}>
              <Text style={styles.logoRodi}>Rodi</Text>
              <Text style={styles.logoX}>x</Text>
            </View>
            <Text style={styles.superApp}>SUPER-APP</Text>
          </View>
        </View>

        <Text style={styles.tagline}>Roda diferente.</Text>

        {/* Formulario */}
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputRow}>
              <IconMail size={18} color={colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputRow}>
              <IconLock size={18} color={colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!verPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setVerPassword(v => !v)} hitSlop={8}>
                {verPassword
                  ? <IconEyeOff size={18} color={colors.textTertiary} />
                  : <IconEye size={18} color={colors.textTertiary} />
                }
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.onAccent} />
              : <Text style={styles.buttonText}>Ingresar</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>
            ¿No tienes cuenta?{' '}
            <Text style={styles.linkBold}>Regístrate</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content:   { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },

  /* ── Wordmark ── */
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  logoIcon: {
    width: 52,
    height: 52,
    backgroundColor: colors.accent,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIconText: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.onAccent,
    lineHeight: 32,
  },
  wordmark: { gap: 1 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoRodi: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  logoX: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.accent,
    letterSpacing: -1,
  },
  superApp: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 3,
  },

  tagline: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl + spacing.lg,
  },

  /* ── Form card ── */
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.bgSurface,
    padding: spacing.xl,
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  field: { gap: spacing.xs },
  label: {
    fontFamily: fonts.heading, fontSize: 11, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingVertical: 14,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.xs,
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontFamily: fonts.bold, color: colors.onAccent, fontSize: 14,
    textTransform: 'uppercase', letterSpacing: 1.5,
  },

  link:     { fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', fontSize: 14 },
  linkBold: { fontFamily: fonts.bold, color: colors.accent },
});
