import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView
} from 'react-native';
import { supabase } from '../../lib/supabase';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

type EstadoUsername = 'vacio' | 'formato_invalido' | 'verificando' | 'disponible' | 'tomado' | 'error';

export default function RegisterScreen({ navigation }: any) {
  const [nombre, setNombre] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [estadoUsername, setEstadoUsername] = useState<EstadoUsername>('vacio');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const limpio = nombreUsuario.trim().toLowerCase();

    if (!limpio) { setEstadoUsername('vacio'); return; }
    if (!USERNAME_REGEX.test(limpio)) { setEstadoUsername('formato_invalido'); return; }

    setEstadoUsername('verificando');
    debounceRef.current = setTimeout(async () => {
      const { data, error } = await supabase.rpc('nombre_usuario_disponible', { p_nombre_usuario: limpio });
      if (error) { setEstadoUsername('error'); return; }
      setEstadoUsername(data ? 'disponible' : 'tomado');
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [nombreUsuario]);

  const USERNAME_HINTS: Record<EstadoUsername, string | null> = {
    vacio: null,
    formato_invalido: 'Solo minúsculas, números y guion bajo (3-20 caracteres)',
    verificando: 'Verificando disponibilidad...',
    disponible: 'Disponible',
    tomado: 'Ese nombre de usuario ya está en uso',
    error: 'No se pudo verificar, intenta de nuevo',
  };

  async function handleRegister() {
    if (!nombre || !nombreUsuario || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    if (estadoUsername !== 'disponible') {
      Alert.alert('Error', 'Elige un nombre de usuario válido y disponible');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contrasenas no coinciden');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contrasena debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, nombre_usuario: nombreUsuario.trim().toLowerCase() } },
    });

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigation.navigate('CheckEmail', { email });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Rodix</Text>
        <Text style={styles.tagline}>Crea tu cuenta gratis</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            placeholderTextColor="#666"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />
          <View>
            <TextInput
              style={styles.input}
              placeholder="Nombre de usuario"
              placeholderTextColor="#666"
              value={nombreUsuario}
              onChangeText={t => setNombreUsuario(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              maxLength={20}
            />
            {USERNAME_HINTS[estadoUsername] && (
              <Text style={[
                styles.usernameHint,
                estadoUsername === 'disponible' && styles.usernameHintOk,
                (estadoUsername === 'tomado' || estadoUsername === 'formato_invalido' || estadoUsername === 'error') && styles.usernameHintError,
              ]}>
                {USERNAME_HINTS[estadoUsername]}
              </Text>
            )}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Correo electronico"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Contrasena"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmar contrasena"
            placeholderTextColor="#666"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Crear cuenta</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>
            Ya tienes cuenta?{' '}
            <Text style={styles.linkBold}>Ingresar</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111318' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  logo: { fontSize: 42, fontWeight: 'bold', color: '#e8522a', textAlign: 'center', marginBottom: 8 },
  tagline: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 48 },
  form: { gap: 12, marginBottom: 32 },
  input: {
    backgroundColor: '#1c1f27',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2d38',
  },
  button: {
    backgroundColor: '#e8522a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  usernameHint: { fontSize: 12, marginTop: 4, marginLeft: 4, color: '#666' },
  usernameHintOk: { color: '#34c759' },
  usernameHintError: { color: '#ff453a' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#666', textAlign: 'center', fontSize: 14 },
  linkBold: { color: '#e8522a', fontWeight: 'bold' },
});
