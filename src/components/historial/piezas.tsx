import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Image, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconCalendar, IconCamera, IconX, IconPlus } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { TIPOS_SERVICIO, fechaLarga, fechaAISO, isoAFecha } from '../../lib/historialTipos';

const { colors, spacing, radius, fonts } = tokens;

/** Bloque numerado de un formulario: título, ayuda opcional y contenido dentro de una tarjeta. */
export function Seccion({ numero, titulo, ayuda, children }: {
  numero?: number; titulo: string; ayuda?: string; children: React.ReactNode;
}) {
  return (
    <View style={s.seccion}>
      <View style={s.seccionCabecera}>
        {numero != null && <View style={s.numero}><Text style={s.numeroTexto}>{numero}</Text></View>}
        <View style={{ flex: 1 }}>
          <Text style={s.seccionTitulo}>{titulo}</Text>
          {!!ayuda && <Text style={s.seccionAyuda}>{ayuda}</Text>}
        </View>
      </View>
      <View style={s.seccionCuerpo}>{children}</View>
    </View>
  );
}

/** Cuadrícula de tipos de servicio con ícono; tres por fila. */
export function SelectorTipo({ valor, onChange }: { valor: string; onChange: (key: string) => void }) {
  return (
    <View style={s.grid} accessibilityRole="radiogroup">
      {TIPOS_SERVICIO.map(({ key, corto, color, Icon }) => {
        const activo = valor === key;
        return (
          <Pressable
            key={key}
            style={({ pressed }) => [s.tipo, activo && { borderColor: color, backgroundColor: `${color}1f` }, pressed && { opacity: 0.85 }]}
            onPress={() => onChange(key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={corto}
          >
            <Icon size={24} color={activo ? color : colors.textSecondary} />
            <Text style={[s.tipoTexto, activo && { color: colors.textPrimary, fontFamily: fonts.bold }]} numberOfLines={1}>{corto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Campo de fecha que abre un selector, en vez de escribir DD/MM/AAAA a mano. */
export function SelectorFecha({ valor, onChange, maxHoy = true }: { valor: string; onChange: (iso: string) => void; maxHoy?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [temporal, setTemporal] = useState<Date>(isoAFecha(valor));

  function abrir() { setTemporal(isoAFecha(valor)); setAbierto(true); }
  function aceptar() { onChange(fechaAISO(temporal)); setAbierto(false); }

  return (
    <>
      <Pressable
        style={({ pressed }) => [s.fecha, pressed && { opacity: 0.85 }]}
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`Fecha del servicio, ${fechaLarga(valor)}. Toca para cambiarla`}
      >
        <IconCalendar size={18} color={colors.accent} />
        <Text style={s.fechaTexto}>{fechaLarga(valor)}</Text>
      </Pressable>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={s.velo} onPress={() => setAbierto(false)}>
          <Pressable style={s.hoja} onPress={() => {}}>
            <Text style={s.hojaTitulo}>Fecha del servicio</Text>
            <DateTimePicker
              value={temporal}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="dark"
              maximumDate={maxHoy ? new Date() : undefined}
              onChange={(_, d) => d && setTemporal(d)}
            />
            <View style={s.hojaBotones}>
              <Pressable style={({ pressed }) => [s.btnSec, pressed && { opacity: 0.8 }]} onPress={() => setAbierto(false)} accessibilityRole="button">
                <Text style={s.btnSecTexto}>Cancelar</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [s.btnPri, pressed && { opacity: 0.85 }]} onPress={aceptar} accessibilityRole="button">
                <Text style={s.btnPriTexto}>Aceptar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** Fila de fotos con miniatura, quitar y un mosaico para agregar. */
export function FotosServicio({ uris, max, onAgregar, onQuitar }: {
  uris: string[]; max: number; onAgregar: () => void; onQuitar: (i: number) => void;
}) {
  return (
    <View style={s.fotos}>
      {uris.map((uri, i) => (
        <View key={uri + i} style={s.fotoSlot}>
          <Image source={{ uri }} style={s.foto} resizeMode="cover" />
          <Pressable style={s.fotoQuitar} onPress={() => onQuitar(i)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Quitar foto">
            <IconX size={14} color="#fff" />
          </Pressable>
        </View>
      ))}
      {uris.length < max && (
        <Pressable style={({ pressed }) => [s.fotoAgregar, pressed && { opacity: 0.85 }]} onPress={onAgregar} accessibilityRole="button" accessibilityLabel="Agregar foto">
          {uris.length === 0 ? <IconCamera size={24} color={colors.textSecondary} /> : <IconPlus size={24} color={colors.textSecondary} />}
          <Text style={s.fotoAgregarTexto}>{uris.length === 0 ? 'Agregar' : `${uris.length}/${max}`}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  seccion: { gap: spacing.md },
  seccionCabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  numero: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accentDark, borderWidth: 1, borderColor: 'rgba(72,151,90,0.4)', justifyContent: 'center', alignItems: 'center' },
  numeroTexto: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  seccionTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  seccionAyuda: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  seccionCuerpo: { gap: spacing.lg },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tipo: {
    width: '31.5%', minHeight: 76, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center', gap: 6, paddingHorizontal: 4,
  },
  tipoTexto: { fontFamily: fonts.heading, fontSize: 12, color: colors.textSecondary, textAlign: 'center' },

  fecha: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.lg,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
  },
  fechaTexto: { fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: spacing.xl },
  hoja: { backgroundColor: colors.bgCard, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.bgSurface, padding: spacing.lg, gap: spacing.md },
  hojaTitulo: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary, textAlign: 'center' },
  hojaBotones: { flexDirection: 'row', gap: spacing.md },
  btnSec: { flex: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center' },
  btnSecTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.textSecondary },
  btnPri: { flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  btnPriTexto: { fontFamily: fonts.bold, fontSize: 15, color: colors.onAccent },

  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fotoSlot: { position: 'relative' },
  foto: { width: 84, height: 84, borderRadius: radius.md },
  fotoQuitar: {
    position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center',
  },
  fotoAgregar: {
    width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  fotoAgregarTexto: { fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary },
});
