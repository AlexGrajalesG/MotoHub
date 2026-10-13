import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { IconDeviceMobileRotated } from '@tabler/icons-react-native';
import { tokens } from '../lib/tokens';
import RodixLogo from './RodixLogo';

const { colors, spacing, fonts } = tokens;

/** Rodix solo esta disenado para vertical; en horizontal (tablets que ignoran el lock de orientacion) se bloquea en vez de mostrar pantallas rotas. */
export default function GuardiaOrientacion({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (width <= height) return <>{children}</>;

  return (
    <View style={s.container}>
      <RodixLogo variante="monograma" alto={48} />
      <IconDeviceMobileRotated size={56} color={colors.accent} style={{ marginTop: spacing.xl }} />
      <Text style={s.titulo}>Gira tu dispositivo</Text>
      <Text style={s.sub}>Rodix funciona en vertical. Gira la tablet o el celular para continuar.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bgPrimary,
    justifyContent: 'center', alignItems: 'center', padding: spacing.xxl, gap: spacing.sm,
  },
  titulo: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, marginTop: spacing.lg },
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
});
