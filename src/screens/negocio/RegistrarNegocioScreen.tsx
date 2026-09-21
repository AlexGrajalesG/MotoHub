import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { IconArrowLeft, IconBike, IconCar } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useModo } from '../../context/ModoContext';
import { tokens } from '../../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

const TIPOS: { value: 'taller' | 'tienda' | 'concesionario' | 'mixto'; label: string }[] = [
  { value: 'taller',        label: 'Taller' },
  { value: 'tienda',        label: 'Tienda' },
  { value: 'concesionario', label: 'Concesionario' },
  { value: 'mixto',         label: 'Mixto' },
];

export default function RegistrarNegocioScreen({ navigation }: any) {
  const { session } = useAuth();
  const { refreshTieneNegocio } = useModo();

  const [nombre,      setNombre]      = useState('');
  const [tipo,        setTipo]        = useState<'taller' | 'tienda' | 'concesionario' | 'mixto'>('taller');
  const [descripcion, setDescripcion] = useState('');
  const [direccion,   setDireccion]   = useState('');
  const [ciudad,      setCiudad]      = useState('');
  const [telefono,    setTelefono]    = useState('');
  const [atiende,     setAtiende]     = useState<string[]>(['motos', 'carros']);
  const [guardando,   setGuardando]   = useState(false);

  function toggleAtiende(v: string) {
    setAtiende(prev =>
      prev.includes(v)
        ? prev.filter(a => a !== v)
        : [...prev, v]
    );
  }

  async function handleGuardar() {
    if (!nombre.trim()) {
      Alert.alert('Falta el nombre', 'Ingresa el nombre de tu taller o negocio');
      return;
    }
    if (atiende.length === 0) {
      Alert.alert('Selecciona al menos uno', '¿A qué atiende tu negocio: motos, carros o ambos?');
      return;
    }

    setGuardando(true);
    try {
      const { error: insertError } = await supabase.from('negocios').insert({
        propietario_id: session!.user.id,
        nombre:         nombre.trim(),
        tipo,
        descripcion:    descripcion.trim() || null,
        direccion:      direccion.trim() || null,
        ciudad:         ciudad.trim() || null,
        telefono:       telefono.trim() || null,
        atiende,
        activo:         true,
      });
      if (insertError) throw insertError;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('roles')
        .eq('id', session!.user.id)
        .maybeSingle();

      const roles: string[] = usuario?.roles ?? [];
      if (!roles.includes('negocio')) {
        await supabase.from('usuarios').update({ roles: [...roles, 'negocio'] }).eq('id', session!.user.id);
      }

      await refreshTieneNegocio();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo registrar el negocio');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Registrar mi taller</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nombre */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Nombre *</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Ej: MotoExpress Servicio"
              placeholderTextColor={colors.textTertiary}
              value={nombre}
              onChangeText={setNombre}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Tipo */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Tipo de negocio</Text>
          <View style={s.chips}>
            {TIPOS.map(t => (
              <Pressable
                key={t.value}
                style={[s.chip, tipo === t.value && s.chipOn]}
                onPress={() => setTipo(t.value)}
              >
                <Text style={[s.chipText, tipo === t.value && s.chipTextOn]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Atiende */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Atiende</Text>
          <View style={s.chips}>
            <Pressable
              style={[s.chip, atiende.includes('motos') && s.chipOn]}
              onPress={() => toggleAtiende('motos')}
            >
              <IconBike size={13} color={atiende.includes('motos') ? colors.onAccent : colors.textSecondary} />
              <Text style={[s.chipText, atiende.includes('motos') && s.chipTextOn]}>Motos</Text>
            </Pressable>
            <Pressable
              style={[s.chip, atiende.includes('carros') && s.chipOn]}
              onPress={() => toggleAtiende('carros')}
            >
              <IconCar size={13} color={atiende.includes('carros') ? colors.onAccent : colors.textSecondary} />
              <Text style={[s.chipText, atiende.includes('carros') && s.chipTextOn]}>Carros</Text>
            </Pressable>
          </View>
        </View>

        {/* Descripción */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>
            Descripción <Text style={s.optional}>(opcional)</Text>
          </Text>
          <View style={[s.inputRow, s.textareaWrap]}>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="Cuéntales a tus clientes qué ofreces, experiencia, especialidades..."
              placeholderTextColor={colors.textTertiary}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Dirección */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>
            Dirección <Text style={s.optional}>(opcional)</Text>
          </Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Ej: Carrera 27 #45-12"
              placeholderTextColor={colors.textTertiary}
              value={direccion}
              onChangeText={setDireccion}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Ciudad */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>
            Ciudad <Text style={s.optional}>(opcional)</Text>
          </Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Ej: Bucaramanga"
              placeholderTextColor={colors.textTertiary}
              value={ciudad}
              onChangeText={setCiudad}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Teléfono */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>
            Teléfono <Text style={s.optional}>(opcional)</Text>
          </Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="3151234567"
              placeholderTextColor={colors.textTertiary}
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
              returnKeyType="done"
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            s.sendBtn,
            (!nombre.trim() || guardando) && s.sendBtnOff,
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleGuardar}
          disabled={!nombre.trim() || guardando}
        >
          {guardando
            ? <ActivityIndicator color={colors.onAccent} size="small" />
            : <Text style={s.sendBtnText}>Registrar taller</Text>
          }
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 },

  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 48 },

  section:      { marginBottom: spacing.xl },
  sectionLabel: { fontFamily: fonts.heading, fontSize: 13, color: colors.textPrimary, marginBottom: spacing.sm },
  optional:     { fontFamily: fonts.body, color: colors.textTertiary },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, paddingVertical: 8, minHeight: 36,
  },
  chipOn:     { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText:   { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  chipTextOn: { color: colors.onAccent },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, minHeight: 50,
  },
  textareaWrap: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  input: {
    flex: 1, fontFamily: fonts.body, fontSize: 15,
    color: colors.textPrimary, paddingVertical: 0,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  sendBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    paddingVertical: spacing.lg, alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.sm, minHeight: 54,
  },
  sendBtnOff:  { opacity: 0.45 },
  sendBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
});
