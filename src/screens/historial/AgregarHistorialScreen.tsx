import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { supabase } from '../../lib/supabase';

const TIPOS = [
  { key: 'aceite',           label: 'Aceite',      emoji: '🛢️' },
  { key: 'frenos',           label: 'Frenos',      emoji: '⛔' },
  { key: 'cadena',           label: 'Cadena',      emoji: '⛓️' },
  { key: 'llantas',          label: 'Llantas',     emoji: '🔴' },
  { key: 'bateria',          label: 'Bateria',     emoji: '🔋' },
  { key: 'revision_tecnica', label: 'Rev. Tecnica',emoji: '🔧' },
  { key: 'soat',             label: 'SOAT',        emoji: '🛡️' },
  { key: 'lavado',           label: 'Lavado',      emoji: '🚿' },
  { key: 'personalizado',    label: 'Otro',        emoji: '📌' },
];

function hoyISO(): string {
  return new Date().toISOString().split('T')[0];
}

function hoyDisplay(): string {
  const [y, m, d] = hoyISO().split('-');
  return `${d}/${m}/${y}`;
}

function displayToISO(display: string): string | null {
  const parts = display.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (d.length !== 2 || m.length !== 2 || y.length !== 4) return null;
  return `${y}-${m}-${d}`;
}

export default function AgregarHistorialScreen({ route, navigation }: any) {
  const { vehiculo } = route.params;

  const [tipo, setTipo] = useState('aceite');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(hoyDisplay());
  const [km, setKm] = useState(String(vehiculo.kilometraje ?? ''));
  const [taller, setTaller] = useState('');
  const [costo, setCosto] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    const fechaISO = displayToISO(fecha);
    if (!fechaISO) {
      Alert.alert('Fecha invalida', 'Ingresa la fecha en formato DD/MM/AAAA');
      return;
    }

    setGuardando(true);
    try {
      const { error } = await supabase.from('historial_mantenimiento').insert({
        vehiculo_id: vehiculo.id,
        tipo,
        descripcion: descripcion.trim() || null,
        fecha: fechaISO,
        km_en_servicio: km ? parseInt(km) : null,
        taller: taller.trim() || null,
        costo: costo ? parseFloat(costo) : null,
        notas: notas.trim() || null,
      });

      if (error) throw error;
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar el registro');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nuevo registro</Text>
        <Text style={styles.subtitle}>{vehiculo.marca} {vehiculo.modelo}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Tipo de mantenimiento</Text>
        <View style={styles.tiposGrid}>
          {TIPOS.map(t => (
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

        {tipo === 'personalizado' && (
          <>
            <Text style={styles.label}>Descripcion</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Revisión de suspensión"
              placeholderTextColor="#444"
              value={descripcion}
              onChangeText={setDescripcion}
            />
          </>
        )}

        <Text style={styles.label}>Fecha</Text>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#444"
          value={fecha}
          onChangeText={setFecha}
          keyboardType="numeric"
          maxLength={10}
        />

        <Text style={styles.label}>Kilometraje al momento del servicio</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 15000"
          placeholderTextColor="#444"
          value={km}
          onChangeText={setKm}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Taller o lugar (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Taller El Parche"
          placeholderTextColor="#444"
          value={taller}
          onChangeText={setTaller}
        />

        <Text style={styles.label}>Costo (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 85000"
          placeholderTextColor="#444"
          value={costo}
          onChangeText={setCosto}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Observaciones, piezas cambiadas, etc."
          placeholderTextColor="#444"
          value={notas}
          onChangeText={setNotas}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.guardarBtn, guardando && styles.guardarBtnDisabled]}
          onPress={handleGuardar}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.guardarBtnText}>Guardar registro</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111318' },
  header: { padding: 24, paddingTop: 56 },
  back: { color: '#e8522a', fontSize: 16, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  scroll: { flex: 1 },
  form: { padding: 16, gap: 6, paddingBottom: 48 },
  label: { color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  tiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  tipoChip: {
    backgroundColor: '#1c1f27',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2d38',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 80,
  },
  tipoChipActive: {
    borderColor: '#e8522a',
    backgroundColor: '#2a1a12',
  },
  tipoEmoji: { fontSize: 22, marginBottom: 4 },
  tipoLabel: { color: '#888', fontSize: 11 },
  tipoLabelActive: { color: '#e8522a' },
  input: {
    backgroundColor: '#1c1f27',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2d38',
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  inputMultiline: { minHeight: 80, paddingTop: 14 },
  guardarBtn: {
    backgroundColor: '#e8522a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  guardarBtnDisabled: { opacity: 0.5 },
  guardarBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
