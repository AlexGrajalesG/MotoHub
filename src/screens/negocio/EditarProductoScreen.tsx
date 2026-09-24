import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { IconArrowLeft, IconCamera, IconX } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import {
  uploadFotoProducto, crearProducto, actualizarProducto, type Producto,
} from '../../lib/productos';

const { colors, fonts, spacing, radius } = tokens;

const COMPATIBLE_OPCIONES = [
  { key: 'motos',  label: 'Motos'  },
  { key: 'carros', label: 'Carros' },
];

export default function EditarProductoScreen({ route, navigation }: any) {
  const { negocioId, producto } = route.params as { negocioId: string; producto?: Producto };
  const esEdicion = !!producto;

  const [nombre, setNombre] = useState(producto?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? '');
  const [precio, setPrecio] = useState(producto?.precio?.toString() ?? '');
  const [stock, setStock] = useState(producto?.stock?.toString() ?? '0');
  const [compatibleCon, setCompatibleCon] = useState<string[]>(producto?.compatible_con ?? ['motos', 'carros']);
  const [fotosExistentes, setFotosExistentes] = useState<string[]>(producto?.fotos ?? []);
  const [fotosNuevas, setFotosNuevas] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const totalFotos = fotosExistentes.length + fotosNuevas.length;

  async function pickFoto() {
    if (totalFotos >= 3) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) setFotosNuevas(prev => [...prev, result.assets[0].uri]);
  }

  function removeFotoExistente(idx: number) {
    setFotosExistentes(prev => prev.filter((_, i) => i !== idx));
  }
  function removeFotoNueva(idx: number) {
    setFotosNuevas(prev => prev.filter((_, i) => i !== idx));
  }

  function toggleCompatible(key: string) {
    setCompatibleCon(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  async function handleGuardar() {
    if (!nombre.trim()) { Alert.alert('Falta el nombre', 'Ingresa el nombre del producto'); return; }
    const precioNum = parseFloat(precio.replace(/[.,]/g, ''));
    if (!precio.trim() || isNaN(precioNum) || precioNum <= 0) { Alert.alert('Precio inválido', 'Ingresa un precio válido'); return; }
    const stockNum = parseInt(stock) || 0;

    setGuardando(true);
    try {
      const nuevasUrls: string[] = [];
      for (const uri of fotosNuevas) {
        const url = await uploadFotoProducto(uri, negocioId);
        if (url) nuevasUrls.push(url);
      }
      const fotos = [...fotosExistentes, ...nuevasUrls];

      if (esEdicion) {
        const { error } = await actualizarProducto(producto!.id, {
          nombre: nombre.trim(), descripcion: descripcion.trim() || null,
          precio: precioNum, stock: stockNum, fotos, compatible_con: compatibleCon,
        });
        if (error) throw error;
      } else {
        const { error } = await crearProducto({
          negocio_id: negocioId, nombre: nombre.trim(), descripcion: descripcion.trim() || null,
          precio: precioNum, stock: stockNum, fotos, compatible_con: compatibleCon,
        });
        if (error) throw error;
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar el producto');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <IconArrowLeft size={22} color={colors.accent} />
          <Text style={s.backText}>Cancelar</Text>
        </Pressable>
        <Text style={s.title}>{esEdicion ? 'Editar producto' : 'Nuevo producto'}</Text>
        <Pressable style={[s.guardarHeaderBtn, guardando && s.guardarHeaderDisabled]} onPress={handleGuardar} disabled={guardando}>
          {guardando ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={s.guardarHeaderText}>Guardar</Text>}
        </Pressable>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.fieldLabel}>Nombre</Text>
        <TextInput style={s.input} placeholder="Ej: Casco integral talla M" placeholderTextColor={colors.textTertiary} value={nombre} onChangeText={setNombre} />

        <Text style={s.fieldLabel}>Descripción</Text>
        <TextInput
          style={[s.input, s.inputMultiline]} placeholder="Detalles del producto…" placeholderTextColor={colors.textTertiary}
          value={descripcion} onChangeText={setDescripcion} multiline numberOfLines={3} textAlignVertical="top"
        />

        <View style={s.rowTwo}>
          <View style={s.rowItem}>
            <Text style={s.fieldLabel}>Precio (COP)</Text>
            <TextInput style={s.input} placeholder="Ej: 85000" placeholderTextColor={colors.textTertiary} value={precio} onChangeText={setPrecio} keyboardType="decimal-pad" />
          </View>
          <View style={s.rowItem}>
            <Text style={s.fieldLabel}>Stock</Text>
            <TextInput style={s.input} placeholder="Ej: 10" placeholderTextColor={colors.textTertiary} value={stock} onChangeText={setStock} keyboardType="number-pad" />
          </View>
        </View>

        <Text style={s.fieldLabel}>Compatible con</Text>
        <View style={s.chipRow}>
          {COMPATIBLE_OPCIONES.map(o => (
            <Pressable key={o.key} style={[s.chip, compatibleCon.includes(o.key) && s.chipActive]} onPress={() => toggleCompatible(o.key)}>
              <Text style={[s.chipLabel, compatibleCon.includes(o.key) && s.chipLabelActive]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.sectionLabel, { marginTop: spacing.xl }]}>Fotos</Text>
        <Text style={s.fotosHint}>Hasta 3 fotos</Text>
        <View style={s.fotosRow}>
          {fotosExistentes.map((uri, idx) => (
            <View key={'ex' + idx} style={s.fotoSlot}>
              <Image source={{ uri }} style={s.fotoThumb} resizeMode="cover" />
              <Pressable style={s.fotoRemove} onPress={() => removeFotoExistente(idx)} hitSlop={10} accessibilityLabel="Quitar foto"><IconX size={14} color="#fff" /></Pressable>
            </View>
          ))}
          {fotosNuevas.map((uri, idx) => (
            <View key={'nu' + idx} style={s.fotoSlot}>
              <Image source={{ uri }} style={s.fotoThumb} resizeMode="cover" />
              <Pressable style={s.fotoRemove} onPress={() => removeFotoNueva(idx)} hitSlop={10} accessibilityLabel="Quitar foto"><IconX size={14} color="#fff" /></Pressable>
            </View>
          ))}
          {totalFotos < 3 && (
            <Pressable style={s.fotoAdd} onPress={pickFoto}>
              <IconCamera size={24} color={colors.textSecondary} />
              <Text style={s.fotoAddText}>Agregar</Text>
            </Pressable>
          )}
        </View>

        <Pressable style={[s.guardarBtn, guardando && s.guardarBtnDisabled]} onPress={handleGuardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.guardarBtnText}>Guardar producto</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.bgSurface,
  },
  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 80 },
  backText: { color: colors.accent, fontSize: 15, fontFamily: fonts.heading },
  title:    { color: colors.textPrimary, fontSize: 17, fontFamily: fonts.bold },

  guardarHeaderBtn:      { minWidth: 80, alignItems: 'flex-end' },
  guardarHeaderDisabled: { opacity: 0.4 },
  guardarHeaderText:     { color: colors.accent, fontSize: 15, fontFamily: fonts.heading },

  scroll: { flex: 1 },
  form:   { padding: spacing.xl, gap: spacing.sm, paddingBottom: 60 },

  sectionLabel: {
    color: colors.textSecondary, fontSize: 11, fontFamily: fonts.heading,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  fieldLabel: {
    color: colors.textSecondary, fontSize: 11, fontFamily: fonts.heading,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.md, marginBottom: 4,
  },

  input: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    color: colors.textPrimary, fontSize: 15, fontFamily: fonts.body,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  inputMultiline: { minHeight: 80, paddingTop: 13 },

  rowTwo:  { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },

  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    paddingVertical: 10, paddingHorizontal: spacing.md,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: 'rgba(72,151,90,0.12)' },
  chipLabel: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.body },
  chipLabelActive: { color: colors.accent, fontFamily: fonts.heading },

  fotosHint: { color: colors.textTertiary, fontSize: 12, fontFamily: fonts.body, marginTop: -spacing.sm, marginBottom: spacing.sm },
  fotosRow:  { flexDirection: 'row', gap: spacing.md },
  fotoSlot:  { position: 'relative' },
  fotoThumb: { width: 88, height: 88, borderRadius: radius.md },
  fotoRemove: {
    position: 'absolute', top: -6, right: -6, backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 999, width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
  },
  fotoAdd: {
    width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  fotoAddText: { color: colors.textTertiary, fontSize: 11, fontFamily: fonts.body },

  guardarBtn: { backgroundColor: colors.accent, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: spacing.xl },
  guardarBtnDisabled: { opacity: 0.5 },
  guardarBtnText: { color: colors.onAccent, fontFamily: fonts.bold, fontSize: 16 },
});
