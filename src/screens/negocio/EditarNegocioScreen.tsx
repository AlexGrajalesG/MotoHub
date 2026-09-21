import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  IconArrowLeft, IconBike, IconCar, IconCamera, IconBuildingStore,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

type Horario = Record<string, { abre: string; cierra: string } | null>;

type Negocio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  ciudad: string | null;
  tipo: 'taller' | 'tienda' | 'concesionario' | 'mixto';
  atiende: string[];
  horario: Horario | null;
  foto_url: string | null;
  telefono: string | null;
  activo: boolean;
};

const TIPOS: { value: Negocio['tipo']; label: string }[] = [
  { value: 'taller',        label: 'Taller' },
  { value: 'tienda',        label: 'Tienda' },
  { value: 'concesionario', label: 'Concesionario' },
  { value: 'mixto',         label: 'Mixto' },
];

const DIAS_ORDER = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_LABELS: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};

export default function EditarNegocioScreen({ route, navigation }: any) {
  const negocio: Negocio = route.params.negocio;

  const [nombre,      setNombre]      = useState(negocio.nombre);
  const [tipo,        setTipo]        = useState<Negocio['tipo']>(negocio.tipo);
  const [descripcion, setDescripcion] = useState(negocio.descripcion ?? '');
  const [direccion,   setDireccion]   = useState(negocio.direccion ?? '');
  const [ciudad,      setCiudad]      = useState(negocio.ciudad ?? '');
  const [telefono,    setTelefono]    = useState(negocio.telefono ?? '');
  const [atiende,     setAtiende]     = useState<string[]>(negocio.atiende ?? []);
  const [horario,     setHorario]     = useState<Horario>(negocio.horario ?? {});
  const [fotoUrl,     setFotoUrl]     = useState(negocio.foto_url);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardando,   setGuardando]   = useState(false);

  function toggleAtiende(v: string) {
    setAtiende(prev => prev.includes(v) ? prev.filter(a => a !== v) : [...prev, v]);
  }

  function toggleDia(dia: string) {
    setHorario(prev => ({
      ...prev,
      [dia]: prev[dia] ? null : { abre: '08:00', cierra: '18:00' },
    }));
  }

  function setHora(dia: string, campo: 'abre' | 'cierra', valor: string) {
    setHorario(prev => {
      const turno = prev[dia];
      if (!turno) return prev;
      return { ...prev, [dia]: { ...turno, [campo]: valor } };
    });
  }

  async function handleFoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', quality: 0.85, allowsEditing: true, aspect: [1, 1],
    });
    if (result.canceled) return;

    setSubiendoFoto(true);
    try {
      const asset  = result.assets[0];
      const rawExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const ext    = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(rawExt) ? rawExt : 'jpg';
      const path   = `negocios/${negocio.id}/foto.${ext}`;

      const response    = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) throw new Error('No se pudo leer la imagen');

      const { error: upErr } = await supabase.storage
        .from('fotos')
        .upload(path, arrayBuffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path);
      const urlConCache = `${publicUrl}?t=${Date.now()}`;
      await supabase.from('negocios').update({ foto_url: urlConCache }).eq('id', negocio.id);
      setFotoUrl(urlConCache);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubiendoFoto(false);
    }
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
    const { error } = await supabase.from('negocios').update({
      nombre:      nombre.trim(),
      tipo,
      descripcion: descripcion.trim() || null,
      direccion:   direccion.trim() || null,
      ciudad:      ciudad.trim() || null,
      telefono:    telefono.trim() || null,
      atiende,
      horario,
    }).eq('id', negocio.id);
    setGuardando(false);

    if (error) { Alert.alert('Error', error.message); return; }
    navigation.goBack();
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
        <Text style={s.headerTitle}>Editar negocio</Text>
        <Pressable
          style={({ pressed }) => [s.saveBtn, guardando && s.saveBtnOff, pressed && { opacity: 0.85 }]}
          onPress={handleGuardar}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator size="small" color={colors.onAccent} />
            : <Text style={s.saveBtnText}>Guardar</Text>
          }
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Foto */}
        <View style={s.fotoSection}>
          <TouchableOpacity onPress={handleFoto} disabled={subiendoFoto} style={s.fotoWrap} activeOpacity={0.82}>
            {fotoUrl
              ? <Image source={{ uri: fotoUrl }} style={s.foto} contentFit="cover" />
              : (
                <View style={s.fotoPlaceholder}>
                  <IconBuildingStore size={32} color={colors.accent} />
                </View>
              )
            }
            <View style={s.cameraBadge}>
              {subiendoFoto
                ? <ActivityIndicator size="small" color={colors.onAccent} />
                : <IconCamera size={15} color={colors.onAccent} />
              }
            </View>
          </TouchableOpacity>
        </View>

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
              placeholder="Cuéntales a tus clientes qué ofreces..."
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
            />
          </View>
        </View>

        {/* Horario */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Horario</Text>
          {DIAS_ORDER.map(dia => {
            const turno = horario[dia];
            return (
              <View key={dia} style={s.horarioRow}>
                <Pressable style={s.horarioDiaBtn} onPress={() => toggleDia(dia)}>
                  <View style={[s.checkbox, turno && s.checkboxOn]} />
                  <Text style={s.horarioDia}>{DIAS_LABELS[dia]}</Text>
                </Pressable>
                {turno ? (
                  <View style={s.horarioInputs}>
                    <TextInput
                      style={s.horarioInput}
                      value={turno.abre}
                      onChangeText={v => setHora(dia, 'abre', v)}
                      placeholder="08:00"
                      placeholderTextColor={colors.textTertiary}
                      maxLength={5}
                    />
                    <Text style={s.horarioDash}>–</Text>
                    <TextInput
                      style={s.horarioInput}
                      value={turno.cierra}
                      onChangeText={v => setHora(dia, 'cierra', v)}
                      placeholder="18:00"
                      placeholderTextColor={colors.textTertiary}
                      maxLength={5}
                    />
                  </View>
                ) : (
                  <Text style={s.horarioCerrado}>Cerrado</Text>
                )}
              </View>
            );
          })}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 10, paddingHorizontal: spacing.lg, minHeight: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  saveBtnOff:  { opacity: 0.6 },
  saveBtnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onAccent },

  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 48 },

  /* ── Foto ── */
  fotoSection: { alignItems: 'center', marginBottom: spacing.xl },
  fotoWrap:    { position: 'relative' },
  foto:        { width: 96, height: 96, borderRadius: radius.lg },
  fotoPlaceholder: {
    width: 96, height: 96, borderRadius: radius.lg,
    backgroundColor: 'rgba(72,151,90,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: colors.bgPrimary,
  },

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

  /* ── Horario ── */
  horarioRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
  },
  horarioDiaBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  checkbox: {
    width: 18, height: 18, borderRadius: 5,
    borderWidth: 1.5, borderColor: colors.bgSurface, backgroundColor: colors.bgCard,
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  horarioDia: { fontFamily: fonts.heading, fontSize: 13, color: colors.textPrimary },
  horarioInputs: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  horarioInput: {
    fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary,
    backgroundColor: colors.bgCard, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    width: 56, textAlign: 'center',
  },
  horarioDash: { color: colors.textTertiary },
  horarioCerrado: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary },
});
