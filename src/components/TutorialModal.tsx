import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import {
  IconCar, IconHistory, IconBuildingStore, IconMessageCircle, IconUsers, IconTool,
  IconCalendarEvent, IconClipboardCheck, IconUsersGroup, IconCalendar, IconLock,
} from '@tabler/icons-react-native';
import { tokens } from '../lib/tokens';
import { estilosTema } from '../lib/estilosTema';
import type { ModoEfectivo } from '../lib/modoEfectivo';
import { PASOS_TUTORIAL, textoBotonTutorial, limitarPaso, type IconoTutorial } from '../lib/tutorialTexto';

const { colors, spacing, radius, fonts } = tokens;

const ICONOS: Record<IconoTutorial, React.ComponentType<{ size?: number; color?: string }>> = {
  garage: IconCar,
  historial: IconHistory,
  servicios: IconBuildingStore,
  mensajes: IconMessageCircle,
  comunidad: IconUsers,
  taller: IconTool,
  citas: IconCalendarEvent,
  registro: IconClipboardCheck,
  equipo: IconUsersGroup,
  agenda: IconCalendar,
  cierre: IconLock,
};

/** Recorrido corto de la app, distinto según el lado en que se usa (cliente, taller o mecánico). */
export default function TutorialModal({ visible, modo, onClose }: {
  visible: boolean;
  modo: ModoEfectivo;
  onClose: () => void;
}) {
  const pasos = PASOS_TUTORIAL[modo];
  const [indice, setIndice] = useState(0);

  // Cada vez que se abre vuelve al primer paso
  useEffect(() => { if (visible) setIndice(0); }, [visible, modo]);

  const i = limitarPaso(indice, pasos.length);
  const paso = pasos[i];
  const Icono = ICONOS[paso.icono];
  const ultimo = i === pasos.length - 1;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.container}>
        <View style={s.superior}>
          <Text style={s.contador} accessibilityLabel={`Paso ${i + 1} de ${pasos.length}`}>
            {i + 1} de {pasos.length}
          </Text>
          {!ultimo && (
            <Pressable onPress={onClose} hitSlop={12} style={s.saltar} accessibilityRole="button">
              <Text style={s.saltarTexto}>Saltar</Text>
            </Pressable>
          )}
        </View>

        <ScrollView contentContainerStyle={s.cuerpo} showsVerticalScrollIndicator={false}>
          <View style={s.icono}><Icono size={44} color={colors.accent} /></View>
          <Text style={s.titulo} accessibilityRole="header">{paso.titulo}</Text>
          <Text style={s.texto}>{paso.texto}</Text>
        </ScrollView>

        <View style={s.inferior}>
          <View style={s.puntos} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {pasos.map((p, n) => <View key={p.titulo} style={[s.punto, n === i && s.puntoActivo]} />)}
          </View>
          <View style={s.botones}>
            {i > 0 && (
              <Pressable
                style={({ pressed }) => [s.btnSecundario, pressed && { opacity: 0.85 }]}
                onPress={() => setIndice(i - 1)}
                accessibilityRole="button"
              >
                <Text style={s.btnSecundarioTexto}>Atrás</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [s.btnPrimario, pressed && { opacity: 0.85 }]}
              onPress={() => (ultimo ? onClose() : setIndice(i + 1))}
              accessibilityRole="button"
            >
              <Text style={s.btnPrimarioTexto}>{textoBotonTutorial(i, pasos.length)}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = estilosTema(() => ({
  container: { flex: 1, backgroundColor: colors.bgPrimary, paddingTop: 56, paddingBottom: spacing.xl },
  superior: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, minHeight: 44,
  },
  contador: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  saltar: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  saltarTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.textSecondary },

  cuerpo: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.lg,
  },
  icono: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accentTenue,
    borderWidth: 1, borderColor: colors.accentBorde, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titulo: { fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary, textAlign: 'center', letterSpacing: -0.5 },
  texto: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textSecondary, textAlign: 'center', maxWidth: 420 },

  inferior: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  puntos: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bgSurface },
  puntoActivo: { width: 24, backgroundColor: colors.accent },
  botones: { flexDirection: 'row', gap: spacing.md },
  btnPrimario: {
    flex: 1, minHeight: 52, borderRadius: radius.md, backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  btnPrimarioTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
  btnSecundario: {
    minHeight: 52, paddingHorizontal: spacing.xl, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  btnSecundarioTexto: { fontFamily: fonts.heading, fontSize: 16, color: colors.textPrimary },
}));
