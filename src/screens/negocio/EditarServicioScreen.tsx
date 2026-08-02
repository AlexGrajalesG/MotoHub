import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  IconArrowLeft, IconBike, IconCar, IconTrash,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

type TipoPrecio = 'fijo' | 'desde' | 'cotizar';

type Servicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  aplica_a: string[];
  duracion_minutos: number | null;
  tipo_precio: TipoPrecio;
  precio_base: number | null;
  activo: boolean;
};

const CATEGORIAS: { value: string; label: string }[] = [
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'reparacion',    label: 'Reparación' },
  { value: 'diagnostico',   label: 'Diagnóstico' },
  { value: 'estetico',      label: 'Estética' },
];

const TIPOS_PRECIO: { value: TipoPrecio; label: string; help: string }[] = [
  { value: 'fijo',    label: 'Precio fijo',        help: 'El cliente paga este valor por la mano de obra del servicio.' },
  { value: 'desde',   label: 'Desde + repuestos',  help: 'El cliente paga este valor de mano de obra más el costo de los repuestos usados.' },
  { value: 'cotizar', label: 'A cotizar',          help: 'No se muestra precio. Acuerdas el valor con el cliente al revisar el caso.' },
];

export default function EditarServicioScreen({ route, navigation }: any) {
  const { negocioId, servicio } = route.params as { negocioId: string; servicio: Servicio | null };
  const editando = servicio != null;

  const [nombre,      setNombre]      = useState(servicio?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(servicio?.descripcion ?? '');
  const [categoria,   setCategoria]   = useState(servicio?.categoria ?? 'mantenimiento');
  const [aplicaA,     setAplicaA]     = useState<string[]>(servicio?.aplica_a ?? ['motos', 'carros']);
  const [duracion,    setDuracion]    = useState(servicio?.duracion_minutos?.toString() ?? '');
  const [tipoPrecio,  setTipoPrecio]  = useState<TipoPrecio>(servicio?.tipo_precio ?? 'fijo');
  const [precio,      setPrecio]      = useState(servicio?.precio_base?.toString() ?? '');
  const [guardando,   setGuardando]   = useState(false);
  const [eliminando,  setEliminando]  = useState(false);

  function toggleAplicaA(v: string) {
    setAplicaA(prev => prev.includes(v) ? prev.filter(a => a !== v) : [...prev, v]);
  }

  async function handleGuardar() {
    if (!nombre.trim()) {
      Alert.alert('Falta el nombre', 'Ingresa el nombre del servicio');
      return;
    }
    if (aplicaA.length === 0) {
      Alert.alert('Selecciona al menos uno', '¿A qué aplica este servicio: motos, carros o ambos?');
      return;
    }
    let precioNum: number | null = null;
    if (tipoPrecio !== 'cotizar') {
      precioNum = parseFloat(precio.replace(/[.,]/g, ''));
      if (!precio || isNaN(precioNum) || precioNum <= 0) {
        Alert.alert('Precio inválido', tipoPrecio === 'desde' ? 'Ingresa el valor "desde"' : 'Ingresa un precio válido');
        return;
      }
    }

    const payload = {
      nombre:           nombre.trim(),
      descripcion:      descripcion.trim() || null,
      categoria,
      aplica_a:         aplicaA,
      duracion_minutos: duracion ? parseInt(duracion) : null,
      tipo_precio:      tipoPrecio,
      precio_base:      precioNum,
    };

    setGuardando(true);
    const { error } = editando
      ? await supabase.from('servicios').update(payload).eq('id', servicio!.id)
      : await supabase.from('servicios').insert({ ...payload, negocio_id: negocioId, activo: true });
    setGuardando(false);

    if (error) { Alert.alert('Error', error.message); return; }
    navigation.goBack();
  }

  function handleEliminar() {
    Alert.alert(
      'Eliminar servicio',
      `¿Seguro que quieres eliminar "${servicio!.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            setEliminando(true);
            const { error } = await supabase.from('servicios').delete().eq('id', servicio!.id);
            setEliminando(false);
            if (error) { Alert.alert('Error', error.message); return; }
            navigation.goBack();
          },
        },
      ]
    );
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
        <Text style={s.headerTitle}>{editando ? 'Editar servicio' : 'Nuevo servicio'}</Text>
        {editando && (
          <Pressable
            style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.7 }]}
            onPress={handleEliminar}
            disabled={eliminando}
            hitSlop={8}
            accessibilityLabel="Eliminar servicio"
          >
            {eliminando
              ? <ActivityIndicator size="small" color={colors.dangerAction} />
              : <IconTrash size={18} color={colors.dangerAction} />
            }
          </Pressable>
        )}
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
              placeholder="Ej: Cambio de aceite y filtro"
              placeholderTextColor={colors.textTertiary}
              value={nombre}
              onChangeText={setNombre}
            />
          </View>
        </View>

        {/* Categoría */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Categoría</Text>
          <View style={s.chips}>
            {CATEGORIAS.map(c => (
              <Pressable
                key={c.value}
                style={[s.chip, categoria === c.value && s.chipOn]}
                onPress={() => setCategoria(c.value)}
              >
                <Text style={[s.chipText, categoria === c.value && s.chipTextOn]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Aplica a */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Aplica a</Text>
          <View style={s.chips}>
            <Pressable
              style={[s.chip, aplicaA.includes('motos') && s.chipOn]}
              onPress={() => toggleAplicaA('motos')}
            >
              <IconBike size={13} color={aplicaA.includes('motos') ? '#fff' : colors.textSecondary} />
              <Text style={[s.chipText, aplicaA.includes('motos') && s.chipTextOn]}>Motos</Text>
            </Pressable>
            <Pressable
              style={[s.chip, aplicaA.includes('carros') && s.chipOn]}
              onPress={() => toggleAplicaA('carros')}
            >
              <IconCar size={13} color={aplicaA.includes('carros') ? '#fff' : colors.textSecondary} />
              <Text style={[s.chipText, aplicaA.includes('carros') && s.chipTextOn]}>Carros</Text>
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
              placeholder="Detalles del servicio..."
              placeholderTextColor={colors.textTertiary}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Tipo de precio */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Tipo de precio</Text>
          <View style={s.chips}>
            {TIPOS_PRECIO.map(t => (
              <Pressable
                key={t.value}
                style={[s.chip, tipoPrecio === t.value && s.chipOn]}
                onPress={() => setTipoPrecio(t.value)}
              >
                <Text style={[s.chipText, tipoPrecio === t.value && s.chipTextOn]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.helpText}>
            {TIPOS_PRECIO.find(t => t.value === tipoPrecio)?.help}
          </Text>
        </View>

        {/* Duración y precio */}
        <View style={s.row}>
          <View style={[s.section, { flex: 1 }]}>
            <Text style={s.sectionLabel}>
              Duración (min) <Text style={s.optional}>(opcional)</Text>
            </Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                placeholder="30"
                placeholderTextColor={colors.textTertiary}
                value={duracion}
                onChangeText={setDuracion}
                keyboardType="number-pad"
              />
            </View>
          </View>
          {tipoPrecio !== 'cotizar' && (
            <View style={[s.section, { flex: 1 }]}>
              <Text style={s.sectionLabel}>{tipoPrecio === 'desde' ? 'Desde *' : 'Precio *'}</Text>
              <View style={s.inputRow}>
                <Text style={s.currency}>$</Text>
                <TextInput
                  style={s.input}
                  placeholder="55000"
                  placeholderTextColor={colors.textTertiary}
                  value={precio}
                  onChangeText={setPrecio}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          )}
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
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.sendBtnText}>{editando ? 'Guardar cambios' : 'Agregar servicio'}</Text>
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
  headerTitle: { flex: 1, fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 },
  deleteBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.dangerActionBg,
    justifyContent: 'center', alignItems: 'center',
  },

  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 48 },

  section:      { marginBottom: spacing.xl },
  sectionLabel: { fontFamily: fonts.heading, fontSize: 13, color: colors.textPrimary, marginBottom: spacing.sm },
  optional:     { fontFamily: fonts.body, color: colors.textTertiary },

  row: { flexDirection: 'row', gap: spacing.md },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, paddingVertical: 8, minHeight: 36,
  },
  chipOn:     { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText:   { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  chipTextOn: { color: '#fff' },
  helpText: {
    fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary,
    marginTop: spacing.sm, lineHeight: 17,
  },

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
  currency: { fontFamily: fonts.body, fontSize: 15, color: colors.textTertiary },

  sendBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    paddingVertical: spacing.lg, alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.sm, minHeight: 54,
  },
  sendBtnOff:  { opacity: 0.45 },
  sendBtnText: { fontFamily: fonts.bold, fontSize: 16, color: '#fff' },
});
