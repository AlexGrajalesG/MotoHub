import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { IconMotorbike, IconCar, IconTruck, IconDots, IconCheck } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import { mensajeError } from '../../lib/errores';
import CabeceraPantalla from '../../components/CabeceraPantalla';
import { Campo, Entrada } from '../../components/FormField';

const { colors, spacing, radius, fonts } = tokens;

const TIPOS = [
  { key: 'moto', label: 'Moto', Icon: IconMotorbike },
  { key: 'carro', label: 'Carro', Icon: IconCar },
  { key: 'camioneta', label: 'Camioneta', Icon: IconTruck },
  { key: 'otro', label: 'Otro', Icon: IconDots },
] as const;

const SUBTIPOS_MOTO = [
  { valor: 'naked', label: 'Naked' },
  { valor: 'sport', label: 'Sport' },
  { valor: 'scooter', label: 'Scooter' },
  { valor: 'doble proposito', label: 'Doble propósito' },
  { valor: 'otro', label: 'Otro' },
];

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={s.seccionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

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
  const [intento, setIntento] = useState(false);

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    const { data } = await supabase.from('vehiculos').select('*').eq('id', vehiculo.id).single();
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

  const errMarca = !marca.trim() ? 'Escribe la marca' : undefined;
  const errModelo = !modelo.trim() ? 'Escribe el modelo' : undefined;
  const errAnio = !anio ? 'Escribe el año' : undefined;
  const errPlaca = !placa.trim() ? 'Escribe la placa' : undefined;
  const ver = (e?: string) => (intento ? e : undefined);

  async function handleGuardar() {
    setIntento(true);
    if (errMarca || errModelo || errAnio || errPlaca) return;

    setLoading(true);
    const { error } = await supabase.from('vehiculos').update({
      tipo,
      subtipo: tipo === 'moto' && subtipo ? subtipo : null,
      marca: marca.trim(),
      modelo: modelo.trim(),
      anio: parseInt(anio),
      color: color.trim(),
      placa: placa.toUpperCase().trim(),
      cilindraje: cilindraje ? parseInt(cilindraje) : null,
      kilometraje: parseInt(kilometraje) || 0,
    }).eq('id', vehiculo.id);
    setLoading(false);

    if (error) {
      Alert.alert('No se pudo guardar', error.code === '23505' ? 'Ya existe un vehículo con esa placa.' : mensajeError(error));
      return;
    }
    navigation.goBack();
  }

  if (cargando) {
    return <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <CabeceraPantalla titulo="Editar vehículo" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Seccion titulo="Tipo de vehículo">
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
                  <Icon size={24} color={activo ? colors.accent : colors.textSecondary} />
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

        <Seccion titulo="Datos del vehículo">
          <Campo label="Marca" requerido error={ver(errMarca)}>
            <Entrada value={marca} onChangeText={setMarca} error={!!ver(errMarca)} placeholder="Ej: Yamaha, Chevrolet" autoCapitalize="words" />
          </Campo>
          <Campo label="Modelo" requerido error={ver(errModelo)}>
            <Entrada value={modelo} onChangeText={setModelo} error={!!ver(errModelo)} placeholder="Ej: MT-07, Spark" autoCapitalize="words" />
          </Campo>
          <View style={s.fila}>
            <View style={s.mitad}>
              <Campo label="Año" requerido error={ver(errAnio)}>
                <Entrada value={anio} onChangeText={(t) => setAnio(t.replace(/\D/g, ''))} error={!!ver(errAnio)} placeholder="2022" keyboardType="number-pad" maxLength={4} />
              </Campo>
            </View>
            <View style={s.mitad}>
              <Campo label="Color">
                <Entrada value={color} onChangeText={setColor} placeholder="Negro" autoCapitalize="words" />
              </Campo>
            </View>
          </View>
        </Seccion>

        <Seccion titulo="Identificación">
          <View style={s.fila}>
            <View style={s.mitad}>
              <Campo label="Placa" requerido error={ver(errPlaca)}>
                <Entrada
                  value={placa}
                  onChangeText={(t) => setPlaca(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  error={!!ver(errPlaca)}
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  maxLength={6}
                  style={s.inputPlaca}
                />
              </Campo>
            </View>
            <View style={s.mitad}>
              <Campo label="Cilindraje (cc)">
                <Entrada value={cilindraje} onChangeText={(t) => setCilindraje(t.replace(/\D/g, ''))} placeholder="700" keyboardType="number-pad" maxLength={5} />
              </Campo>
            </View>
          </View>
        </Seccion>

        <Seccion titulo="Estado actual">
          <Campo label="Kilometraje">
            <Entrada value={kilometraje} onChangeText={(t) => setKilometraje(t.replace(/\D/g, ''))} placeholder="0" keyboardType="number-pad" maxLength={7} />
          </Campo>
        </Seccion>
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.boton, loading && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
          onPress={handleGuardar}
          disabled={loading}
          accessibilityRole="button"
        >
          {loading
            ? <ActivityIndicator color={colors.onAccent} />
            : <><IconCheck size={18} color={colors.onAccent} /><Text style={s.botonTexto}>Guardar cambios</Text></>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },

  seccionTitulo: { fontFamily: fonts.heading, fontSize: 16, color: colors.textPrimary },

  tipos: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
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

  fila: { flexDirection: 'row', gap: spacing.md },
  mitad: { flex: 1 },
  inputPlaca: { fontFamily: fonts.bold, letterSpacing: 2 },

  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl,
    backgroundColor: colors.bgPrimary, borderTopWidth: 1, borderTopColor: colors.bgCard,
  },
  boton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 54,
  },
  botonTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
});
