import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { IconArrowLeft, IconInfoCircle } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { LEGAL, VERSION_LEGAL, type DocumentoLegal } from '../../lib/legal';

const { colors, spacing, radius, fonts } = tokens;

export default function LegalScreen({ route, navigation }: any) {
  const documento: DocumentoLegal = route.params?.documento === 'terminos' ? 'terminos' : 'datos';
  const { titulo, parrafos } = LEGAL[documento];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitulo} numberOfLines={1}>{titulo}</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {VERSION_LEGAL.startsWith('borrador') && (
          <View style={s.aviso}>
            <IconInfoCircle size={18} color={colors.accent} />
            <Text style={s.avisoTexto}>Versión en revisión. El texto definitivo lo publicaremos antes del lanzamiento.</Text>
          </View>
        )}

        {parrafos.map((p, i) => <Text key={i} style={s.parrafo}>{p}</Text>)}

        <Text style={s.version}>Versión: {VERSION_LEGAL}</Text>
      </ScrollView>
    </View>
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
  headerTitulo: { flex: 1, fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3 },

  content: { paddingHorizontal: spacing.xl, paddingBottom: 40, gap: spacing.lg },
  aviso: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.accentDark, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)',
  },
  avisoTexto: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary, lineHeight: 19 },
  parrafo: { fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary, lineHeight: 24 },
  version: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: spacing.md },
});
