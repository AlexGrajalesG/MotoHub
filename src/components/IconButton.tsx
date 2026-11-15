import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { tokens } from '../lib/tokens';
import { estilosTema } from '../lib/estilosTema';

const { colors, radius } = tokens;

type Props = Omit<PressableProps, 'style'> & {
  size?: number;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Boton de solo-icono con feedback tactil unico (opacity 0.85, sin spring scale). */
export default function IconButton({ size = 44, accessibilityLabel, disabled, children, style, ...rest }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        s.btn,
        { width: size, height: size },
        style,
        pressed && !disabled && { opacity: 0.85 },
        disabled && s.disabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const s = estilosTema(() => ({
  btn: {
    borderRadius: radius.md,
    backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
}));
