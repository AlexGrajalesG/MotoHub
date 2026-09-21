import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { IconChevronRight } from '@tabler/icons-react-native';
import { tokens } from '../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

/** Fila tocable de una lista de ajustes: icono, titulo, detalle opcional y flecha. */
export function FilaAjuste({ icono, titulo, detalle, onPress, peligro, ocupado, sinFlecha }: {
  icono: React.ReactNode;
  titulo: string;
  detalle?: string;
  onPress?: () => void;
  peligro?: boolean;
  ocupado?: boolean;
  sinFlecha?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.fila, pressed && onPress && { opacity: 0.8 }]}
      onPress={onPress}
      disabled={!onPress || ocupado}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={detalle ? `${titulo}. ${detalle}` : titulo}
    >
      <View style={[s.icono, peligro && s.iconoPeligro]}>{icono}</View>
      <View style={{ flex: 1 }}>
        <Text style={[s.titulo, peligro && s.tituloPeligro]}>{titulo}</Text>
        {!!detalle && <Text style={s.detalle} numberOfLines={2}>{detalle}</Text>}
      </View>
      {ocupado
        ? <ActivityIndicator size="small" color={colors.textSecondary} />
        : onPress && !sinFlecha ? <IconChevronRight size={18} color={colors.textTertiary} /> : null}
    </Pressable>
  );
}

/** Grupo de filas dentro de una misma tarjeta (Common Region), con divisores entre ellas. */
export function GrupoAjustes({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  const hijos = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={s.grupo}>
      {!!titulo && <Text style={s.grupoTitulo}>{titulo}</Text>}
      <View style={s.tarjeta}>
        {hijos.map((h, i) => (
          <View key={i} style={i > 0 && s.divisor}>{h}</View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  grupo: { gap: spacing.sm },
  grupoTitulo: {
    fontFamily: fonts.heading, fontSize: 12, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: spacing.xs,
  },
  tarjeta: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface, overflow: 'hidden',
  },
  divisor: { borderTopWidth: 1, borderTopColor: colors.bgSurface },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  icono: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(72,151,90,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  iconoPeligro: { backgroundColor: colors.dangerActionBg },
  titulo: { fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
  tituloPeligro: { color: colors.dangerAction },
  detalle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
});
