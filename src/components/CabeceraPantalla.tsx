import { View, Text, Pressable, StyleSheet } from 'react-native';
import { IconArrowLeft } from '@tabler/icons-react-native';
import { tokens } from '../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

/** Encabezado estandar de pantallas internas: flecha de volver y titulo. */
export default function CabeceraPantalla({ titulo, onBack }: { titulo: string; onBack: () => void }) {
  return (
    <View style={s.header}>
      <Pressable
        style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <IconArrowLeft size={22} color={colors.textPrimary} />
      </Pressable>
      <Text style={s.titulo} numberOfLines={1} accessibilityRole="header">{titulo}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  titulo: { flex: 1, fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 },
});
