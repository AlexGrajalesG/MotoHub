import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  IconArrowLeft, IconCalendar, IconClock,
  IconBike, IconCheck, IconNotes,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { formatPrecioServicio, type TipoPrecio } from '../../lib/precio';

const { colors, spacing, radius, fonts } = tokens;

type Vehiculo = { id: string; marca: string; modelo: string; };
type Servicio = { id: string; nombre: string; tipo_precio: TipoPrecio; precio_base: number | null; };
type Horario = Record<string, { abre: string; cierra: string } | null> | null | undefined;

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DIA_ABBR: Record<string, string> = {
  domingo: 'Dom', lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
};
const MESES_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

type DiaOpcion = {
  iso: string;
  numero: number;
  abbr: string;
  mes: string;
  turno: { abre: string; cierra: string } | null;
};

function generarDias(horario: Horario): DiaOpcion[] {
  const dias: DiaOpcion[] = [];
  const hoy = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
    const diaSemana = DIAS[d.getDay()];
    const turno = horario ? (horario[diaSemana] ?? null) : { abre: '08:00', cierra: '18:00' };
    dias.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      numero: d.getDate(),
      abbr: DIA_ABBR[diaSemana],
      mes: MESES_ABBR[d.getMonth()],
      turno,
    });
  }
  return dias;
}

function generarSlots(turno: { abre: string; cierra: string } | null, intervalo = 30): string[] {
  if (!turno) return [];
  const [ah, am] = turno.abre.split(':').map(Number);
  const [ch, cm] = turno.cierra.split(':').map(Number);
  let mins = ah * 60 + am;
  const fin = ch * 60 + cm;
  const slots: string[] = [];
  while (mins < fin) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    mins += intervalo;
  }
  return slots;
}

export default function SolicitarCitaScreen({ route, navigation }: any) {
  const { negocio, servicios: serviciosPre } = route.params as {
    negocio: { id: string; nombre: string; horario?: Horario };
    servicios?: Servicio[];
  };
  const { session } = useAuth();

  const [vehiculos,  setVehiculos]  = useState<Vehiculo[]>([]);
  const [servicios,  setServicios]  = useState<Servicio[]>(serviciosPre ?? []);
  const [vehiculoId, setVehiculoId] = useState<string | null>(null);
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [dias]       = useState<DiaOpcion[]>(() => generarDias(negocio.horario));
  const [fechaSel,   setFechaSel]   = useState<string | null>(null);
  const [horaSel,    setHoraSel]    = useState<string | null>(null);
  const [nota,       setNota]       = useState('');
  const [enviando,   setEnviando]   = useState(false);
  const [enviado,    setEnviado]    = useState(false);

  const slotsDelDia = fechaSel
    ? generarSlots(dias.find(d => d.iso === fechaSel)?.turno ?? null)
    : [];

  useEffect(() => {
    fetchVehiculos();
    if (!serviciosPre || serviciosPre.length === 0) fetchServicios();
  }, []);

  async function fetchVehiculos() {
    const { data } = await supabase
      .from('vehiculos')
      .select('id, marca, modelo')
      .eq('propietario_id', session!.user.id)
      .eq('activo', true)
      .order('created_at', { ascending: false });
    const lista = (data ?? []) as Vehiculo[];
    setVehiculos(lista);
    if (lista.length === 1) setVehiculoId(lista[0].id);
  }

  async function fetchServicios() {
    const { data } = await supabase
      .from('servicios')
      .select('id, nombre, tipo_precio, precio_base')
      .eq('negocio_id', negocio.id)
      .eq('activo', true)
      .order('nombre');
    setServicios((data ?? []) as Servicio[]);
  }

  async function enviar() {
    if (!fechaSel || !horaSel) {
      Alert.alert('Falta información', 'Selecciona la fecha y hora de tu cita');
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase.from('citas').insert({
        usuario_id:       session!.user.id,
        negocio_id:       negocio.id,
        servicio_id:      servicioId ?? null,
        vehiculo_id:      vehiculoId ?? null,
        fecha_solicitada: fechaSel,
        hora_solicitada:  horaSel,
        descripcion:      nota.trim() || null,
        estado:           'pendiente',
      });
      if (error) throw error;
      setEnviado(true);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo enviar la solicitud');
    } finally {
      setEnviando(false);
    }
  }

  // ── Estado de éxito ───────────────────────────────────────────────────────────
  if (enviado) {
    return (
      <View style={s.successWrap}>
        <View style={s.successCircle}>
          <IconCheck size={44} color="#34c759" />
        </View>
        <Text style={s.successTitle}>¡Solicitud enviada!</Text>
        <Text style={s.successSub}>
          {negocio.nombre} recibirá tu solicitud.{'\n'}Te confirmarán la cita pronto.
        </Text>
        <Pressable
          style={({ pressed }) => [s.successBtn, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={s.successBtnText}>Listo</Text>
        </Pressable>
      </View>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
        >
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>Solicitar cita</Text>
          <Text style={s.headerSub} numberOfLines={1}>{negocio.nombre}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Vehículo — solo si tienen más de uno */}
        {vehiculos.length > 1 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Tu vehículo</Text>
            <View style={s.chips}>
              {vehiculos.map(v => (
                <Pressable
                  key={v.id}
                  style={[s.chip, vehiculoId === v.id && s.chipOn]}
                  onPress={() => setVehiculoId(v.id)}
                >
                  <IconBike size={13} color={vehiculoId === v.id ? colors.onAccent : colors.textSecondary} />
                  <Text style={[s.chipText, vehiculoId === v.id && s.chipTextOn]}>
                    {v.marca} {v.modelo}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Servicio */}
        {servicios.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>
              Servicio <Text style={s.optional}>(opcional)</Text>
            </Text>
            <View style={s.chips}>
              {servicios.map(sv => (
                <Pressable
                  key={sv.id}
                  style={[s.chip, servicioId === sv.id && s.chipOn]}
                  onPress={() => setServicioId(servicioId === sv.id ? null : sv.id)}
                >
                  <Text style={[s.chipText, servicioId === sv.id && s.chipTextOn]}>
                    {sv.nombre} · {formatPrecioServicio(sv)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Fecha */}
        <View style={s.section}>
          <View style={s.sectionLabelRow}>
            <IconCalendar size={14} color={colors.textTertiary} />
            <Text style={s.sectionLabel}>Fecha</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.daysRow}>
            {dias.map(d => {
              const cerrado = !d.turno;
              const selected = fechaSel === d.iso;
              return (
                <Pressable
                  key={d.iso}
                  style={[s.dayChip, selected && s.dayChipOn, cerrado && s.dayChipOff]}
                  onPress={() => {
                    if (cerrado) return;
                    setFechaSel(d.iso);
                    setHoraSel(null);
                  }}
                  disabled={cerrado}
                >
                  <Text style={[s.dayChipAbbr, selected && s.dayChipTextOn, cerrado && s.dayChipTextOff]}>
                    {d.abbr}
                  </Text>
                  <Text style={[s.dayChipNum, selected && s.dayChipTextOn, cerrado && s.dayChipTextOff]}>
                    {d.numero}
                  </Text>
                  <Text style={[s.dayChipMes, selected && s.dayChipTextOn, cerrado && s.dayChipTextOff]}>
                    {d.mes}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Hora */}
        {fechaSel && (
          <View style={s.section}>
            <View style={s.sectionLabelRow}>
              <IconClock size={14} color={colors.textTertiary} />
              <Text style={s.sectionLabel}>Hora</Text>
            </View>
            {slotsDelDia.length === 0 ? (
              <Text style={s.optional}>Este día el negocio está cerrado</Text>
            ) : (
              <View style={s.chips}>
                {slotsDelDia.map(slot => (
                  <Pressable
                    key={slot}
                    style={[s.chip, horaSel === slot && s.chipOn]}
                    onPress={() => setHoraSel(slot)}
                  >
                    <Text style={[s.chipText, horaSel === slot && s.chipTextOn]}>{slot}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Descripción */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>
            ¿Qué necesitas? <Text style={s.optional}>(opcional)</Text>
          </Text>
          <View style={[s.inputRow, s.textareaWrap]}>
            <IconNotes size={16} color={colors.textTertiary} style={{ marginTop: 2 }} />
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="Describe el problema o lo que necesitas..."
              placeholderTextColor={colors.textTertiary}
              value={nota}
              onChangeText={setNota}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            s.sendBtn,
            (!fechaSel || !horaSel || enviando) && s.sendBtnOff,
            pressed && { opacity: 0.85 },
          ]}
          onPress={enviar}
          disabled={!fechaSel || !horaSel || enviando}
        >
          {enviando
            ? <ActivityIndicator color={colors.onAccent} size="small" />
            : <Text style={s.sendBtnText}>Enviar solicitud</Text>
          }
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  /* ── Header ── */
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
  headerInfo:  { flex: 1 },
  headerTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 },
  headerSub:   { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 48 },

  /* ── Secciones ── */
  section:      { marginBottom: spacing.xl },
  sectionLabel: { fontFamily: fonts.heading, fontSize: 13, color: colors.textPrimary, marginBottom: spacing.sm },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  optional:     { fontFamily: fonts.body, color: colors.textTertiary },

  /* ── Selector de fecha ── */
  daysRow: { gap: spacing.sm, paddingRight: spacing.xl },
  dayChip: {
    alignItems: 'center', gap: 2,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    minWidth: 56,
  },
  dayChipOn:       { backgroundColor: colors.accent, borderColor: colors.accent },
  dayChipOff:      { opacity: 0.35 },
  dayChipAbbr:     { fontFamily: fonts.heading, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' },
  dayChipNum:      { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary, letterSpacing: -0.3 },
  dayChipMes:      { fontFamily: fonts.body, fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase' },
  dayChipTextOn:   { color: colors.onAccent },
  dayChipTextOff:  { color: colors.textTertiary },

  /* ── Chips ── */
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, paddingVertical: 8, minHeight: 36,
  },
  chipOn:      { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText:    { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  chipTextOn:  { color: colors.onAccent },

  /* ── Inputs ── */
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  textareaWrap: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  input: {
    flex: 1, fontFamily: fonts.body, fontSize: 15,
    color: colors.textPrimary, paddingVertical: 0,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  /* ── Botón enviar ── */
  sendBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.sm, minHeight: 54,
  },
  sendBtnOff:  { opacity: 0.45 },
  sendBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },

  /* ── Éxito ── */
  successWrap: {
    flex: 1, backgroundColor: colors.bgPrimary,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  successCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderWidth: 1, borderColor: 'rgba(52,199,89,0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontFamily: fonts.display, fontSize: 26,
    color: colors.textPrimary, letterSpacing: -0.4,
    marginBottom: spacing.sm,
  },
  successSub: {
    fontFamily: fonts.body, fontSize: 15,
    color: colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: spacing.xxl,
  },
  successBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl,
    minHeight: 52, justifyContent: 'center',
  },
  successBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
});
