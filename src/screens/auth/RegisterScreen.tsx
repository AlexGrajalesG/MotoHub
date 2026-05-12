import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen({ navigation }: any) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!nombre || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Completa todos los campos');
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
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('usuarios').insert({
        id: data.user.id,
        nombre,
        roles: ['propietario'],
      });
    }

    setLoading(false);
    Alert.alert('Listo', 'Cuenta creada. Revisa tu correo para confirmar.');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>MotorHub</Text>
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
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  logo: { fontSize: 42, fontWeight: 'bold', color: '#ff6b00', textAlign: 'center', marginBottom: 8 },
  tagline: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 48 },
  form: { gap: 12, marginBottom: 32 },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  button: {
    backgroundColor: '#ff6b00',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#666', textAlign: 'center', fontSize: 14 },
  linkBold: { color: '#ff6b00', fontWeight: 'bold' },
});
