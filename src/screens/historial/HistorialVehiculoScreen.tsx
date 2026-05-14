import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Registro = {
  id: string;
  tipo: string;
  descripcion: string | null;
  fecha: string;
  km_en_servicio: number | null;
  taller: string | null;
  costo: number | null;
  notas: string | null;
};

const TIPOS_INFO: Record<string, { label: string; emoji: string }> = {
  aceite:           { label: 'Cambio de aceite',  emoji: '🛢️' },
  frenos:           { label: 'Frenos',             emoji: '⛔' },
  cadena:           { label: 'Cadena',             emoji: '⛓️' },
  llantas:          { label: 'Llantas',            emoji: '🔴' },
  bateria:          { label: 'Bateria',            emoji: '🔋' },
  revision_tecnica: { label: 'Rev. Tecnica',       emoji: '🔧' },
  soat:             { label: 'SOAT',               emoji: '🛡️' },
  lavado:           { label: 'Lavado',             emoji: '🚿' },
  personalizado:    { label: 'Personalizado',      emoji: '📌' },
};

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function HistorialVehiculoScreen({ route, navigation }: any) {
  const { vehiculo } = route.params;
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchHistorial();
    }, [])
  );

  async function fetchHistorial() {
    try {
      const { data } = await supabase
        .from('historial_mantenimiento')
        .select('*')
        .eq('vehiculo_id', vehiculo.id)
        .order('fecha', { ascending: false });
      setRegistros(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function eliminar(id: string) {
    Alert.alert('Eliminar registro', '¿Eliminar este registro del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('historial_mantenimiento').delete().eq('id', id);
          setRegistros(rs => rs.filter(r => r.id !== id));
        },
      },
    ]);
  }

  function renderCard({ item }: { item: Registro }) {
    const info = TIPOS_INFO[item.tipo] ?? { label: item.tipo, emoji: '📌' };

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardEmoji}>{info.emoji}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTipo}>{item.descripcion || info.label}</Text>
            <Text style={styles.cardFecha}>{formatFecha(item.fecha)}</Text>
          </View>
          {item.taller ? (
            <Text style={styles.cardMeta}>🏪 {item.taller}</Text>
          ) : null}
          <View style={styles.cardMetaRow}>
            {item.km_en_servicio ? (
              <Text style={styles.cardMeta}>🛣 {item.km_en_servicio.toLocaleString()} km</Text>
            ) : null}
            {item.costo ? (
              <Text style={styles.cardMeta}>
                💰 ${item.costo.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
              </Text>
            ) : null}
          </View>
          {item.notas ? (
            <Text style={styles.cardNotas}>{item.notas}</Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => eliminar(item.id)}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Historial</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{vehiculo.marca} {vehiculo.modelo}</Text>
            <Text style={styles.subtitle}>
              {registros.length} registro{registros.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.nuevoBtn}
            onPress={() => navigation.navigate('AgregarHistorial', { vehiculo })}
          >
            <Text style={styles.nuevoBtnText}>+ Agregar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={registros}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.lista}
        renderItem={renderCard}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔧</Text>
            <Text style={styles.emptyTitle}>Sin registros aun</Text>
            <Text style={styles.emptySubtitle}>
              Registra el primer mantenimiento de tu {vehiculo.tipo} para llevar el control
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('AgregarHistorial', { vehiculo })}
            >
              <Text style={styles.emptyBtnText}>Agregar registro</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111318' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111318' },
  header: { padding: 24, paddingTop: 56 },
  back: { color: '#e8522a', fontSize: 16, marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  nuevoBtn: {
    backgroundColor: '#e8522a', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  nuevoBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  lista: { padding: 16, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: '#1c1f27',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#2a2d38',
    gap: 10,
  },
  cardLeft: { paddingTop: 2 },
  cardEmoji: { fontSize: 26 },
  cardBody: { flex: 1, gap: 4 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTipo: { color: '#fff', fontWeight: 'bold', fontSize: 15, flex: 1 },
  cardFecha: { color: '#888', fontSize: 12 },
  cardMetaRow: { flexDirection: 'row', gap: 12 },
  cardMeta: { color: '#888', fontSize: 12 },
  cardNotas: { color: '#666', fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 18 },
  empty: { alignItems: 'center', marginTop: 60, padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: '#e8522a', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
