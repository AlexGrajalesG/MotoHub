import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

type Recordatorio = {
  id: string;
  tipo: string;
  descripcion: string | null;
  fecha_limite: string | null;
  km_limite: number | null;
  estado: string;
};

const TIPOS_INFO: Record<string, { label: string; emoji: string }> = {
  soat:             { label: 'SOAT',          emoji: '🛡️' },
  revision_tecnica: { label: 'Rev. Tecnica',   emoji: '🔧' },
  aceite:           { label: 'Aceite',         emoji: '🛢️' },
  frenos:           { label: 'Frenos',         emoji: '⛔' },
  cadena:           { label: 'Cadena',         emoji: '⛓️' },
  llantas:          { label: 'Llantas',        emoji: '🔴' },
  bateria:          { label: 'Bateria',        emoji: '🔋' },
  personalizado:    { label: 'Personalizado',  emoji: '📌' },
};

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function RecordatoriosScreen({ route, navigation }: any) {
  const { vehiculo } = route.params;
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchRecordatorios();
    }, [])
  );

  async function fetchRecordatorios() {
    try {
      const { data } = await supabase
        .from('recordatorios')
        .select('*')
        .eq('vehiculo_id', vehiculo.id)
        .order('created_at', { ascending: false });
      setRecordatorios(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function marcarCompletado(id: string) {
    await supabase.from('recordatorios').update({ estado: 'completado' }).eq('id', id);
    setRecordatorios(rs => rs.map(r => r.id === id ? { ...r, estado: 'completado' } : r));
  }

  async function eliminar(id: string) {
    Alert.alert('Eliminar', '¿Eliminar este recordatorio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('recordatorios').delete().eq('id', id);
          setRecordatorios(rs => rs.filter(r => r.id !== id));
        },
      },
    ]);
  }

  function esVencido(r: Recordatorio): boolean {
    if (r.estado !== 'pendiente') return false;
    if (r.fecha_limite && new Date(r.fecha_limite) < new Date()) return true;
    if (r.km_limite && r.km_limite <= vehiculo.kilometraje) return true;
    return false;
  }

  const pendientes = recordatorios.filter(r => r.estado !== 'completado');
  const completados = recordatorios.filter(r => r.estado === 'completado');

  function renderCard({ item }: { item: Recordatorio }) {
    const info = TIPOS_INFO[item.tipo] ?? { label: item.tipo, emoji: '📌' };
    const vencido = esVencido(item);
    const completado = item.estado === 'completado';

    return (
      <View style={[styles.card, vencido && styles.cardVencido, completado && styles.cardCompletado]}>
        <Text style={styles.cardEmoji}>{info.emoji}</Text>
        <View style={styles.cardBody}>
          <Text style={styles.cardTipo}>{info.label}</Text>
          {item.descripcion ? (
            <Text style={styles.cardDesc}>{item.descripcion}</Text>
          ) : null}
          <View style={styles.cardLimites}>
            {item.fecha_limite && (
              <Text style={[styles.cardLimite, vencido && styles.textVencido]}>
                📅 {formatFecha(item.fecha_limite)}
              </Text>
            )}
            {item.km_limite && (
              <Text style={[styles.cardLimite, vencido && styles.textVencido]}>
                🛣 {item.km_limite.toLocaleString()} km
              </Text>
            )}
          </View>
          {vencido && <Text style={styles.badgeVencido}>Vencido</Text>}
        </View>
        <View style={styles.cardAcciones}>
          {!completado && (
            <TouchableOpacity
              style={styles.checkBtn}
              onPress={() => marcarCompletado(item.id)}
            >
              <Text style={styles.checkIcon}>✓</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => eliminar(item.id)}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ff6b00" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Volver</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Recordatorios</Text>
            <Text style={styles.subtitle}>{vehiculo.marca} {vehiculo.modelo}</Text>
          </View>
          <TouchableOpacity
            style={styles.nuevoBtn}
            onPress={() => navigation.navigate('CrearRecordatorio', { vehiculo })}
          >
            <Text style={styles.nuevoBtnText}>+ Nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={[...pendientes, ...completados]}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.lista}
        renderItem={renderCard}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>Sin recordatorios</Text>
            <Text style={styles.emptySubtitle}>
              Crea uno para no olvidar el SOAT, el aceite o cualquier mantenimiento
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => (
          pendientes.length > 0 && completados.length > 0 ? null : null
        )}
        ListFooterComponent={
          completados.length > 0 && pendientes.length > 0
            ? <Text style={styles.seccionLabel}>Completados</Text>
            : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  header: { padding: 24, paddingTop: 56 },
  back: { color: '#ff6b00', fontSize: 16, marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  nuevoBtn: {
    backgroundColor: '#ff6b00',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  nuevoBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  lista: { padding: 16, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 12,
  },
  cardVencido: { borderColor: '#ff3b30', backgroundColor: '#1f1212' },
  cardCompletado: { opacity: 0.5 },
  cardEmoji: { fontSize: 28 },
  cardBody: { flex: 1, gap: 3 },
  cardTipo: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cardDesc: { color: '#888', fontSize: 13 },
  cardLimites: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cardLimite: { color: '#666', fontSize: 12 },
  textVencido: { color: '#ff3b30' },
  badgeVencido: {
    color: '#ff3b30',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  cardAcciones: { gap: 10, alignItems: 'center' },
  checkBtn: {
    backgroundColor: '#ff6b00',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  deleteIcon: { fontSize: 18 },
  seccionLabel: {
    color: '#444',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  empty: { alignItems: 'center', marginTop: 60, padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
