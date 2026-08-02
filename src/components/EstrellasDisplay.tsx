import { View, Text, StyleSheet } from 'react-native';
import { IconStarFilled } from '@tabler/icons-react-native';
import { tokens } from '../lib/tokens';

const { colors, fonts } = tokens;

export default function EstrellasDisplay({
  promedio, total, size = 13,
}: { promedio: number; total: number; size?: number }) {
  if (total === 0) return null;
  return (
    <View style={s.row}>
      <IconStarFilled size={size} color="#f5a623" />
      <Text style={[s.text, { fontSize: size }]}>{promedio.toFixed(1)}</Text>
      <Text style={[s.total, { fontSize: size - 1 }]}>({total})</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  text: { fontFamily: fonts.heading, color: colors.textPrimary },
  total: { fontFamily: fonts.body, color: colors.textTertiary },
});
