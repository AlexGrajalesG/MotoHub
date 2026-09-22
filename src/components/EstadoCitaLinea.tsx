import { View, Text, StyleSheet } from 'react-native';
import { IconCheck, IconCircleX } from '@tabler/icons-react-native';
import { tokens } from '../lib/tokens';
import { pasosCita, type EstadoCita } from '../lib/citasTexto';

const { colors, spacing, fonts } = tokens;

/**
 * Estado de una cita como linea de tiempo conectada (Uniform Connectedness),
 * en vez de una insignia suelta. "cancelada" es un camino aparte, no un paso mas.
 */
export default function EstadoCitaLinea({ estado, compacto }: { estado: EstadoCita; compacto?: boolean }) {
  if (estado === 'cancelada') {
    return (
      <View style={s.canceladaRow} accessibilityLabel="Cita cancelada">
        <IconCircleX size={16} color={colors.dangerAction} />
        <Text style={s.canceladaTexto}>Cancelada</Text>
      </View>
    );
  }

  const pasos = pasosCita(estado);
  if (pasos.length === 0) return null;

  return (
    <View style={s.fila} accessibilityRole="progressbar" accessibilityLabel={`Estado de la cita: ${pasos.find(p => p.estado === 'actual')?.label ?? 'Completada'}`}>
      {pasos.map((paso, i) => (
        <View key={paso.key} style={s.paso}>
          <View style={s.nodoFila}>
            <View style={[s.circulo, paso.estado === 'hecho' && s.circuloHecho, paso.estado === 'actual' && s.circuloActual]}>
              {paso.estado === 'hecho' && <IconCheck size={11} color={colors.onAccent} />}
            </View>
            {i < pasos.length - 1 && <View style={[s.linea, paso.estado === 'hecho' && s.lineaHecha]} />}
          </View>
          {!compacto && (
            <Text style={[s.etiqueta, paso.estado !== 'pendiente' && s.etiquetaActiva]} numberOfLines={1}>
              {paso.label}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start' },
  paso: { alignItems: 'center', minWidth: 60 },
  nodoFila: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  circulo: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.bgSurface,
    backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center',
  },
  circuloHecho: { backgroundColor: colors.accent, borderColor: colors.accent },
  circuloActual: { borderColor: colors.accent },
  linea: { flex: 1, height: 2, backgroundColor: colors.bgSurface },
  lineaHecha: { backgroundColor: colors.accent },
  etiqueta: { fontFamily: fonts.body, fontSize: 10, color: colors.textTertiary, marginTop: 4 },
  etiquetaActiva: { fontFamily: fonts.heading, color: colors.textPrimary },

  canceladaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.dangerActionBg, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  canceladaTexto: { fontFamily: fonts.bold, fontSize: 12, color: colors.dangerAction },
});
