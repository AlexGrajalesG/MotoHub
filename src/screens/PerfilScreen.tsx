import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function PerfilScreen() {
  const { session } = useAuth();

  async function handleLogout() {
    Alert.alert('Cerrar sesion', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.email}>{session?.user.email}</Text>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Cerrar sesion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111318', padding: 24, paddingTop: 56 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  email: { fontSize: 14, color: '#666', marginBottom: 48 },
  button: {
    backgroundColor: '#1c1f27',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  buttonText: { color: '#ff3b30', fontSize: 16, fontWeight: 'bold' },
});
