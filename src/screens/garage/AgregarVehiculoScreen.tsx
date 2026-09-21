import { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, BackHandler,
  ScrollView, KeyboardAvoidingView, Platform, type TextInput,
} from 'react-native';
import {
  IconArrowLeft, IconMotorbike, IconCar, IconTruck, IconDots, IconAlertCircle,
  IconCircleCheck, IconShieldCheck, IconPencil, IconChevronRight,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { mensajeError } from '../../lib/errores';
import { Campo, Entrada } from '../../components/FormField';

const { colors, spacing, radius, fonts } = tokens;

const TIPOS = [
  { key: 'moto',      label: 'Moto',      Icon: IconMotorbike },
  { key: 'carro',     label: 'Carro',     Icon: IconCar },
  { key: 'camioneta', label: 'Camioneta', Icon: IconTruck },
  { key: 'otro',      label: 'Otro',      Icon: IconDots },
] as const;
type TipoKey = typeof TIPOS[number]['key'];

// Pocas marcas a la vista (Hick): las mas comunes en Colombia y "Otra".
const MARCAS: Record<TipoKey, string[]> = {
  moto:      ['Yamaha', 'Honda', 'Suzuki', 'AKT', 'Bajaj', 'TVS'],
  carro:     ['Chevrolet', 'Renault', 'Mazda', 'Toyota', 'Kia', 'Nissan'],
  camioneta: ['Toyota', 'Chevrolet', 'Ford', 'Renault', 'Nissan', 'Mazda'],
  otro:      [],
};

const TOTAL_PASOS = 3;

type Errores = { marca?: string; modelo?: string; anio?: string; placa?: string; km?: string };

function validarPaso(paso: number, v: { marca: string; modelo: string; anio: string; placa: string; km: string }): Errores {
  const e: Errores = {};
  if (paso === 1 && !v.marca.trim()) e.marca = 'Elige la marca o escribe cuál es';
  if (paso === 2) {
    if (!v.modelo.trim()) e.modelo = 'Escribe el modelo';
    const anioNum = parseInt(v.anio, 10);
    if (!v.anio) e.anio = 'Escribe el año';
    else if (isNaN(anioNum) || anioNum < 1900 || anioNum > new Date().getFullYear() + 1) e.anio = 'Revisa el año';
  }
  if (paso === 3) {
    if (!v.placa) e.placa = 'Escribe la placa';
    else if (!/^[A-Z0-9]{5,6}$/.test(v.placa)) e.placa = 'La placa tiene 5 o 6 caracteres';
    if (v.km && parseInt(v.km, 10) > 2000000) e.km = 'Revisa el kilometraje';
  }
  return e;
}

type Guardado = { id: string; marca: string; modelo: string; anio: number; placa: string; tipo: string; kilometraje: number };

export default function AgregarVehiculoScreen({ navigation }: any) {
  const { session } = useAuth();
  const [paso, setPaso] = useState(1);
  const [tipo, setTipo] = useState<TipoKey>('moto');
  const [marca, setMarca] = useState('');
  const [otraMarca, setOtraMarca] = useState(false);
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [placa, setPlaca] = useState('');
  const [km, setKm] = useState('');
  const [loading, setLoading] = useState(false);
  const [intento, setIntento] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<Guardado | null>(null);

  const modeloRef = useRef<TextInput>(null);
  const anioRef = useRef<TextInput>(null);
  const placaRef = useRef<TextInput>(null);
  const kmRef = useRef<TextInput>(null);
  const marcaRef = useRef<TextInput>(null);

  const errores = validarPaso(paso, { marca, modelo, anio, placa, km });
  const ver = (c: keyof Errores) => (intento ? errores[c] : undefined);

  // El boton atras de Android vuelve al paso anterior en vez de salir del formulario.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!guardado && paso > 1) { setPaso(p => p - 1); setIntento(false); return true; }
      return false;
    });
    return () => sub.remove();
  }, [paso, guardado]);

  const TipoIcon = TIPOS.find(t => t.key === tipo)!.Icon;
  const titulo = `${marca.trim()} ${modelo.trim()}`.trim() || 'Tu vehículo';
  const detalle = [anio, placa].filter(Boolean).join(' · ') || 'Se irá llenando mientras respondes';
  const marcasVisibles = MARCAS[tipo];
  const mostrarCampoMarca = marcasVisibles.length === 0 || otraMarca;

  function atras() {
    if (paso > 1) { setPaso(p => p - 1); setIntento(false); }
    else navigation.goBack();
  }

  async function continuar() {
    setIntento(true);
    if (Object.keys(errores).length > 0) {
      if (paso === 1) marcaRef.current?.focus();
      if (paso === 2) (errores.modelo ? modeloRef : anioRef).current?.focus();
      if (paso === 3) (errores.placa ? placaRef : kmRef).current?.focus();
      return;
    }
    if (paso < TOTAL_PASOS) { setPaso(p => p + 1); setIntento(false); return; }
    await guardar();
  }

  async function guardar() {
    setLoading(true);
    setErrorGuardar(null);
    const { data, error } = await supabase.from('vehiculos').insert({
      propietario_id: session?.user.id,
      tipo,
      subtipo: null,
      marca: marca.trim(),
      modelo: modelo.trim(),
      anio: parseInt(anio, 10),
      color: '',
      placa,
      cilindraje: null,
      kilometraje: parseInt(km, 10) || 0,
    }).select('id, marca, modelo, anio, placa, tipo, kilometraje').single();
    setLoading(false);

    if (error || !data) {
      setErrorGuardar(error?.code === '23505' ? 'Ya existe un vehículo con esa placa.' : mensajeError(error));
      return;
    }
    setGuardado(data as Guardado);
  }

  // ─── Cierre: confirmacion y siguiente paso (Peak-End) ──────────────────────
  if (guardado) {
    const vehiculo = guardado;
    return (
      <View style={s.container}>
        <ScrollView contentContainerStyle={s.exito} showsVerticalScrollIndicator={false}>
          <View style={s.exitoIcono}><IconCircleCheck size={48} color={colors.accent} /></View>
          <Text style={s.exitoTitulo}>¡Listo!</Text>
          <Text style={s.exitoSub}>Tu {vehiculo.marca} {vehiculo.modelo} ya está en tu garage</Text>
          <View style={s.placa}><Text style={s.placaTexto}>{vehiculo.placa}</Text></View>

          <Text style={s.siguiente}>Siguiente paso</Text>

          <Pressable
            style={({ pressed }) => [s.fila, s.filaPrincipal, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.replace('Documentos', { vehiculo })}
            accessibilityRole="button"
          >
            <View style={s.filaIcono}><IconShieldCheck size={22} color={colors.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.filaTitulo}>Registrar mi SOAT</Text>
              <Text style={s.filaSub}>Te avisamos antes de que venza</Text>
            </View>
            <IconChevronRight size={20} color={colors.accent} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.fila, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.replace('EditarVehiculo', { vehiculo })}
            accessibilityRole="button"
          >
            <View style={s.filaIcono}><IconPencil size={22} color={colors.textSecondary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.filaTitulo}>Agregar más detalles</Text>
              <Text style={s.filaSub}>Color, cilindraje, tipo de moto</Text>
            </View>
            <IconChevronRight size={20} color={colors.textTertiary} />
          </Pressable>
        </ScrollView>

        <View style={s.footer}>
          <Pressable
            style={({ pressed }) => [s.botonSecundario, pressed && { opacity: 0.8 }]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={s.botonSecundarioTexto}>Ir a mi garage</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Pasos ─────────────────────────────────────────────────────────────────
  const preguntas = [
    '¿Qué vehículo tienes?',
    '¿Cuál es el modelo y el año?',
    'Último paso: la placa',
  ];

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={atras}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={paso > 1 ? 'Paso anterior' : 'Volver'}
        >
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Agregar vehículo</Text>
        <Text style={s.pasoTexto}>Paso {paso} de {TOTAL_PASOS}</Text>
      </View>

      <View style={s.progreso} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: TOTAL_PASOS, now: paso }}>
        {[1, 2, 3].map(n => <View key={n} style={[s.segmento, n <= paso && s.segmentoOn]} />)}
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.preview}>
          <View style={s.previewIcono}><TipoIcon size={26} color={colors.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.previewTitulo} numberOfLines={1}>{titulo}</Text>
            <Text style={s.previewDetalle} numberOfLines={1}>{detalle}</Text>
          </View>
        </View>

        <Text style={s.pregunta}>{preguntas[paso - 1]}</Text>

        {paso === 1 && (
          <View style={{ gap: spacing.xl }}>
            <View style={s.tipos}>
              {TIPOS.map(({ key, label, Icon }) => {
                const activo = tipo === key;
                return (
                  <Pressable
                    key={key}
                    style={({ pressed }) => [s.tipoTile, activo && s.tipoTileActivo, pressed && { opacity: 0.85 }]}
                    onPress={() => { setTipo(key); setMarca(''); setOtraMarca(false); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activo }}
                    accessibilityLabel={label}
                  >
                    <Icon size={28} color={activo ? colors.accent : colors.textSecondary} />
                    <Text style={[s.tipoLabel, activo && s.tipoLabelActivo]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Campo label={marcasVisibles.length ? '¿De qué marca es?' : '¿Qué marca o tipo es?'} sinMarca error={ver('marca')}>
              {marcasVisibles.length > 0 && (
                <View style={s.chips}>
                  {marcasVisibles.map(m => {
                    const activo = !otraMarca && marca === m;
                    return (
                      <Pressable
                        key={m}
                        style={({ pressed }) => [s.chip, activo && s.chipActivo, pressed && { opacity: 0.85 }]}
                        onPress={() => { setMarca(m); setOtraMarca(false); }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: activo }}
                      >
                        <Text style={[s.chipTexto, activo && s.chipTextoActivo]}>{m}</Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    style={({ pressed }) => [s.chip, otraMarca && s.chipActivo, pressed && { opacity: 0.85 }]}
                    onPress={() => { setOtraMarca(true); setMarca(''); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: otraMarca }}
                  >
                    <Text style={[s.chipTexto, otraMarca && s.chipTextoActivo]}>Otra</Text>
                  </Pressable>
                </View>
              )}
              {mostrarCampoMarca && (
                <Entrada
                  inputRef={marcaRef}
                  value={marca}
                  onChangeText={setMarca}
                  error={!!ver('marca')}
                  placeholder="Escribe la marca"
                  autoCapitalize="words"
                  autoFocus={marcasVisibles.length > 0}
                  returnKeyType="next"
                  onSubmitEditing={continuar}
                />
              )}
            </Campo>
          </View>
        )}

        {paso === 2 && (
          <View style={{ gap: spacing.lg }}>
            <Campo label="Modelo" sinMarca error={ver('modelo')} ayuda={tipo === 'moto' ? 'Por ejemplo: MT-07, FZ 2.0, NMAX' : 'Por ejemplo: Spark, Duster, Corolla'}>
              <Entrada
                inputRef={modeloRef}
                value={modelo}
                onChangeText={setModelo}
                error={!!ver('modelo')}
                placeholder="Modelo"
                autoCapitalize="words"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => anioRef.current?.focus()}
                blurOnSubmit={false}
              />
            </Campo>
            <Campo label="Año" sinMarca error={ver('anio')}>
              <Entrada
                inputRef={anioRef}
                value={anio}
                onChangeText={(t) => setAnio(t.replace(/\D/g, ''))}
                error={!!ver('anio')}
                placeholder="2022"
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="next"
                onSubmitEditing={continuar}
              />
            </Campo>
          </View>
        )}

        {paso === 3 && (
          <View style={{ gap: spacing.lg }}>
            <Campo label="Placa" sinMarca error={ver('placa')} ayuda={tipo === 'moto' ? 'Ejemplo: ABC12D' : 'Ejemplo: ABC123'}>
              <Entrada
                inputRef={placaRef}
                value={placa}
                onChangeText={(t) => setPlaca(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                error={!!ver('placa')}
                placeholder={tipo === 'moto' ? 'ABC12D' : 'ABC123'}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                autoFocus
                style={s.inputPlaca}
                returnKeyType="next"
                onSubmitEditing={() => kmRef.current?.focus()}
                blurOnSubmit={false}
              />
            </Campo>
            <Campo label="Kilometraje actual" error={ver('km')} ayuda="Nos sirve para avisarte del mantenimiento. Si no lo sabes, déjalo en blanco.">
              <Entrada
                inputRef={kmRef}
                value={km}
                onChangeText={(t) => setKm(t.replace(/\D/g, ''))}
                error={!!ver('km')}
                placeholder="0"
                keyboardType="number-pad"
                maxLength={7}
                returnKeyType="done"
                onSubmitEditing={continuar}
              />
            </Campo>

            {errorGuardar && (
              <View style={s.errorGuardar} accessibilityLiveRegion="polite">
                <IconAlertCircle size={18} color={colors.dangerAction} />
                <Text style={s.errorGuardarTexto}>{errorGuardar}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={s.tranquilo}>Podrás cambiar estos datos después.</Text>
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.boton, loading && s.botonOcupado, pressed && { opacity: 0.85 }]}
          onPress={continuar}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={paso < TOTAL_PASOS ? 'Continuar' : 'Guardar vehículo'}
        >
          {loading
            ? <ActivityIndicator color={colors.onAccent} />
            : <Text style={s.botonTexto}>{paso < TOTAL_PASOS ? 'Continuar' : 'Guardar vehículo'}</Text>}
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
  headerTitle: { flex: 1, fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3 },
  pasoTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },

  progreso: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  segmento: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.bgSurface },
  segmentoOn: { backgroundColor: colors.accent },

  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.xl },

  preview: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.accentDark, borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)', padding: spacing.md,
  },
  previewIcono: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: 'rgba(2,2,2,0.35)', justifyContent: 'center', alignItems: 'center',
  },
  previewTitulo: { fontFamily: fonts.display, fontSize: 17, color: colors.textPrimary, letterSpacing: -0.2 },
  previewDetalle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  pregunta: { fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary, letterSpacing: -0.5, lineHeight: 32 },

  tipos: { flexDirection: 'row', gap: spacing.sm },
  tipoTile: {
    flex: 1, minHeight: 84, borderRadius: radius.md, gap: 6,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  tipoTileActivo: { borderColor: colors.accent, backgroundColor: 'rgba(72,151,90,0.12)' },
  tipoLabel: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  tipoLabelActivo: { color: colors.accent },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  chip: {
    minHeight: 46, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
  },
  chipActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTexto: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary },
  chipTextoActivo: { fontFamily: fonts.bold, color: colors.onAccent },

  inputPlaca: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: 3 },
  errorGuardar: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center',
    backgroundColor: colors.dangerActionBg, borderWidth: 1, borderColor: colors.dangerActionBorder,
    borderRadius: radius.md, padding: spacing.md,
  },
  errorGuardarTexto: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },

  tranquilo: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, textAlign: 'center' },

  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl,
    backgroundColor: colors.bgPrimary, borderTopWidth: 1, borderTopColor: colors.bgCard,
  },
  boton: {
    backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 54,
    justifyContent: 'center', alignItems: 'center',
  },
  botonOcupado: { opacity: 0.6 },
  botonTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
  botonSecundario: {
    minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  botonSecundarioTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },

  /* Cierre */
  exito: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, paddingVertical: 60, gap: spacing.md },
  exitoIcono: {
    alignSelf: 'center', width: 96, height: 96, borderRadius: radius.xl, backgroundColor: colors.accentDark,
    borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)', justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exitoTitulo: { fontFamily: fonts.display, fontSize: 32, color: colors.textPrimary, textAlign: 'center', letterSpacing: -0.5 },
  exitoSub: { fontFamily: fonts.body, fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
  placa: {
    alignSelf: 'center', backgroundColor: '#f2c94c', borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(2,2,2,0.5)', marginTop: spacing.xs,
  },
  placaTexto: { fontFamily: fonts.bold, fontSize: 16, color: '#020202', letterSpacing: 2 },
  siguiente: {
    fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.6, marginTop: spacing.xl,
  },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 68,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  filaPrincipal: { borderColor: colors.accent, backgroundColor: colors.accentDark },
  filaIcono: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(2,2,2,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  filaTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  filaSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
