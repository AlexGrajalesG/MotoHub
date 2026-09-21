import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { IconLock, IconDevices, IconTrash, IconAlertCircle, IconCircleCheck, IconMail } from '@tabler/icons-react-native';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { cambiarContrasena, cerrarSesionEnTodos } from '../../lib/cuenta';
import CabeceraPantalla from '../../components/CabeceraPantalla';
import { FilaAjuste, GrupoAjustes } from '../../components/FilaAjuste';
import { Campo, Entrada } from '../../components/FormField';

const { colors, spacing, radius, fonts } = tokens;

export default function SeguridadScreen({ navigation }: any) {
  const { session } = useAuth();
  const [nueva, setNueva] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [intento, setIntento] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);

  const error = !nueva ? 'Escribe la nueva contraseña' : nueva.length < 6 ? 'Usa al menos 6 caracteres' : undefined;

  async function guardar() {
    setIntento(true);
    setResultado(null);
    if (error) return;
    setGuardando(true);
    const r = await cambiarContrasena(nueva);
    setGuardando(false);
    if (r.ok) { setNueva(''); setIntento(false); setResultado({ ok: true, texto: 'Contraseña actualizada.' }); }
    else setResultado({ ok: false, texto: r.mensaje });
  }

  function cerrarEnTodos() {
    Alert.alert(
      'Cerrar sesión en todos los dispositivos',
      'Saldrás de Rodix aquí y en cualquier otro teléfono donde hayas entrado. Tendrás que iniciar sesión de nuevo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar en todos', style: 'destructive',
          onPress: async () => {
            setSaliendo(true);
            const r = await cerrarSesionEnTodos();
            setSaliendo(false);
            if (!r.ok) Alert.alert('No se pudo cerrar', r.mensaje);
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <CabeceraPantalla titulo="Seguridad" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <GrupoAjustes titulo="Tu cuenta">
          <FilaAjuste
            icono={<IconMail size={20} color={colors.accent} />}
            titulo="Correo"
            detalle={session?.user.email ?? ''}
          />
        </GrupoAjustes>

        <View style={s.grupo}>
          <Text style={s.grupoTitulo}>Contraseña</Text>
          <View style={s.tarjeta}>
            <Campo label="Nueva contraseña" sinMarca error={intento ? error : undefined} ayuda="Mínimo 6 caracteres">
              <Entrada
                icono={<IconLock size={18} color={colors.textTertiary} />}
                esContrasena
                value={nueva}
                onChangeText={(t) => { setNueva(t); setResultado(null); }}
                error={intento && !!error}
                placeholder="Escribe la nueva contraseña"
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={guardar}
              />
            </Campo>

            {resultado && (
              <View style={s.resultado} accessibilityLiveRegion="polite">
                {resultado.ok
                  ? <IconCircleCheck size={16} color={colors.success} />
                  : <IconAlertCircle size={16} color={colors.dangerAction} />}
                <Text style={[s.resultadoTexto, { color: resultado.ok ? colors.success : colors.dangerAction }]}>{resultado.texto}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [s.boton, guardando && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
              onPress={guardar}
              disabled={guardando}
              accessibilityRole="button"
            >
              {guardando ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.botonTexto}>Cambiar contraseña</Text>}
            </Pressable>
          </View>
        </View>

        <GrupoAjustes titulo="Sesiones">
          <FilaAjuste
            icono={<IconDevices size={20} color={colors.accent} />}
            titulo="Cerrar sesión en todos los dispositivos"
            detalle="Útil si perdiste el teléfono o entraste en uno ajeno"
            onPress={cerrarEnTodos}
            ocupado={saliendo}
          />
        </GrupoAjustes>

        <GrupoAjustes titulo="Zona de riesgo">
          <FilaAjuste
            icono={<IconTrash size={20} color={colors.dangerAction} />}
            titulo="Eliminar mi cuenta"
            detalle="Tienes 30 días para arrepentirte"
            peligro
            onPress={() => navigation.navigate('EliminarCuenta')}
          />
        </GrupoAjustes>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40, gap: spacing.xl },

  grupo: { gap: spacing.sm },
  grupoTitulo: {
    fontFamily: fonts.heading, fontSize: 12, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: spacing.xs,
  },
  tarjeta: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.lg, gap: spacing.md,
  },
  resultado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultadoTexto: { flexShrink: 1, fontFamily: fonts.body, fontSize: 13 },
  boton: {
    backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 50,
    justifyContent: 'center', alignItems: 'center',
  },
  botonTexto: { fontFamily: fonts.bold, fontSize: 15, color: colors.onAccent },
});
