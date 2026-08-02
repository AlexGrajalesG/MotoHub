import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { IconArrowLeft, IconCamera, IconX, IconFileText } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import { TIPO_LABEL } from '../../lib/historial';
import { uploadAdjuntoCita, registrarServicioPendiente } from '../../lib/mensajesCita';

const { colors, fonts, spacing, radius } = tokens;

const TIPOS = Object.keys(TIPO_LABEL).filter(k => k !== 'personalizado').concat('personalizado');

function hoyISO(): string {
  return new Date().toISOString().split('T')[0];
}

export default function RegistrarServicioScreen({ route, navigation }: any) {
  const { citaId, vehiculoId, creadoPor = 'negocio' } = route.params as { citaId: string; vehiculoId: string; creadoPor?: 'negocio' | 'mecanico' };

  const [tipo, setTipo] = useState('aceite');
  const [descripcion, setDescripcion] = useState('');
  const [fecha] = useState(hoyISO());
  const [km, setKm] = useState('');
  const [costo, setCosto] = useState('');
  const [notas, setNotas] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [facturaUri, setFacturaUri] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    supabase.from('vehiculos').select('kilometraje').eq('id', vehiculoId).single()
      .then(({ data }) => { if (data?.kilometraje) setKm(String(data.kilometraje)); });
  }, [vehiculoId]);

  async function pickFoto() {
    if (fotos.length >= 3) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets[0]) setFotos(prev => [...prev, result.assets[0].uri]);
  }

  function removeFoto(index: number) {
    setFotos(prev => prev.filter((_, i) => i !== index));
  }

  async function pickFactura() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (!result.canceled && result.assets[0]) setFacturaUri(result.assets[0].uri);
  }

  async function handleGuardar() {
    setGuardando(true);
    try {
      const fotosUrls: string[] = [];
      for (const uri of fotos) {
        const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
        const url = await uploadAdjuntoCita(uri, citaId, safeExt);
        if (url) fotosUrls.push(url);
      }

      let facturaUrl: string | null = null;
      if (facturaUri) {
        const ext = facturaUri.split('.').pop()?.toLowerCase() ?? 'pdf';
        facturaUrl = await uploadAdjuntoCita(facturaUri, citaId, ext);
      }

      const { error } = await registrarServicioPendiente({
        cita_id: citaId,
        vehiculo_id: vehiculoId,
        tipo,
        descripcion: tipo === 'personalizado' ? (descripcion.trim() || null) : null,
        fecha,
        km_en_servicio: km ? parseInt(km) : null,
        costo: costo ? parseFloat(costo) : null,
        notas: notas.trim() || null,
        fotos: fotosUrls,
        factura_url: facturaUrl,
        creado_por: creadoPor,
      });
      if (error) throw error;

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo registrar el servicio');
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
        <Text style={s.title}>Registrar servicio</Text>
        <Pressable style={[s.guardarHeaderBtn, guardando && s.guardarHeaderDisabled]} onPress={handleGuardar} disabled={guardando}>
          {guardando ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={s.guardarHeaderText}>Enviar</Text>}
        </Pressable>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.note}>El cliente verá este registro en el chat y debe aceptarlo para que entre a su historial.</Text>

        <Text style={s.sectionLabel}>Tipo de mantenimiento</Text>
        <View style={s.tiposGrid}>
          {TIPOS.map(t => (
            <Pressable key={t} style={[s.tipoChip, tipo === t && s.tipoChipActive]} onPress={() => setTipo(t)}>
              <Text style={[s.tipoLabel, tipo === t && s.tipoLabelActive]}>{TIPO_LABEL[t]}</Text>
            </Pressable>
          ))}
        </View>

        {tipo === 'personalizado' && (
          <>
            <Text style={s.fieldLabel}>Descripción</Text>
            <TextInput style={s.input} placeholder="Ej: Revisión de suspensión" placeholderTextColor={colors.textTertiary} value={descripcion} onChangeText={setDescripcion} />
          </>
        )}

        <View style={s.rowTwo}>
          <View style={s.rowItem}>
            <Text style={s.fieldLabel}>Km al servicio</Text>
            <TextInput style={s.input} placeholder="Ej: 15000" placeholderTextColor={colors.textTertiary} value={km} onChangeText={setKm} keyboardType="numeric" />
          </View>
          <View style={s.rowItem}>
            <Text style={s.fieldLabel}>Costo (COP)</Text>
            <TextInput style={s.input} placeholder="Ej: 85000" placeholderTextColor={colors.textTertiary} value={costo} onChangeText={setCosto} keyboardType="decimal-pad" />
          </View>
        </View>

        <Text style={[s.sectionLabel, { marginTop: spacing.xl }]}>Fotos</Text>
        <View style={s.fotosRow}>
          {fotos.map((uri, idx) => (
            <View key={uri + idx} style={s.fotoSlot}>
              <Image source={{ uri }} style={s.fotoThumb} resizeMode="cover" />
              <Pressable style={s.fotoRemove} onPress={() => removeFoto(idx)} hitSlop={10} accessibilityLabel="Quitar foto">
                <IconX size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
          {fotos.length < 3 && (
            <Pressable style={s.fotoAdd} onPress={pickFoto}>
              <IconCamera size={24} color={colors.textSecondary} />
              <Text style={s.fotoAddText}>Agregar</Text>
            </Pressable>
          )}
        </View>

        <Text style={s.fieldLabel}>Factura</Text>
        {facturaUri ? (
          <View style={s.facturaRow}>
            <IconFileText size={18} color={colors.accent} />
            <Text style={s.facturaText} numberOfLines={1}>Factura adjunta</Text>
            <Pressable onPress={() => setFacturaUri(null)} hitSlop={10} accessibilityLabel="Quitar factura">
              <IconX size={16} color={colors.textTertiary} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={s.facturaBtn} onPress={pickFactura}>
            <IconFileText size={18} color={colors.textSecondary} />
            <Text style={s.facturaBtnText}>Adjuntar factura (PDF o imagen)</Text>
          </Pressable>
        )}

        <Text style={s.fieldLabel}>Notas</Text>
        <TextInput
          style={[s.input, s.inputMultiline]}
          placeholder="Detalles del servicio realizado…"
          placeholderTextColor={colors.textTertiary}
          value={notas}
          onChangeText={setNotas}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Pressable style={[s.guardarBtn, guardando && s.guardarBtnDisabled]} onPress={handleGuardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.guardarBtnText}>Enviar al cliente</Text>}
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

  note: {
    fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary,
    backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm,
  },

  sectionLabel: {
    color: colors.textSecondary, fontSize: 11, fontFamily: fonts.heading,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  fieldLabel: {
    color: colors.textSecondary, fontSize: 11, fontFamily: fonts.heading,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.md, marginBottom: 4,
  },

  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tipoChip: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    paddingVertical: 10, paddingHorizontal: spacing.md,
  },
  tipoChipActive:  { borderColor: colors.accent, backgroundColor: 'rgba(232,82,42,0.12)' },
  tipoLabel:       { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.body },
  tipoLabelActive: { color: colors.accent, fontFamily: fonts.heading },

  rowTwo:  { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },

  input: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    color: colors.textPrimary, fontSize: 15, fontFamily: fonts.body,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  inputMultiline: { minHeight: 80, paddingTop: 13 },

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

  facturaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  facturaBtnText: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.body },
  facturaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(232,82,42,0.3)',
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  facturaText: { flex: 1, color: colors.textPrimary, fontSize: 13, fontFamily: fonts.body },

  guardarBtn: { backgroundColor: colors.accent, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: spacing.xl },
  guardarBtnDisabled: { opacity: 0.5 },
  guardarBtnText: { color: '#fff', fontFamily: fonts.bold, fontSize: 16 },
});
