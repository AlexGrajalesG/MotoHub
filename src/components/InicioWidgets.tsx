import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import {
  IconAlertTriangle, IconClock, IconChevronRight, IconCircleCheck, IconCircle,
  IconGauge, IconBellPlus, IconTool, IconX, IconCheck,
} from '@tabler/icons-react-native';
import { tokens } from '../lib/tokens';
import type { Alerta, PasoInicial } from '../lib/inicio';

const { colors, spacing, radius, fonts } = tokens;

// ─── Que necesito atender ────────────────────────────────────────────────────

const MAX_ALERTAS = 4;

export function ResumenAtencion({ alertas, onPressAlerta }: {
  alertas: Alerta[];
  onPressAlerta: (a: Alerta) => void;
}) {
  if (alertas.length === 0) {
    return (
      <View style={[s.card, s.cardOk]} accessibilityRole="summary">
        <IconCircleCheck size={28} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={s.okTitulo}>Todo al día</Text>
          <Text style={s.okSub}>No tienes nada pendiente. Te avisaremos cuando algo esté por vencer.</Text>
        </View>
      </View>
    );
  }

  const visibles = alertas.slice(0, MAX_ALERTAS);
  const resto = alertas.length - visibles.length;
  const hayVencidas = alertas.some(a => a.severidad === 'vencido');

  return (
    <View style={[s.card, hayVencidas ? s.cardCritica : s.cardAviso]}>
      <View style={s.cabecera}>
        <Text style={s.cardTitulo}>Necesitas atención</Text>
        <View style={[s.contador, hayVencidas ? s.contadorCritico : s.contadorAviso]}>
          <Text style={s.contadorTexto}>{alertas.length}</Text>
        </View>
      </View>

      {visibles.map((a, i) => (
        <Pressable
          key={a.id}
          style={({ pressed }) => [s.alerta, i > 0 && s.alertaBorde, pressed && { opacity: 0.7 }]}
          onPress={() => onPressAlerta(a)}
          accessibilityRole="button"
          accessibilityLabel={`${a.titulo}, ${a.vehiculoNombre}. ${a.detalle}`}
        >
          {a.severidad === 'vencido'
            ? <IconAlertTriangle size={22} color={colors.dangerAction} />
            : <IconClock size={22} color={colors.accentSoft} />}
          <View style={{ flex: 1 }}>
            <Text style={s.alertaTitulo} numberOfLines={1}>{a.titulo}</Text>
            <Text style={s.alertaVehiculo} numberOfLines={1}>{a.vehiculoNombre}</Text>
          </View>
          <Text style={[s.alertaDetalle, a.severidad === 'vencido' && { color: colors.dangerAction }]} numberOfLines={1}>
            {a.detalle}
          </Text>
          <IconChevronRight size={18} color={colors.textTertiary} />
        </Pressable>
      ))}

      {resto > 0 && <Text style={s.resto}>y {resto} más</Text>}
    </View>
  );
}

// ─── Primeros pasos ──────────────────────────────────────────────────────────

export function PrimerosPasos({ pasos, hechos, total, onPressPaso }: {
  pasos: PasoInicial[];
  hechos: number;
  total: number;
  onPressPaso: (p: PasoInicial) => void;
}) {
  return (
    <View style={s.card}>
      <View style={s.cabecera}>
        <Text style={s.cardTitulo}>Primeros pasos</Text>
        <Text style={s.progresoTexto}>{hechos} de {total}</Text>
      </View>

      <View style={s.barra} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: hechos }}>
        <View style={[s.barraRelleno, { width: `${(hechos / total) * 100}%` }]} />
      </View>

      {pasos.map((p, i) => (
        <Pressable
          key={p.key}
          style={({ pressed }) => [s.paso, i > 0 && s.alertaBorde, pressed && !p.hecho && { opacity: 0.7 }]}
          onPress={() => !p.hecho && onPressPaso(p)}
          disabled={p.hecho}
          accessibilityRole="button"
          accessibilityState={{ disabled: p.hecho, checked: p.hecho }}
          accessibilityLabel={`${p.titulo}${p.hecho ? ', listo' : ''}`}
        >
          {p.hecho
            ? <View style={s.checkHecho}><IconCheck size={14} color={colors.onAccent} /></View>
            : <IconCircle size={24} color={colors.textTertiary} />}
          <View style={{ flex: 1 }}>
            <Text style={[s.pasoTitulo, p.hecho && s.pasoHecho]}>{p.titulo}</Text>
            {!p.hecho && <Text style={s.pasoDetalle}>{p.detalle}</Text>}
          </View>
          {!p.hecho && <IconChevronRight size={18} color={colors.accent} />}
        </Pressable>
      ))}
    </View>
  );
}

// ─── Acciones rapidas ────────────────────────────────────────────────────────

export function AccionesRapidas({ onKm, onRecordatorio, onServicio }: {
  onKm: () => void;
  onRecordatorio: () => void;
  onServicio: () => void;
}) {
  const acciones = [
    { key: 'km', label: 'Actualizar km', Icon: IconGauge, onPress: onKm },
    { key: 'rec', label: 'Recordatorio', Icon: IconBellPlus, onPress: onRecordatorio },
    { key: 'srv', label: 'Registrar servicio', Icon: IconTool, onPress: onServicio },
  ];
  return (
    <View style={s.acciones}>
      {acciones.map(({ key, label, Icon, onPress }) => (
        <Pressable
          key={key}
          style={({ pressed }) => [s.accion, pressed && { opacity: 0.8 }]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <View style={s.accionIcono}><Icon size={22} color={colors.accent} /></View>
          <Text style={s.accionTexto} numberOfLines={2}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Elegir vehiculo (cuando hay mas de uno) ─────────────────────────────────

export function SelectorVehiculo({ visible, titulo, vehiculos, onElegir, onCerrar }: {
  visible: boolean;
  titulo: string;
  vehiculos: { id: string; marca: string; modelo: string; placa: string }[];
  onElegir: (id: string) => void;
  onCerrar: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable style={s.fondoModal} onPress={onCerrar} accessibilityLabel="Cerrar">
        <Pressable style={s.hoja} onPress={() => {}}>
          <View style={s.hojaCabecera}>
            <Text style={s.hojaTitulo}>{titulo}</Text>
            <Pressable onPress={onCerrar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar">
              <IconX size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 320 }}>
            {vehiculos.map(v => (
              <Pressable
                key={v.id}
                style={({ pressed }) => [s.opcion, pressed && { opacity: 0.7 }]}
                onPress={() => onElegir(v.id)}
                accessibilityRole="button"
              >
                <Text style={s.opcionNombre} numberOfLines={1}>{v.marca} {v.modelo}</Text>
                <View style={s.placa}><Text style={s.placaTexto}>{v.placa.toUpperCase()}</Text></View>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.lg,
  },
  cardOk: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.accentDark, borderColor: 'rgba(72,151,90,0.35)' },
  cardCritica: { borderColor: colors.dangerActionBorder },
  cardAviso: { borderColor: 'rgba(163,209,174,0.35)' },

  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  cardTitulo: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary, letterSpacing: -0.2 },
  contador: { minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
  contadorCritico: { backgroundColor: colors.dangerAction },
  contadorAviso: { backgroundColor: colors.accentSoft },
  contadorTexto: { fontFamily: fonts.bold, fontSize: 13, color: colors.onAccent },

  okTitulo: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary },
  okSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 19 },

  alerta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingVertical: spacing.sm },
  alertaBorde: { borderTopWidth: 1, borderTopColor: colors.bgSurface },
  alertaTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  alertaVehiculo: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 1 },
  alertaDetalle: { fontFamily: fonts.heading, fontSize: 13, color: colors.accentSoft, maxWidth: '38%' },
  resto: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: spacing.xs, textAlign: 'center' },

  progresoTexto: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  barra: { height: 6, borderRadius: 3, backgroundColor: colors.bgSurface, overflow: 'hidden', marginBottom: spacing.sm },
  barraRelleno: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingVertical: spacing.sm },
  checkHecho: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  pasoTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  pasoHecho: { color: colors.textTertiary, textDecorationLine: 'line-through' },
  pasoDetalle: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 1 },

  acciones: { flexDirection: 'row', gap: spacing.sm },
  accion: {
    flex: 1, minHeight: 92, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  accionIcono: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(72,151,90,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  accionTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.textPrimary, textAlign: 'center' },

  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: spacing.xl },
  hoja: { backgroundColor: colors.bgCard, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.bgSurface, padding: spacing.lg },
  hojaCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  hojaTitulo: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary },
  opcion: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md,
    minHeight: 56, borderTopWidth: 1, borderTopColor: colors.bgSurface,
  },
  opcionNombre: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  placa: { backgroundColor: colors.bgSurface, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  placaTexto: { fontFamily: fonts.bold, fontSize: 12, color: colors.textPrimary, letterSpacing: 1 },
});
