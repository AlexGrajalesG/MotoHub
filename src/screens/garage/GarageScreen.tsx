import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type Vehiculo = {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  tipo: string;
  kilometraje: number;
  fotos: string[];
};

export default function GarageScreen({ navigation }: any) {
  const { session } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchVehiculos();
    }, [])
  );

  async function fetchVehiculos() {
    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('id, marca, modelo, anio, placa, tipo, kilometraje, fotos')
        .eq('propietario_id', session?.user.id)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) console.error('Error cargando vehiculos:', error.message);
      setVehiculos(data ?? []);
    } catch (e) {
      console.error('fetchVehiculos exception:', e);
    } finally {
      setLoading(false);
    }
  }

  function tipoEmoji(tipo: string) {
    if (tipo === 'moto') return '🏍️';
    if (tipo === 'carro') return '🚗';
    if (tipo === 'camioneta') return '🚙';
    return '🚘';
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e8522a" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Garage</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AgregarVehiculo')}
        >
          <Text style={styles.addButtonText}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      {vehiculos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏍️</Text>
          <Text style={styles.emptyTitle}>Tu garage esta vacio</Text>
          <Text style={styles.emptySubtitle}>Agrega tu primer vehiculo para empezar</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('AgregarVehiculo')}
          >
            <Text style={styles.emptyButtonText}>Agregar vehiculo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vehiculos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('DetalleVehiculo', { vehiculo: item })}
            >
              {item.fotos?.[0] ? (
                <Image
                  source={item.fotos[0]}
                  style={styles.cardFoto}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.cardEmojiContainer}>
                  <Text style={styles.cardEmoji}>{tipoEmoji(item.tipo)}</Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardNombre}>{item.marca} {item.modelo}</Text>
                <Text style={styles.cardDetalle}>{item.anio} · {item.placa.toUpperCase()}</Text>
                <Text style={styles.cardKm}>{item.kilometraje.toLocaleString()} km</Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111318' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111318' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 56,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  addButton: {
    backgroundColor: '#e8522a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1c1f27',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2d38',
    overflow: 'hidden',
  },
  cardFoto: {
    width: 80,
    height: 80,
  },
  cardEmojiContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: { fontSize: 32 },
  cardInfo: { flex: 1, padding: 16 },
  cardNombre: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  cardDetalle: { fontSize: 13, color: '#888', marginTop: 2 },
  cardKm: { fontSize: 13, color: '#e8522a', marginTop: 4 },
  cardArrow: { fontSize: 24, color: '#444', paddingRight: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 72, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
  emptyButton: {
    backgroundColor: '#e8522a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  emptyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
