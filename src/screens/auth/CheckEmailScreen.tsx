import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function CheckEmailScreen({ route, navigation }: any) {
  const email = route.params?.email ?? '';

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📬</Text>
      <Text style={styles.title}>Revisa tu correo</Text>
      <Text style={styles.subtitle}>
        Enviamos un enlace de confirmacion a:
      </Text>
      <Text style={styles.email}>{email}</Text>
      <Text style={styles.hint}>
        Abre el correo y toca el enlace para activar tu cuenta. Luego regresa aqui e inicia sesion.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.buttonText}>Ir al Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Usar otro correo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  email: { fontSize: 16, color: '#ff6b00', fontWeight: 'bold', marginVertical: 8 },
  hint: { fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 40 },
  button: {
    backgroundColor: '#ff6b00',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginBottom: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#555', fontSize: 14 },
});
