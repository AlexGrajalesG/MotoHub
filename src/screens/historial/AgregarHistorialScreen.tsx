import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  IconArrowLeft, IconCamera, IconX, IconUser, IconBuildingStore,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';

const { colors, fonts, spacing, radius } = tokens;

// ─── tipos ────────────────────────────────────────────────────────────────────
const TIPOS = [
  { key: 'aceite',           label: 'Aceite'       },
  { key: 'frenos',           label: 'Frenos'       },
  { key: 'cadena',           label: 'Cadena'       },
  { key: 'llantas',          label: 'Llantas'      },
  { key: 'bateria',          label: 'Batería'      },
  { key: 'revision_tecnica', label: 'Rev. Técnica' },
  { key: 'soat',             label: 'SOAT'         },
  { key: 'lavado',           label: 'Lavado'       },
  { key: 'personalizado',    label: 'Otro'         },
];

// ─── aceite sub-types ─────────────────────────────────────────────────────────
const ACEITE_TIPOS = [
  { key: 'mineral',       label: 'Mineral'       },
  { key: 'sintetico',     label: 'Sintético'     },
  { key: 'semisintetico', label: 'Semisintético'  },
];

// ─── auto-recordatorio intervals ──────────────────────────────────────────────
const INTERVALOS: Record<string, { tipo: 'km' | 'dias'; valor: number; label: string }> = {
  aceite:           { tipo: 'km',   valor: 2500,  label: 'cambio de aceite'    },
  cadena:           { tipo: 'km',   valor: 2000,  label: 'servicio de cadena'  },
  frenos:           { tipo: 'km',   valor: 10000, label: 'revisión de frenos'  },
  llantas:          { tipo: 'km',   valor: 20000, label: 'cambio de llantas'   },
  bateria:          { tipo: 'dias', valor: 365,   label: 'revisión de batería' },
  revision_tecnica: { tipo: 'dias', valor: 365,   label: 'revisión técnica'    },
  soat:             { tipo: 'dias', valor: 365,   label: 'renovación SOAT'     },
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function hoyDisplay(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

function displayToISO(display: string): string | null {
  const parts = display.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (d.length !== 2 || m.length !== 2 || y.length !== 4) return null;
  return `${y}-${m}-${d}`;
}

function formatFechaISO(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function AgregarHistorialScreen({ route, navigation }: any) {
  const { vehiculo } = route.params;
  const { session } = useAuth();

  // core fields
  const [tipo, setTipo] = useState('aceite');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(hoyDisplay());
  const [km, setKm] = useState(String(vehiculo.kilometraje ?? ''));
  const [tallerNombre, setTallerNombre] = useState('');
  const [mecanicoNombre, setMecanicoNombre] = useState('');
  const [costo, setCosto] = useState('');
  const [notas, setNotas] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  // aceite detail fields
  const [tipoAceite, setTipoAceite] = useState('');
  const [marcaAceite, setMarcaAceite] = useState('');
  const [viscosidad, setViscosidad] = useState('');

  // ─── foto picker ────────────────────────────────────────────────────────────
  async function pickFoto() {
    if (fotos.length >= 3) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para agregar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setFotos(prev => [...prev, result.assets[0].uri]);
    }
  }

  function removeFoto(index: number) {
    setFotos(prev => prev.filter((_, i) => i !== index));
  }

  // ─── upload ─────────────────────────────────────────────────────────────────
  async function uploadFotos(localUris: string[]): Promise<string[]> {
    if (!session) return [];
    const urls: string[] = [];
    for (const uri of localUris) {
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
      const path = `${session.user.id}/historial/${vehiculo.id}/${Date.now()}.${safeExt}`;
      try {
        const response = await fetch(uri);
        const ab = await response.arrayBuffer();
        if (ab.byteLength === 0) continue;
        const { error } = await supabase.storage
          .from('fotos')
          .upload(path, ab, { contentType: `image/${safeExt}` });
        if (!error) {
          const { data } = supabase.storage.from('fotos').getPublicUrl(path);
          urls.push(data.publicUrl);
        }
      } catch {
        // skip individual failed uploads
      }
    }
    return urls;
  }

  // ─── auto-recordatorio ──────────────────────────────────────────────────────
  function ofrecerRecordatorio(kmServicio: number | null): Promise<void> {
    const intervalo = INTERVALOS[tipo];
    if (!intervalo) return Promise.resolve();

    return new Promise(resolve => {
      if (intervalo.tipo === 'km') {
        if (!kmServicio) return resolve();
        const proximoKm = kmServicio + intervalo.valor;
        Alert.alert(
          `¿Programar próximo ${intervalo.label}?`,
          `Se creará un recordatorio para los ${proximoKm.toLocaleString('es-CO')} km`,
          [
            { text: 'Omitir', style: 'cancel', onPress: () => resolve() },
            {
              text: 'Programar',
              onPress: async () => {
                await supabase.from('recordatorios').insert({
                  vehiculo_id: vehiculo.id,
                  tipo,
                  km_limite: proximoKm,
                  km_aviso: 500,
                  estado: 'pendiente',
                });
                resolve();
              },
            },
          ]
        );
      } else {
        const proxima = new Date();
        proxima.setDate(proxima.getDate() + intervalo.valor);
        const fechaStr = proxima.toISOString().split('T')[0];
        Alert.alert(
          `¿Programar ${intervalo.label}?`,
          `Se creará un recordatorio para el ${formatFechaISO(fechaStr)}`,
          [
            { text: 'Omitir', style: 'cancel', onPress: () => resolve() },
            {
              text: 'Programar',
              onPress: async () => {
                await supabase.from('recordatorios').insert({
                  vehiculo_id: vehiculo.id,
                  tipo,
                  fecha_limite: fechaStr,
                  km_aviso: null,
                  estado: 'pendiente',
                });
                resolve();
              },
            },
          ]
        );
      }
    });
  }

  // ─── save ───────────────────────────────────────────────────────────────────
  async function handleGuardar() {
    const fechaISO = displayToISO(fecha);
    if (!fechaISO) {
      Alert.alert('Fecha inválida', 'Usa el formato DD/MM/AAAA');
      return;
    }

    setGuardando(true);
    try {
      const fotosUrls = await uploadFotos(fotos);

      const detalles: Record<string, string> = {};
      if (tipo === 'aceite') {
        if (tipoAceite) detalles.tipo_aceite = tipoAceite;
        if (marcaAceite.trim()) detalles.marca = marcaAceite.trim();
        if (viscosidad.trim()) detalles.viscosidad = viscosidad.trim();
      }

      const kmNum = km ? parseInt(km) : null;

      const { error } = await supabase.from('historial_mantenimiento').insert({
        vehiculo_id:    vehiculo.id,
        tipo,
        descripcion:    tipo === 'personalizado' ? (descripcion.trim() || null) : null,
        fecha:          fechaISO,
        km_en_servicio: kmNum,
        taller:         tallerNombre.trim() || null,
        negocio_nombre: tallerNombre.trim() || null,
        mecanico_nombre: mecanicoNombre.trim() || null,
        costo:          costo ? parseFloat(costo) : null,
        notas:          notas.trim() || null,
        fotos:          fotosUrls,
        detalles:       Object.keys(detalles).length > 0 ? detalles : null,
        creado_por:     'propietario',
      });

      if (error) throw error;

      await ofrecerRecordatorio(kmNum);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar el registro');
    } finally {
      setGuardando(false);
    }
  }

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      {/* header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <IconArrowLeft size={22} color={colors.accent} />
          <Text style={s.backText}>Cancelar</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.title}>Nuevo registro</Text>
          <Text style={s.subtitle}>{vehiculo.marca} {vehiculo.modelo}</Text>
        </View>
        <Pressable
          style={[s.guardarHeaderBtn, guardando && s.guardarHeaderDisabled]}
          onPress={handleGuardar}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Text style={s.guardarHeaderText}>Guardar</Text>
          }
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.form}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* tipo */}
        <Text style={s.sectionLabel}>Tipo de mantenimiento</Text>
        <View style={s.tiposGrid}>
          {TIPOS.map(t => (
            <Pressable
              key={t.key}
              style={[s.tipoChip, tipo === t.key && s.tipoChipActive]}
              onPress={() => setTipo(t.key)}
            >
              <Text style={[s.tipoLabel, tipo === t.key && s.tipoLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* detalles aceite */}
        {tipo === 'aceite' && (
          <View style={s.detallesBox}>
            <Text style={s.sectionLabel}>Tipo de aceite</Text>
            <View style={s.chipRow}>
              {ACEITE_TIPOS.map(ta => (
                <Pressable
                  key={ta.key}
                  style={[s.smallChip, tipoAceite === ta.key && s.smallChipActive]}
                  onPress={() => setTipoAceite(prev => prev === ta.key ? '' : ta.key)}
                >
                  <Text style={[s.smallChipLabel, tipoAceite === ta.key && s.smallChipLabelActive]}>
                    {ta.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.fieldLabel}>Marca</Text>
            <TextInput
              style={s.input}
              placeholder="Ej: Mobil, Castrol, Shell"
              placeholderTextColor={colors.textTertiary}
              value={marcaAceite}
              onChangeText={setMarcaAceite}
            />
            <Text style={s.fieldLabel}>Viscosidad</Text>
            <TextInput
              style={s.input}
              placeholder="Ej: 10W40, 20W50"
              placeholderTextColor={colors.textTertiary}
              value={viscosidad}
              onChangeText={setViscosidad}
              autoCapitalize="characters"
            />
          </View>
        )}

        {/* descripcion personalizado */}
        {tipo === 'personalizado' && (
          <>
            <Text style={s.fieldLabel}>Descripción</Text>
            <TextInput
              style={s.input}
              placeholder="Ej: Revisión de suspensión"
              placeholderTextColor={colors.textTertiary}
              value={descripcion}
              onChangeText={setDescripcion}
            />
          </>
        )}

        {/* fecha + km */}
        <View style={s.rowTwo}>
          <View style={s.rowItem}>
            <Text style={s.fieldLabel}>Fecha</Text>
            <TextInput
              style={s.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.textTertiary}
              value={fecha}
              onChangeText={setFecha}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
          <View style={s.rowItem}>
            <Text style={s.fieldLabel}>Km al servicio</Text>
            <TextInput
              style={s.input}
              placeholder="Ej: 15000"
              placeholderTextColor={colors.textTertiary}
              value={km}
              onChangeText={setKm}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* taller */}
        <Text style={s.fieldLabel}>Taller / Lugar</Text>
        <View style={s.inputIcon}>
          <IconBuildingStore size={18} color={colors.textTertiary} style={s.inputIconIcon} />
          <TextInput
            style={s.inputWithIcon}
            placeholder="Ej: MotoExpress, taller de barrio"
            placeholderTextColor={colors.textTertiary}
            value={tallerNombre}
            onChangeText={setTallerNombre}
          />
        </View>

        {/* mecánico */}
        <Text style={s.fieldLabel}>Nombre del mecánico</Text>
        <View style={s.inputIcon}>
          <IconUser size={18} color={colors.textTertiary} style={s.inputIconIcon} />
          <TextInput
            style={s.inputWithIcon}
            placeholder="Ej: Jhon Pérez"
            placeholderTextColor={colors.textTertiary}
            value={mecanicoNombre}
            onChangeText={setMecanicoNombre}
          />
        </View>

        {/* costo */}
        <Text style={s.fieldLabel}>Costo (COP)</Text>
        <TextInput
          style={s.input}
          placeholder="Ej: 85000"
          placeholderTextColor={colors.textTertiary}
          value={costo}
          onChangeText={setCosto}
          keyboardType="decimal-pad"
        />

        {/* fotos */}
        <Text style={[s.sectionLabel, { marginTop: spacing.xl }]}>
          Fotos del servicio
        </Text>
        <Text style={s.fotosHint}>Hasta 3 fotos — factura, piezas, estado</Text>
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

        {/* notas */}
        <Text style={s.fieldLabel}>Notas</Text>
        <TextInput
          style={[s.input, s.inputMultiline]}
          placeholder="Observaciones, piezas cambiadas, recomendaciones…"
          placeholderTextColor={colors.textTertiary}
          value={notas}
          onChangeText={setNotas}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* guardar */}
        <Pressable
          style={[s.guardarBtn, guardando && s.guardarBtnDisabled]}
          onPress={handleGuardar}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator color={colors.onAccent} />
            : <Text style={s.guardarBtnText}>Guardar registro</Text>
          }
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bgPrimary },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop:       56,
    paddingBottom:    spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSurface,
  },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 80 },
  backText:     { color: colors.accent, fontSize: 15, fontFamily: fonts.heading },
  headerCenter: { alignItems: 'center', flex: 1 },
  title:        { color: colors.textPrimary, fontSize: 17, fontFamily: fonts.bold },
  subtitle:     { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body, marginTop: 2 },

  guardarHeaderBtn:      { minWidth: 80, alignItems: 'flex-end' },
  guardarHeaderDisabled: { opacity: 0.4 },
  guardarHeaderText:     { color: colors.accent, fontSize: 15, fontFamily: fonts.heading },

  scroll: { flex: 1 },
  form:   { padding: spacing.xl, gap: spacing.sm, paddingBottom: 60 },

  sectionLabel: {
    color:          colors.textSecondary,
    fontSize:       11,
    fontFamily:     fonts.heading,
    textTransform:  'uppercase',
    letterSpacing:  0.8,
    marginTop:      spacing.lg,
    marginBottom:   spacing.sm,
  },
  fieldLabel: {
    color:          colors.textSecondary,
    fontSize:       11,
    fontFamily:     fonts.heading,
    textTransform:  'uppercase',
    letterSpacing:  0.8,
    marginTop:      spacing.md,
    marginBottom:   4,
  },

  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tipoChip: {
    backgroundColor:  colors.bgCard,
    borderRadius:     radius.md,
    borderWidth:      1,
    borderColor:      colors.bgSurface,
    paddingVertical:  10,
    paddingHorizontal: spacing.md,
  },
  tipoChipActive: { borderColor: colors.accent, backgroundColor: 'rgba(72,151,90,0.12)' },
  tipoLabel:      { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.body },
  tipoLabelActive:{ color: colors.accent, fontFamily: fonts.heading },

  detallesBox: {
    backgroundColor: colors.bgCard,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    borderWidth:     1,
    borderColor:     'rgba(72,151,90,0.2)',
    marginTop:       spacing.sm,
  },

  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  smallChip: {
    backgroundColor: colors.bgSurface,
    borderRadius:    radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderWidth:     1,
    borderColor:     'transparent',
  },
  smallChipActive:      { borderColor: colors.accent, backgroundColor: 'rgba(72,151,90,0.1)' },
  smallChipLabel:       { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.body },
  smallChipLabelActive: { color: colors.accent, fontFamily: fonts.heading },

  rowTwo:   { flexDirection: 'row', gap: spacing.md },
  rowItem:  { flex: 1 },

  input: {
    backgroundColor: colors.bgCard,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.bgSurface,
    color:           colors.textPrimary,
    fontSize:        15,
    fontFamily:      fonts.body,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
  },
  inputMultiline: { minHeight: 80, paddingTop: 13 },

  inputIcon: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.bgCard,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.bgSurface,
  },
  inputIconIcon:  { marginLeft: spacing.md },
  inputWithIcon: {
    flex:            1,
    color:           colors.textPrimary,
    fontSize:        15,
    fontFamily:      fonts.body,
    paddingVertical: 13,
    paddingLeft:     spacing.sm,
    paddingRight:    spacing.md,
  },

  fotosHint: {
    color:      colors.textTertiary,
    fontSize:   12,
    fontFamily: fonts.body,
    marginTop:  -spacing.sm,
    marginBottom: spacing.sm,
  },
  fotosRow:  { flexDirection: 'row', gap: spacing.md },
  fotoSlot:  { position: 'relative' },
  fotoThumb: { width: 88, height: 88, borderRadius: radius.md },
  fotoRemove:{
    position:        'absolute',
    top:             -6,
    right:           -6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius:    999,
    width:           22,
    height:          22,
    alignItems:      'center',
    justifyContent:  'center',
  },
  fotoAdd: {
    width:           88,
    height:          88,
    borderRadius:    radius.md,
    backgroundColor: colors.bgCard,
    borderWidth:     1,
    borderColor:     colors.bgSurface,
    borderStyle:     'dashed',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             4,
  },
  fotoAddText: { color: colors.textTertiary, fontSize: 11, fontFamily: fonts.body },

  guardarBtn: {
    backgroundColor: colors.accent,
    borderRadius:    radius.lg,
    paddingVertical: 16,
    alignItems:      'center',
    marginTop:       spacing.xl,
  },
  guardarBtnDisabled: { opacity: 0.5 },
  guardarBtnText:     { color: colors.onAccent, fontFamily: fonts.bold, fontSize: 16 },
});
