import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from '../../lib/supabase';

const TIPOS = ['moto', 'carro', 'camioneta', 'otro'];
const SUBTIPOS_MOTO = ['naked', 'sport', 'scooter', 'doble proposito', 'otro'];

export default function EditarVehiculoScreen({ route, navigation }: any) {
  const { vehiculo } = route.params;

  const [tipo, setTipo] = useState(vehiculo.tipo ?? 'moto');
  const [subtipo, setSubtipo] = useState('');
  const [marca, setMarca] = useState(vehiculo.marca ?? '');
  const [modelo, setModelo] = useState(vehiculo.modelo ?? '');
  const [anio, setAnio] = useState(String(vehiculo.anio ?? ''));
  const [color, setColor] = useState('');
  const [placa, setPlaca] = useState(vehiculo.placa ?? '');
  const [cilindraje, setCilindraje] = useState('');
  const [kilometraje, setKilometraje] = useState(String(vehiculo.kilometraje ?? '0'));
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('id', vehiculo.id)
      .single();

    if (data) {
      setTipo(data.tipo ?? 'moto');
      setSubtipo(data.subtipo ?? '');
      setMarca(data.marca ?? '');
      setModelo(data.modelo ?? '');
      setAnio(String(data.anio ?? ''));
      setColor(data.color ?? '');
      setPlaca(data.placa ?? '');
      setCilindraje(data.cilindraje ? String(data.cilindraje) : '');
      setKilometraje(String(data.kilometraje ?? '0'));
    }
    setCargando(false);
  }

  async function handleGuardar() {
    if (!marca || !modelo || !anio || !placa) {
      Alert.alert('Error', 'Marca, modelo, año y placa son obligatorios');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('vehiculos')
      .update({
        tipo,
        subtipo: tipo === 'moto' ? subtipo : null,
        marca: marca.trim(),
        modelo: modelo.trim(),
        anio: parseInt(anio),
        color: color.trim(),
        placa: placa.toUpperCase().trim(),
        cilindraje: cilindraje ? parseInt(cilindraje) : null,
        kilometraje: parseInt(kilometraje) || 0,
      })
      .eq('id', vehiculo.id);

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    navigation.goBack();
  }

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e8522a" size="large" />
      </View>
    );
  }

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
          <Text style={styles.title}>Editar vehiculo</Text>
        </View>

        <Text style={styles.label}>Tipo de vehiculo</Text>
        <View style={styles.row}>
          {TIPOS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, tipo === t && styles.chipActive]}
              onPress={() => setTipo(t)}
            >
              <Text style={[styles.chipText, tipo === t && styles.chipTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tipo === 'moto' && (
          <>
            <Text style={styles.label}>Tipo de moto</Text>
            <View style={styles.row}>
              {SUBTIPOS_MOTO.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, subtipo === s && styles.chipActive]}
                  onPress={() => setSubtipo(s)}
                >
                  <Text style={[styles.chipText, subtipo === s && styles.chipTextActive]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Marca *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Yamaha, Honda, Chevrolet"
          placeholderTextColor="#666"
          value={marca}
          onChangeText={setMarca}
        />

        <Text style={styles.label}>Modelo *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: MT-07, CB500, Spark"
          placeholderTextColor="#666"
          value={modelo}
          onChangeText={setModelo}
        />

        <View style={styles.rowInputs}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Año *</Text>
            <TextInput
              style={styles.input}
              placeholder="2022"
              placeholderTextColor="#666"
              value={anio}
              onChangeText={setAnio}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Color</Text>
            <TextInput
              style={styles.input}
              placeholder="Negro"
              placeholderTextColor="#666"
              value={color}
              onChangeText={setColor}
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Placa *</Text>
            <TextInput
              style={styles.input}
              placeholder="ABC123"
              placeholderTextColor="#666"
              value={placa}
              onChangeText={(t) => setPlaca(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Cilindraje (cc)</Text>
            <TextInput
              style={styles.input}
              placeholder="700"
              placeholderTextColor="#666"
              value={cilindraje}
              onChangeText={setCilindraje}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.label}>Kilometraje actual</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#666"
          value={kilometraje}
          onChangeText={setKilometraje}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGuardar}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Guardar cambios</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111318' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111318' },
  content: { padding: 24, paddingTop: 56 },
  header: { marginBottom: 32 },
  back: { color: '#e8522a', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowInputs: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  chip: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1c1f27',
    borderWidth: 1,
    borderColor: '#2a2d38',
  },
  chipActive: { backgroundColor: '#e8522a', borderColor: '#e8522a' },
  chipText: { color: '#666', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
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
