import { StyleSheet, Text, View } from 'react-native';
import { IconBell } from '@tabler/icons-react-native';
import { tokens } from '../lib/tokens';
import IconButton from './IconButton';

const { colors, spacing, radius, fonts } = tokens;

type Props = {
  title?: string;
  unreadCount: number;
  onPressBell: () => void;
};

export default function TopBar({ title = 'RODIX', unreadCount, onPressBell }: Props) {
  return (
    <View style={s.topBar}>
      <Text style={s.brand}>{title}</Text>
      <IconButton style={s.bellBtn} onPress={onPressBell} accessibilityLabel="Notificaciones">
        <IconBell size={18} color={colors.textPrimary} />
        {unreadCount > 0 && (
          <View style={s.bellBadge}>
            <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </IconButton>
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.md,
  },
  brand: {
    fontFamily: fonts.display, fontSize: 20, color: colors.accent,
    textTransform: 'uppercase', letterSpacing: -0.5,
  },
  bellBtn: {
    borderWidth: 1, borderColor: colors.bgSurface, backgroundColor: colors.bgCard,
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: colors.bgPrimary,
  },
  bellBadgeText: { fontFamily: fonts.bold, color: '#fff', fontSize: 10 },
});
