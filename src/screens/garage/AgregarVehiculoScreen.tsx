import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  ScrollView, KeyboardAvoidingView, Platform, TextInput as TextInputType
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';

const { colors, spacing, radius } = tokens;

const TIPOS = ['moto', 'carro', 'camioneta', 'otro'];
const SUBTIPOS_MOTO = ['naked', 'sport', 'scooter', 'doble proposito', 'otro'];

export default function AgregarVehiculoScreen({ navigation }: any) {
  const { session } = useAuth();
  const [tipo, setTipo] = useState('moto');
  const [subtipo, setSubtipo] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [color, setColor] = useState('');
  const [placa, setPlaca] = useState('');
  const [cilindraje, setCilindraje] = useState('');
  const [kilometraje, setKilometraje] = useState('0');
  const [loading, setLoading] = useState(false);

  const modeloRef = useRef<TextInputType>(null);
  const anioRef = useRef<TextInputType>(null);
  const colorRef = useRef<TextInputType>(null);
  const placaRef = useRef<TextInputType>(null);
  const cilindrajeRef = useRef<TextInputType>(null);
  const kmRef = useRef<TextInputType>(null);

  async function handleGuardar() {
    if (!marca || !modelo || !anio || !placa) {
      Alert.alert('Campos requeridos', 'Completa marca, modelo, año y placa');
      return;
    }
    const anioNum = parseInt(anio);
    if (isNaN(anioNum) || anioNum < 1900 || anioNum > new Date().getFullYear() + 1) {
      Alert.alert('Año inválido', 'Ingresa un año válido');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('vehiculos').insert({
      propietario_id: session?.user.id,
      tipo,
      subtipo: tipo === 'moto' ? subtipo : null,
      marca,
      modelo,
      anio: anioNum,
      color,
      placa: placa.toUpperCase(),
      cilindraje: cilindraje ? parseInt(cilindraje) : null,
      kilometraje: parseInt(kilometraje) || 0,
    });

    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.back}>‹ Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Agregar vehículo</Text>
        </View>

        {/* Tipo */}
        <Text style={styles.label}>Tipo de vehículo</Text>
        <View style={styles.chipRow}>
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

        {/* Subtipo moto */}
        {tipo === 'moto' && (
          <>
            <Text style={styles.label}>Tipo de moto</Text>
            <View style={styles.chipRow}>
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

        {/* Marca */}
        <Text style={styles.label}>Marca *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Yamaha, Honda, Chevrolet"
          placeholderTextColor={colors.textTertiary}
          value={marca}
          onChangeText={setMarca}
          returnKeyType="next"
          onSubmitEditing={() => modeloRef.current?.focus()}
          blurOnSubmit={false}
        />

        {/* Modelo */}
        <Text style={styles.label}>Modelo *</Text>
        <TextInput
          ref={modeloRef}
          style={styles.input}
          placeholder="Ej: MT-07, CB500, Spark"
          placeholderTextColor={colors.textTertiary}
          value={modelo}
          onChangeText={setModelo}
          returnKeyType="next"
          onSubmitEditing={() => anioRef.current?.focus()}
          blurOnSubmit={false}
        />

        {/* Año — campo individual para evitar conflicto de teclado */}
        <Text style={styles.label}>Año *</Text>
        <TextInput
          ref={anioRef}
          style={styles.input}
          placeholder="Ej: 2022"
          placeholderTextColor={colors.textTertiary}
          value={anio}
          onChangeText={setAnio}
          keyboardType="number-pad"
          maxLength={4}
          returnKeyType="next"
          onSubmitEditing={() => colorRef.current?.focus()}
          blurOnSubmit={false}
        />

        {/* Color — campo individual para evitar conflicto de teclado */}
        <Text style={styles.label}>Color</Text>
        <TextInput
          ref={colorRef}
          style={styles.input}
          placeholder="Ej: Negro, Rojo, Blanco"
          placeholderTextColor={colors.textTertiary}
          value={color}
          onChangeText={setColor}
          returnKeyType="next"
          onSubmitEditing={() => placaRef.current?.focus()}
          blurOnSubmit={false}
        />

        {/* Placa y Cilindraje en fila — tipos de teclado iguales (ambos no-numeric o ambos numeric) */}
        <View style={styles.rowInputs}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Placa *</Text>
            <TextInput
              ref={placaRef}
              style={styles.input}
              placeholder="ABC123"
              placeholderTextColor={colors.textTertiary}
              value={placa}
              onChangeText={(t) => setPlaca(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              returnKeyType="next"
              onSubmitEditing={() => cilindrajeRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Cilindraje (cc)</Text>
            <TextInput
              ref={cilindrajeRef}
              style={styles.input}
              placeholder="700"
              placeholderTextColor={colors.textTertiary}
              value={cilindraje}
              onChangeText={setCilindraje}
              keyboardType="number-pad"
              returnKeyType="next"
              onSubmitEditing={() => kmRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
        </View>

        {/* Kilometraje */}
        <Text style={styles.label}>Kilometraje actual</Text>
        <TextInput
          ref={kmRef}
          style={styles.input}
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          value={kilometraje}
          onChangeText={setKilometraje}
          keyboardType="number-pad"
          returnKeyType="done"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGuardar}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.onAccent} />
            : <Text style={styles.buttonText}>Guardar vehículo</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.xl, paddingTop: 56, paddingBottom: 40 },
  header: { marginBottom: spacing.xxl },
  back: { color: colors.accent, fontSize: 16, marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.5 },

  label: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
    marginTop: spacing.lg,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.bgSurface,
    minHeight: 48,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgSurface,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: colors.onAccent, fontWeight: '700' },

  rowInputs: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },

  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.xxl,
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
});
