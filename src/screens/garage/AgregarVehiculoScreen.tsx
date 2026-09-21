import { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert,
  ScrollView, KeyboardAvoidingView, Platform, type TextInputProps,
} from 'react-native';
import {
  IconArrowLeft, IconMotorbike, IconCar, IconTruck, IconDots, IconAlertCircle, IconCheck,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

const TIPOS = [
  { key: 'moto',      label: 'Moto',      Icon: IconMotorbike },
  { key: 'carro',     label: 'Carro',     Icon: IconCar },
  { key: 'camioneta', label: 'Camioneta', Icon: IconTruck },
  { key: 'otro',      label: 'Otro',      Icon: IconDots },
] as const;

// `valor` es lo que se guarda (igual que antes); `label` es lo que se ve.
const SUBTIPOS_MOTO = [
  { valor: 'naked', label: 'Naked' },
  { valor: 'sport', label: 'Sport' },
  { valor: 'scooter', label: 'Scooter' },
  { valor: 'doble proposito', label: 'Doble propósito' },
  { valor: 'otro', label: 'Otro' },
];

const MARCAS: Record<string, string[]> = {
  moto:      ['Yamaha', 'Honda', 'Suzuki', 'AKT', 'Bajaj', 'TVS', 'Hero', 'KTM'],
  carro:     ['Chevrolet', 'Renault', 'Mazda', 'Toyota', 'Kia', 'Hyundai', 'Nissan', 'Ford'],
  camioneta: ['Chevrolet', 'Toyota', 'Ford', 'Renault', 'Nissan', 'Mazda', 'Kia', 'Hyundai'],
  otro:      [],
};

const CAMPOS = ['marca', 'modelo', 'anio', 'placa', 'km'] as const;
type Campo = typeof CAMPOS[number];

function validar(v: { marca: string; modelo: string; anio: string; placa: string; km: string }): Partial<Record<Campo, string>> {
  const e: Partial<Record<Campo, string>> = {};
  if (!v.marca.trim()) e.marca = 'Escribe la marca';
  if (!v.modelo.trim()) e.modelo = 'Escribe el modelo';
  const anioNum = parseInt(v.anio, 10);
  if (!v.anio) e.anio = 'Escribe el año';
  else if (isNaN(anioNum) || anioNum < 1900 || anioNum > new Date().getFullYear() + 1) e.anio = 'Año no válido';
  if (!v.placa) e.placa = 'Escribe la placa';
  else if (!/^[A-Z0-9]{5,6}$/.test(v.placa)) e.placa = 'La placa tiene 5 o 6 caracteres';
  if (v.km && parseInt(v.km, 10) > 2000000) e.km = 'Revisa el kilometraje';
  return e;
}

// ─── Piezas ──────────────────────────────────────────────────────────────────

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={s.seccion}>
      <Text style={s.seccionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

function Campo({ label, requerido, error, ayuda, children }: {
  label: string; requerido?: boolean; error?: string; ayuda?: string; children: React.ReactNode;
}) {
  return (
    <View style={s.campo}>
      <Text style={s.label}>
        {label}
        {requerido ? <Text style={s.requerido}> *</Text> : <Text style={s.opcional}>  opcional</Text>}
      </Text>
      {children}
      {error ? (
        <View style={s.errorRow} accessibilityLiveRegion="polite">
          <IconAlertCircle size={14} color={colors.dangerAction} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : ayuda ? (
        <Text style={s.ayuda}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

type EntradaProps = TextInputProps & { error?: boolean; inputRef?: React.RefObject<TextInput | null> };

function Entrada({ error, inputRef, style, onFocus, onBlur, ...rest }: EntradaProps) {
  const [foco, setFoco] = useState(false);
  return (
    <TextInput
      ref={inputRef}
      style={[s.input, foco && s.inputFoco, error && s.inputError, style]}
      placeholderTextColor={colors.textTertiary}
      onFocus={(e) => { setFoco(true); onFocus?.(e); }}
      onBlur={(e) => { setFoco(false); onBlur?.(e); }}
      {...rest}
    />
  );
}

// ─── Pantalla ────────────────────────────────────────────────────────────────

export default function AgregarVehiculoScreen({ navigation }: any) {
  const { session } = useAuth();
  const [tipo, setTipo] = useState<typeof TIPOS[number]['key']>('moto');
  const [subtipo, setSubtipo] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [color, setColor] = useState('');
  const [placa, setPlaca] = useState('');
  const [cilindraje, setCilindraje] = useState('');
  const [km, setKm] = useState('');
  const [loading, setLoading] = useState(false);
  const [intento, setIntento] = useState(false);
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({});

  const marcaRef = useRef<TextInput>(null);
  const modeloRef = useRef<TextInput>(null);
  const anioRef = useRef<TextInput>(null);
  const cilindrajeRef = useRef<TextInput>(null);
  const placaRef = useRef<TextInput>(null);
  const colorRef = useRef<TextInput>(null);
  const kmRef = useRef<TextInput>(null);
  const refs: Record<Campo, React.RefObject<TextInput | null>> = {
    marca: marcaRef, modelo: modeloRef, anio: anioRef, placa: placaRef, km: kmRef,
  };

  const errores = validar({ marca, modelo, anio, placa, km });
  const verError = (c: Campo) => (intento || tocados[c] ? errores[c] : undefined);
  const tocar = (c: Campo) => setTocados(t => ({ ...t, [c]: true }));

  const TipoIcon = TIPOS.find(t => t.key === tipo)!.Icon;
  const titulo = `${marca.trim()} ${modelo.trim()}`.trim() || 'Tu vehículo';
  const detalle = [anio, color.trim(), cilindraje ? `${cilindraje} cc` : ''].filter(Boolean).join(' · ')
    || 'Los datos que escribas aparecen aquí';
  const marcasSugeridas = (MARCAS[tipo] ?? []).filter(m => m.toLowerCase() !== marca.trim().toLowerCase());

  async function handleGuardar() {
    setIntento(true);
    const primero = CAMPOS.find(c => errores[c]);
    if (primero) { refs[primero].current?.focus(); return; }

    setLoading(true);
    const { error } = await supabase.from('vehiculos').insert({
      propietario_id: session?.user.id,
      tipo,
      subtipo: tipo === 'moto' && subtipo ? subtipo : null,
      marca: marca.trim(),
      modelo: modelo.trim(),
      anio: parseInt(anio, 10),
      color: color.trim(),
      placa,
      cilindraje: cilindraje ? parseInt(cilindraje, 10) : null,
      kilometraje: parseInt(km, 10) || 0,
    });
    setLoading(false);

    if (error) {
      Alert.alert(
        'No se pudo guardar',
        error.code === '23505' ? 'Ya existe un vehículo con esa placa.' : 'Revisa tu conexión e intenta de nuevo.',
      );
      return;
    }
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Encabezado ── */}
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Agregar vehículo</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Vista previa en vivo ── */}
        <View style={s.preview}>
          <View style={s.previewIcono}>
            <TipoIcon size={28} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.previewTitulo} numberOfLines={1}>{titulo}</Text>
            <Text style={s.previewDetalle} numberOfLines={1}>{detalle}</Text>
          </View>
          {!!placa && (
            <View style={s.placa}>
              <Text style={s.placaTexto}>{placa}</Text>
            </View>
          )}
        </View>

        {/* ── Tipo ── */}
        <Seccion titulo="¿Qué vehículo es?">
          <View style={s.tipos}>
            {TIPOS.map(({ key, label, Icon }) => {
              const activo = tipo === key;
              return (
                <Pressable
                  key={key}
                  style={({ pressed }) => [s.tipoTile, activo && s.tipoTileActivo, pressed && { opacity: 0.85 }]}
                  onPress={() => { setTipo(key); if (key !== 'moto') setSubtipo(''); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={label}
                >
                  <Icon size={26} color={activo ? colors.accent : colors.textSecondary} />
                  <Text style={[s.tipoLabel, activo && s.tipoLabelActivo]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {tipo === 'moto' && (
            <Campo label="Tipo de moto">
              <View style={s.chips}>
                {SUBTIPOS_MOTO.map(({ valor, label }) => {
                  const activo = subtipo === valor;
                  return (
                    <Pressable
                      key={valor}
                      style={({ pressed }) => [s.chip, activo && s.chipActivo, pressed && { opacity: 0.85 }]}
                      onPress={() => setSubtipo(activo ? '' : valor)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: activo }}
                    >
                      <Text style={[s.chipTexto, activo && s.chipTextoActivo]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Campo>
          )}
        </Seccion>

        {/* ── Datos principales ── */}
        <Seccion titulo="Datos del vehículo">
          <Campo label="Marca" requerido error={verError('marca')}>
            <Entrada
              inputRef={marcaRef}
              value={marca}
              onChangeText={setMarca}
              onBlur={() => tocar('marca')}
              error={!!verError('marca')}
              placeholder={tipo === 'moto' ? 'Ej: Yamaha' : 'Ej: Chevrolet'}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => modeloRef.current?.focus()}
              blurOnSubmit={false}
            />
            {marcasSugeridas.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.sugerencias}
              >
                {marcasSugeridas.map(m => (
                  <Pressable
                    key={m}
                    style={({ pressed }) => [s.sugerencia, pressed && { opacity: 0.7 }]}
                    onPress={() => { setMarca(m); modeloRef.current?.focus(); }}
                    accessibilityLabel={`Usar marca ${m}`}
                  >
                    <Text style={s.sugerenciaTexto}>{m}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Campo>

          <Campo label="Modelo" requerido error={verError('modelo')}>
            <Entrada
              inputRef={modeloRef}
              value={modelo}
              onChangeText={setModelo}
              onBlur={() => tocar('modelo')}
              error={!!verError('modelo')}
              placeholder={tipo === 'moto' ? 'Ej: MT-07, CB500' : 'Ej: Spark, Duster'}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => anioRef.current?.focus()}
              blurOnSubmit={false}
            />
          </Campo>

          <View style={s.fila}>
            <View style={s.mitad}>
              <Campo label="Año" requerido error={verError('anio')}>
                <Entrada
                  inputRef={anioRef}
                  value={anio}
                  onChangeText={(t) => setAnio(t.replace(/\D/g, ''))}
                  onBlur={() => tocar('anio')}
                  error={!!verError('anio')}
                  placeholder="2022"
                  keyboardType="number-pad"
                  maxLength={4}
                  returnKeyType="next"
                  onSubmitEditing={() => cilindrajeRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </Campo>
            </View>
            <View style={s.mitad}>
              <Campo label="Cilindraje (cc)">
                <Entrada
                  inputRef={cilindrajeRef}
                  value={cilindraje}
                  onChangeText={(t) => setCilindraje(t.replace(/\D/g, ''))}
                  placeholder="700"
                  keyboardType="number-pad"
                  maxLength={5}
                  returnKeyType="next"
                  onSubmitEditing={() => placaRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </Campo>
            </View>
          </View>
        </Seccion>

        {/* ── Identificación ── */}
        <Seccion titulo="Identificación">
          <View style={s.fila}>
            <View style={s.mitad}>
              <Campo label="Placa" requerido error={verError('placa')}>
                <Entrada
                  inputRef={placaRef}
                  value={placa}
                  onChangeText={(t) => setPlaca(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  onBlur={() => tocar('placa')}
                  error={!!verError('placa')}
                  placeholder={tipo === 'moto' ? 'ABC12D' : 'ABC123'}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  returnKeyType="next"
                  onSubmitEditing={() => colorRef.current?.focus()}
                  blurOnSubmit={false}
                  style={s.inputPlaca}
                />
              </Campo>
            </View>
            <View style={s.mitad}>
              <Campo label="Color">
                <Entrada
                  inputRef={colorRef}
                  value={color}
                  onChangeText={setColor}
                  placeholder="Negro"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => kmRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </Campo>
            </View>
          </View>
        </Seccion>

        {/* ── Estado actual ── */}
        <Seccion titulo="Estado actual">
          <Campo
            label="Kilometraje"
            error={verError('km')}
            ayuda="Lo usamos para avisarte cuándo toca el mantenimiento. Puedes actualizarlo después."
          >
            <Entrada
              inputRef={kmRef}
              value={km}
              onChangeText={(t) => setKm(t.replace(/\D/g, ''))}
              onBlur={() => tocar('km')}
              error={!!verError('km')}
              placeholder="0"
              keyboardType="number-pad"
              maxLength={7}
              returnKeyType="done"
            />
          </Campo>
        </Seccion>
      </ScrollView>

      {/* ── Botón fijo: siempre a la vista ── */}
      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.boton, loading && s.botonOcupado, pressed && { opacity: 0.85 }]}
          onPress={handleGuardar}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Guardar vehículo"
        >
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <>
              <IconCheck size={20} color={colors.onAccent} />
              <Text style={s.botonTexto}>Guardar vehículo</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontFamily: fonts.display, fontSize: 24, color: colors.textPrimary, letterSpacing: -0.4 },

  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.xl },

  /* Vista previa */
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.accentDark, borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)', padding: spacing.lg,
  },
  previewIcono: {
    width: 52, height: 52, borderRadius: radius.md,
    backgroundColor: 'rgba(2,2,2,0.35)', justifyContent: 'center', alignItems: 'center',
  },
  previewTitulo: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary, letterSpacing: -0.2 },
  previewDetalle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  placa: {
    backgroundColor: '#f2c94c', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(2,2,2,0.5)',
  },
  placaTexto: { fontFamily: fonts.bold, fontSize: 14, color: '#020202', letterSpacing: 1.5 },

  /* Secciones y campos */
  seccion: { gap: spacing.md },
  seccionTitulo: { fontFamily: fonts.heading, fontSize: 16, color: colors.textPrimary },
  campo: { gap: 6 },
  label: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  requerido: { color: colors.accent },
  opcional: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  ayuda: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, lineHeight: 17 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorText: { fontFamily: fonts.body, fontSize: 12, color: colors.dangerAction },

  input: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.lg, minHeight: 52,
    fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary,
  },
  inputFoco: { borderColor: colors.accent },
  inputError: { borderColor: colors.dangerAction },
  inputPlaca: { fontFamily: fonts.bold, letterSpacing: 2 },

  fila: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  mitad: { flex: 1 },

  /* Tipo de vehiculo */
  tipos: { flexDirection: 'row', gap: spacing.sm },
  tipoTile: {
    flex: 1, minHeight: 78, borderRadius: radius.md, gap: 6,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  tipoTileActivo: { borderColor: colors.accent, backgroundColor: 'rgba(72,151,90,0.12)' },
  tipoLabel: { fontFamily: fonts.heading, fontSize: 12, color: colors.textSecondary },
  tipoLabelActivo: { color: colors.accent },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
  },
  chipActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  chipTextoActivo: { fontFamily: fonts.bold, color: colors.onAccent },

  sugerencias: { gap: spacing.sm, paddingTop: spacing.xs },
  sugerencia: {
    minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, justifyContent: 'center',
    borderWidth: 1, borderColor: colors.bgSurface,
  },
  sugerenciaTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },

  /* Boton fijo */
  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl,
    backgroundColor: colors.bgPrimary, borderTopWidth: 1, borderTopColor: colors.bgCard,
  },
  boton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 54,
  },
  botonOcupado: { opacity: 0.6 },
  botonTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
});
