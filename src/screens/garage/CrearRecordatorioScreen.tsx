import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { IconCheck } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { programarNotificacionFecha } from '../../lib/notificaciones';
import { tokens } from '../../lib/tokens';
import { TIPOS_INFO } from './RecordatoriosScreen';
import CabeceraPantalla from '../../components/CabeceraPantalla';
import { Campo, Entrada } from '../../components/FormField';

const { colors, spacing, radius, fonts } = tokens;

const KM_AVISO_OPCIONES = [500, 1000, 2000, 3000];

function parseFecha(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (!isNaN(new Date(iso).getTime())) return iso;
  }
  return null;
}

export default function CrearRecordatorioScreen({ route, navigation }: any) {
  const { vehiculo } = route.params;
  const [tipo, setTipo] = useState('soat');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [kmLimite, setKmLimite] = useState('');
  const [kmAviso, setKmAviso] = useState('1000');
  const [loading, setLoading] = useState(false);

  async function handleGuardar() {
    const fechaISO = parseFecha(fecha);
    const km = kmLimite ? parseInt(kmLimite) : null;
    const aviso = kmAviso ? parseInt(kmAviso) : 1000;

    if (!fechaISO && !km) {
      Alert.alert('Falta un dato', 'Agrega al menos una fecha límite o un kilometraje límite');
      return;
    }
    if (tipo === 'personalizado' && !descripcion.trim()) {
      Alert.alert('Falta la descripción', 'Escribe una descripción para el recordatorio personalizado');
      return;
    }
    if (fecha && !fechaISO) {
      Alert.alert('Fecha inválida', 'Usa el formato DD/MM/AAAA');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('recordatorios').insert({
      vehiculo_id: vehiculo.id,
      tipo,
      descripcion: descripcion.trim() || null,
      fecha_limite: fechaISO,
      km_limite: km,
      km_aviso: km ? aviso : null,
    });
    setLoading(false);

    if (error) { Alert.alert('No se pudo guardar', 'Revisa tu conexión e intenta de nuevo.'); return; }

    if (fechaISO) {
      const label = TIPOS_INFO[tipo]?.label ?? tipo;
      const nombre = `${vehiculo.marca} ${vehiculo.modelo}`;
      const fechaNotif = new Date(fechaISO + 'T09:00:00');
      await programarNotificacionFecha(
        `rec-${vehiculo.id}-${tipo}-${fechaISO}`,
        `${label} — ${nombre}`,
        `Vence hoy: ${fecha}`,
        fechaNotif,
      );
    }

    navigation.goBack();
  }

  const tieneKmLimite = kmLimite.trim().length > 0;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <CabeceraPantalla titulo="Nuevo recordatorio" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.subtitulo}>{vehiculo.marca} {vehiculo.modelo}</Text>

        <Campo label="Tipo" sinMarca>
          <View style={s.tiposGrid}>
            {Object.entries(TIPOS_INFO).map(([key, { label, Icon }]) => {
              const activo = tipo === key;
              return (
                <Pressable
                  key={key}
                  style={({ pressed }) => [s.tipoChip, activo && s.tipoChipActive, pressed && { opacity: 0.85 }]}
                  onPress={() => setTipo(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                >
                  <Icon size={15} color={activo ? colors.onAccent : colors.textSecondary} />
                  <Text style={[s.tipoLabel, activo && s.tipoLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Campo>

        <Campo label="Descripción" requerido={tipo === 'personalizado'}>
          <Entrada
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder={tipo === 'personalizado' ? 'Ej: Cambio de correa de distribución' : 'Notas adicionales'}
          />
        </Campo>

        <View style={s.divisor}>
          <Text style={s.sectionTitle}>Cuándo alertar</Text>
          <Text style={s.sectionHint}>Puedes agregar fecha, kilometraje o ambos</Text>
        </View>

        <Campo label="Fecha límite">
          <Entrada
            value={fecha}
            onChangeText={setFecha}
            placeholder="31/12/2026"
            keyboardType="numbers-and-punctuation"
          />
        </Campo>

        <Campo label="Kilometraje límite">
          <Entrada
            value={kmLimite}
            onChangeText={setKmLimite}
            placeholder={`Actual: ${vehiculo.kilometraje.toLocaleString()} km`}
            keyboardType="number-pad"
          />
        </Campo>

        {tieneKmLimite && (
          <Campo label="Avisar con cuántos km de anticipación" sinMarca>
            <View style={s.avisarRow}>
              {KM_AVISO_OPCIONES.map(op => {
                const activo = kmAviso === String(op);
                return (
                  <Pressable
                    key={op}
                    style={({ pressed }) => [s.avisarChip, activo && s.avisarChipActive, pressed && { opacity: 0.85 }]}
                    onPress={() => setKmAviso(String(op))}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activo }}
                  >
                    <Text style={[s.avisarChipText, activo && s.avisarChipTextActive]}>{op >= 1000 ? `${op / 1000}k` : op} km</Text>
                  </Pressable>
                );
              })}
              <Entrada
                style={s.avisarInput}
                placeholder="Otro"
                value={KM_AVISO_OPCIONES.map(String).includes(kmAviso) ? '' : kmAviso}
                onChangeText={setKmAviso}
                keyboardType="number-pad"
              />
            </View>
          </Campo>
        )}
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
            : <><IconCheck size={18} color={colors.onAccent} /><Text style={s.botonTexto}>Guardar recordatorio</Text></>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },
  subtitulo: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: -spacing.sm },

  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tipoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40,
    backgroundColor: colors.bgCard, borderRadius: radius.pill, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.bgSurface,
  },
  tipoChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tipoLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  tipoLabelActive: { fontFamily: fonts.bold, color: colors.onAccent },

  divisor: { borderTopWidth: 1, borderTopColor: colors.bgSurface, paddingTop: spacing.md, gap: 4 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.textPrimary },
  sectionHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },

  avisarRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  avisarChip: {
    minHeight: 40, backgroundColor: colors.bgCard, borderRadius: radius.pill, justifyContent: 'center',
    paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.bgSurface,
  },
  avisarChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  avisarChipText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  avisarChipTextActive: { fontFamily: fonts.bold, color: colors.onAccent },
  avisarInput: { width: 80, minHeight: 40, paddingHorizontal: spacing.sm },

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
