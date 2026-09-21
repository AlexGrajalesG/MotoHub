import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, type TextInputProps } from 'react-native';
import { IconAlertCircle, IconEye, IconEyeOff } from '@tabler/icons-react-native';
import { tokens } from '../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

/**
 * Etiqueta visible + campo + error o ayuda. Patron unico de formularios de Rodix:
 * etiqueta siempre visible (nunca solo placeholder), error debajo con icono y texto,
 * "opcional" explicito en lo que no es obligatorio.
 */
export function Campo({ label, requerido, sinMarca, error, ayuda, children }: {
  label: string;
  requerido?: boolean;
  /** No mostrar ni asterisco ni "opcional" (login, donde todo es obligatorio). */
  sinMarca?: boolean;
  error?: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.campo}>
      <Text style={s.label}>
        {label}
        {!sinMarca && (requerido
          ? <Text style={s.requerido}> *</Text>
          : <Text style={s.opcional}>  opcional</Text>)}
      </Text>
      {children}
      {error ? (
        <View style={s.errorRow} accessibilityLiveRegion="polite">
          <IconAlertCircle size={14} color={colors.dangerAction} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : ayuda ? (
        <Text style={s.ayuda}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

type EntradaProps = TextInputProps & {
  error?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  /** Oculta el texto y agrega el ojo para mostrarlo. */
  esContrasena?: boolean;
  /** Icono a la izquierda del texto. */
  icono?: React.ReactNode;
};

export function Entrada({ error, inputRef, style, onFocus, onBlur, esContrasena, icono, ...rest }: EntradaProps) {
  const [foco, setFoco] = useState(false);
  const [ver, setVer] = useState(false);

  return (
    <View style={[s.fila, foco && s.filaFoco, error && s.filaError]}>
      {icono}
      <TextInput
        ref={inputRef}
        style={[s.input, style]}
        placeholderTextColor={colors.textTertiary}
        secureTextEntry={esContrasena && !ver}
        onFocus={(e) => { setFoco(true); onFocus?.(e); }}
        onBlur={(e) => { setFoco(false); onBlur?.(e); }}
        {...rest}
      />
      {esContrasena && (
        <Pressable
          onPress={() => setVer(v => !v)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          style={s.ojo}
        >
          {ver
            ? <IconEyeOff size={20} color={colors.textSecondary} />
            : <IconEye size={20} color={colors.textSecondary} />}
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  campo: { gap: 6 },
  label: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  requerido: { color: colors.accent },
  opcional: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  ayuda: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, lineHeight: 17 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorText: { flexShrink: 1, fontFamily: fonts.body, fontSize: 12, color: colors.dangerAction },

  fila: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.lg, minHeight: 52,
  },
  filaFoco: { borderColor: colors.accent },
  filaError: { borderColor: colors.dangerAction },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary, paddingVertical: 12 },
  ojo: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
});
