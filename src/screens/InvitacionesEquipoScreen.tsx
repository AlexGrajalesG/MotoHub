import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { IconArrowLeft, IconBuildingStore, IconMailOff } from '@tabler/icons-react-native';
import { useAuth } from '../context/AuthContext';
import { useModo } from '../context/ModoContext';
import { tokens } from '../lib/tokens';
import {
  fetchInvitacionesRecibidas, responderInvitacion, type InvitacionRecibida,
} from '../lib/invitaciones';

const { colors, spacing, radius, fonts } = tokens;

export default function InvitacionesEquipoScreen({ navigation }: any) {
  const { session } = useAuth();
  const { refreshEsMecanico } = useModo();

  const [invitaciones, setInvitaciones] = useState<InvitacionRecibida[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { cargar(); }, []));

  async function cargar() {
    setLoading(true);
    setInvitaciones(await fetchInvitacionesRecibidas(session!.user.id));
    setLoading(false);
  }

  async function responder(inv: InvitacionRecibida, aceptar: boolean) {
    setBusy(inv.id);
    const r = await responderInvitacion(inv.id, aceptar);
    setBusy(null);
    if (!r.ok) { Alert.alert('No se pudo responder', r.error); cargar(); return; }
    setInvitaciones(prev => prev.filter(x => x.id !== inv.id));
    if (aceptar) {
      await refreshEsMecanico();
      Alert.alert('Ya eres parte del equipo', `Ahora eres mecánico de ${inv.negocio_nombre}. Activa el Modo Mecánico desde tu perfil.`);
    }
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Invitaciones</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : invitaciones.length === 0 ? (
        <View style={s.empty}>
          <IconMailOff size={40} color={colors.bgSurface} />
          <Text style={s.emptyTitle}>Sin invitaciones</Text>
          <Text style={s.emptySubtitle}>Cuando un taller te invite a su equipo de mecánicos, aparecerá aquí</Text>
        </View>
      ) : (
        <FlatList
          data={invitaciones}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.iconWrap}><IconBuildingStore size={20} color={colors.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.taller}>{item.negocio_nombre}</Text>
                  <Text style={s.texto}>te invitó a su equipo de mecánicos</Text>
                </View>
              </View>
              <Text style={s.aviso}>
                Al aceptar podrás ver las citas de este taller y los datos de sus clientes.
              </Text>
              <View style={s.btns}>
                <Pressable
                  style={({ pressed }) => [s.btnRechazar, pressed && { opacity: 0.85 }]}
                  onPress={() => responder(item, false)}
                  disabled={busy === item.id}
                >
                  <Text style={s.btnRechazarText}>Rechazar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.btnAceptar, pressed && { opacity: 0.85 }]}
                  onPress={() => responder(item, true)}
                  disabled={busy === item.id}
                >
                  {busy === item.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.btnAceptarText}>Aceptar</Text>
                  }
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 },

  list: { paddingHorizontal: spacing.xl, paddingBottom: 32, gap: spacing.md },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface, padding: spacing.md, gap: spacing.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  taller: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  texto:  { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  aviso:  { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, lineHeight: 18 },

  btns: { flexDirection: 'row', gap: spacing.sm },
  btnRechazar: {
    flex: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  btnRechazarText: { fontFamily: fonts.heading, fontSize: 14, color: colors.textSecondary },
  btnAceptar: {
    flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  btnAceptarText: { fontFamily: fonts.heading, fontSize: 14, color: '#fff' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.sm },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary, letterSpacing: -0.3, textAlign: 'center', marginTop: spacing.sm },
  emptySubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
});
