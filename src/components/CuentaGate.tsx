import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { IconClock } from '@tabler/icons-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { tokens } from '../lib/tokens';
import { fechaDeBorrado, cancelarEliminacion, formatearFecha } from '../lib/cuenta';

const { colors, spacing, radius, fonts } = tokens;

/**
 * Si la cuenta tiene una eliminacion pendiente (30 dias de gracia), en vez de la app
 * se muestra esta pantalla para conservarla o cerrar sesion.
 */
export default function CuentaGate({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [fecha, setFecha] = useState<Date | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revisar = useCallback(async () => {
    if (!session?.user.id) { setCargando(false); return; }
    setFecha(await fechaDeBorrado(session.user.id));
    setCargando(false);
  }, [session?.user.id]);

  useEffect(() => { revisar(); }, [revisar]);

  async function conservar() {
    setTrabajando(true);
    setError(null);
    const r = await cancelarEliminacion();
    setTrabajando(false);
    if (!r.ok) { setError(r.mensaje); return; }
    setFecha(null);
  }

  if (cargando) {
    return (
      <View style={s.centro}><ActivityIndicator color={colors.accent} size="large" /></View>
    );
  }

  if (!fecha) return <>{children}</>;

  return (
    <View style={s.container}>
      <View style={s.centro}>
        <View style={s.icono}><IconClock size={40} color={colors.accent} /></View>
        <Text style={s.titulo}>Tu cuenta está programada para eliminarse</Text>
        <Text style={s.fecha}>Se borrará el {formatearFecha(fecha)}</Text>
        <Text style={s.texto}>
          Hasta esa fecha puedes conservarla y todo seguirá como estaba: tus vehículos, documentos e historial.
        </Text>
        {error && <Text style={s.error}>{error}</Text>}
      </View>

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.boton, trabajando && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
          onPress={conservar}
          disabled={trabajando}
          accessibilityRole="button"
        >
          {trabajando ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.botonTexto}>Conservar mi cuenta</Text>}
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.secundario, pressed && { opacity: 0.8 }]}
          onPress={() => supabase.auth.signOut()}
          accessibilityRole="button"
        >
          <Text style={s.secundarioTexto}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, backgroundColor: colors.bgPrimary, gap: spacing.md },
  icono: {
    width: 88, height: 88, borderRadius: radius.xl, backgroundColor: colors.accentDark,
    borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  titulo: { fontFamily: fonts.display, fontSize: 24, color: colors.textPrimary, letterSpacing: -0.4, textAlign: 'center' },
  fecha: { fontFamily: fonts.bold, fontSize: 16, color: colors.accent, textAlign: 'center' },
  texto: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.dangerAction, textAlign: 'center' },
  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm,
    backgroundColor: colors.bgPrimary, borderTopWidth: 1, borderTopColor: colors.bgCard,
  },
  boton: { backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 54, justifyContent: 'center', alignItems: 'center' },
  botonTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
  secundario: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center' },
  secundarioTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
});
