import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { programarNotificacionFecha } from '../../lib/notificaciones';

const TIPOS = [
  { key: 'soat',             label: 'SOAT',          emoji: '🛡️' },
  { key: 'revision_tecnica', label: 'Rev. Tecnica',   emoji: '🔧' },
  { key: 'aceite',           label: 'Aceite',         emoji: '🛢️' },
  { key: 'frenos',           label: 'Frenos',         emoji: '⛔' },
  { key: 'cadena',           label: 'Cadena',         emoji: '⛓️' },
  { key: 'llantas',          label: 'Llantas',        emoji: '🔴' },
  { key: 'bateria',          label: 'Bateria',        emoji: '🔋' },
  { key: 'personalizado',    label: 'Personalizado',  emoji: '📌' },
];

function parseFecha(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (!isNaN(new Date(iso).getTime())) return iso;
  }
  return null;
}

export default function CrearRecordatorioScreen({ route, navigation }: any) {
  const { vehiculo } = route.params;
  const [tipo, setTipo] = useState('soat');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [kmLimite, setKmLimite] = useState('');
  const [kmAviso, setKmAviso] = useState('1000');
  const [loading, setLoading] = useState(false);

  async function handleGuardar() {
    const fechaISO = parseFecha(fecha);
    const km = kmLimite ? parseInt(kmLimite) : null;
    const aviso = kmAviso ? parseInt(kmAviso) : 1000;

    if (!fechaISO && !km) {
      Alert.alert('Error', 'Agrega al menos una fecha limite o un kilometraje limite');
      return;
    }
    if (tipo === 'personalizado' && !descripcion.trim()) {
      Alert.alert('Error', 'Escribe una descripcion para el recordatorio personalizado');
      return;
    }
    if (fecha && !fechaISO) {
      Alert.alert('Error', 'Formato de fecha invalido. Usa DD/MM/YYYY');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('recordatorios').insert({
      vehiculo_id: vehiculo.id,
      tipo,
      descripcion: descripcion.trim() || null,
      fecha_limite: fechaISO,
      km_limite: km,
      km_aviso: km ? aviso : null,
    });
    setLoading(false);

    if (error) { Alert.alert('Error', error.message); return; }

    if (fechaISO) {
      const label = tipoSeleccionado?.label ?? tipo;
      const nombre = `${vehiculo.marca} ${vehiculo.modelo}`;
      const fechaNotif = new Date(fechaISO + 'T09:00:00');
      await programarNotificacionFecha(
        `rec-${vehiculo.id}-${tipo}-${fechaISO}`,
        `🔔 ${label} — ${nombre}`,
        `Vence hoy: ${fecha}`,
        fechaNotif
      );
    }

    navigation.goBack();
  }

  const tipoSeleccionado = TIPOS.find(t => t.key === tipo);
  const tieneKmLimite = kmLimite.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>‹ Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nuevo recordatorio</Text>
          <Text style={styles.subtitle}>{vehiculo.marca} {vehiculo.modelo}</Text>
        </View>

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.tiposGrid}>
          {TIPOS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tipoChip, tipo === t.key && styles.tipoChipActive]}
              onPress={() => setTipo(t.key)}
            >
              <Text style={styles.tipoEmoji}>{t.emoji}</Text>
              <Text style={[styles.tipoLabel, tipo === t.key && styles.tipoLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tipo === 'personalizado' ? (
          <>
            <Text style={styles.label}>Descripcion *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Cambio de correa de distribución"
              placeholderTextColor="#555"
              value={descripcion}
              onChangeText={setDescripcion}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Descripcion (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Notas adicionales..."
              placeholderTextColor="#555"
              value={descripcion}
              onChangeText={setDescripcion}
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Cuando alertar</Text>
        <Text style={styles.sectionHint}>Puedes agregar fecha, kilometraje o ambos</Text>

        <Text style={styles.label}>Fecha limite (DD/MM/YYYY)</Text>
        <TextInput
          style={styles.input}
          placeholder="31/12/2025"
          placeholderTextColor="#555"
          value={fecha}
          onChangeText={setFecha}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.label}>Kilometraje limite</Text>
        <TextInput
          style={styles.input}
          placeholder={`Actual: ${vehiculo.kilometraje.toLocaleString()} km`}
          placeholderTextColor="#555"
          value={kmLimite}
          onChangeText={setKmLimite}
          keyboardType="numeric"
        />

        {tieneKmLimite && (
          <>
            <Text style={styles.label}>Avisar con cuántos km de anticipación</Text>
            <View style={styles.avisarRow}>
              {[500, 1000, 2000, 3000].map(op => (
                <TouchableOpacity
                  key={op}
                  style={[styles.avisarChip, kmAviso === String(op) && styles.avisarChipActive]}
                  onPress={() => setKmAviso(String(op))}
                >
                  <Text style={[styles.avisarChipText, kmAviso === String(op) && styles.avisarChipTextActive]}>
                    {op >= 1000 ? `${op / 1000}k` : op} km
                  </Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={[styles.avisarInput, !([500, 1000, 2000, 3000].map(String).includes(kmAviso)) && styles.avisarInputActive]}
                placeholder="Otro"
                placeholderTextColor="#555"
                value={[500, 1000, 2000, 3000].map(String).includes(kmAviso) ? '' : kmAviso}
                onChangeText={v => setKmAviso(v)}
                keyboardType="numeric"
              />
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGuardar}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>
                {tipoSeleccionado?.emoji} Guardar recordatorio
              </Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111318' },
  content: { padding: 24, paddingTop: 56 },
  header: { marginBottom: 28 },
  back: { color: '#e8522a', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  label: { color: '#888', fontSize: 13, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#1c1f27',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2d38',
  },
  tiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tipoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1c1f27',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2a2d38',
  },
  tipoChipActive: { backgroundColor: '#e8522a', borderColor: '#e8522a' },
  tipoEmoji: { fontSize: 16 },
  tipoLabel: { color: '#666', fontSize: 13 },
  tipoLabelActive: { color: '#fff', fontWeight: 'bold' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 28 },
  sectionHint: { color: '#555', fontSize: 12, marginTop: 4 },
  avisarRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  avisarChip: {
    backgroundColor: '#1c1f27',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2a2d38',
  },
  avisarChipActive: { backgroundColor: '#e8522a', borderColor: '#e8522a' },
  avisarChipText: { color: '#666', fontSize: 13 },
  avisarChipTextActive: { color: '#fff', fontWeight: 'bold' },
  avisarInput: {
    backgroundColor: '#1c1f27',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#2a2d38',
    width: 64,
  },
  avisarInputActive: { borderColor: '#e8522a' },
  button: {
    backgroundColor: '#e8522a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
