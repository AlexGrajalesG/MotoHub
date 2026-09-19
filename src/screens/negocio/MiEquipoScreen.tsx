import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import {
  IconArrowLeft, IconUserPlus, IconUsers, IconPhone, IconTrash, IconEye, IconEyeOff,
} from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import {
  fetchMecanicosDeNegocio, buscarUsuarioPorNombreUsuario, agregarMecanico,
  toggleMecanicoActivo, quitarMecanico, type Mecanico,
} from '../../lib/mecanicos';

const { colors, spacing, radius, fonts } = tokens;

export default function MiEquipoScreen({ route, navigation }: any) {
  const { negocioId } = route.params as { negocioId: string };

  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState<string | null>(null);

  const [agregando, setAgregando]       = useState(false);
  const [usuarioInput, setUsuarioInput] = useState('');
  const [buscando, setBuscando]         = useState(false);

  useFocusEffect(useCallback(() => { cargar(); }, [negocioId]));

  async function cargar() {
    setLoading(true);
    setMecanicos(await fetchMecanicosDeNegocio(negocioId));
    setLoading(false);
  }

  function handleAgregar() {
    setUsuarioInput('');
    setAgregando(true);
  }

  async function confirmarAgregar() {
    const handle = usuarioInput.trim();
    if (!handle) return;
    setBuscando(true);
    const usuario = await buscarUsuarioPorNombreUsuario(handle);
    setBuscando(false);
    if (!usuario) {
      Alert.alert('No encontrado', 'Ningún usuario de Rodix tiene ese nombre de usuario. Revisa que esté bien escrito o pídele que cree su cuenta primero.');
      return;
    }
    if (mecanicos.some(m => m.usuario_id === usuario.id)) {
      Alert.alert('Ya está en tu equipo', `${usuario.nombre} ya es mecánico de tu taller.`);
      return;
    }
    const { error } = await agregarMecanico(usuario.id, negocioId);
    if (error) { Alert.alert('Error', error.message); return; }
    setAgregando(false);
    cargar();
  }

  async function handleToggle(m: Mecanico) {
    setBusy(m.id);
    const { error } = await toggleMecanicoActivo(m.id, !m.activo);
    setBusy(null);
    if (error) { Alert.alert('Error', error.message); return; }
    setMecanicos(prev => prev.map(x => x.id === m.id ? { ...x, activo: !x.activo } : x));
  }

  function handleQuitar(m: Mecanico) {
    Alert.alert('Quitar del equipo', `¿Seguro que quieres quitar a ${m.usuario?.nombre ?? 'este mecánico'} de tu taller?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar', style: 'destructive',
        onPress: async () => {
          setBusy(m.id);
          const { error } = await quitarMecanico(m.id);
          setBusy(null);
          if (error) { Alert.alert('Error', error.message); return; }
          setMecanicos(prev => prev.filter(x => x.id !== m.id));
        },
      },
    ]);
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
        <Text style={s.headerTitle}>Mi Equipo</Text>
        <Pressable
          style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.85 }]}
          onPress={handleAgregar}
          hitSlop={8}
          accessibilityLabel="Agregar mecánico"
        >
          <IconUserPlus size={18} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : mecanicos.length === 0 ? (
        <View style={s.empty}>
          <IconUsers size={40} color={colors.bgSurface} />
          <Text style={s.emptyTitle}>Sin mecánicos</Text>
          <Text style={s.emptySubtitle}>Agrega a tu equipo por su @usuario — deben tener cuenta en Rodix</Text>
        </View>
      ) : (
        <FlatList
          data={mecanicos}
          keyExtractor={m => m.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.nombre}>{item.usuario?.nombre ?? 'Mecánico'}</Text>
                {item.usuario?.telefono && (
                  <View style={s.telRow}>
                    <IconPhone size={12} color={colors.textTertiary} />
                    <Text style={s.telText}>{item.usuario.telefono}</Text>
                  </View>
                )}
              </View>
              <Pressable
                style={s.iconBtn}
                onPress={() => handleToggle(item)}
                disabled={busy === item.id}
                hitSlop={8}
                accessibilityLabel={item.activo ? `Desactivar ${item.usuario?.nombre ?? 'mecánico'}` : `Activar ${item.usuario?.nombre ?? 'mecánico'}`}
              >
                {busy === item.id
                  ? <ActivityIndicator size="small" color={colors.textSecondary} />
                  : item.activo ? <IconEye size={18} color={colors.success} /> : <IconEyeOff size={18} color={colors.textTertiary} />
                }
              </Pressable>
              <Pressable
                style={s.iconBtn}
                onPress={() => handleQuitar(item)}
                disabled={busy === item.id}
                hitSlop={8}
                accessibilityLabel={`Quitar a ${item.usuario?.nombre ?? 'mecánico'} del equipo`}
              >
                <IconTrash size={18} color={colors.dangerAction} />
              </Pressable>
            </View>
          )}
        />
      )}

      <Modal visible={agregando} transparent animationType="fade" onRequestClose={() => setAgregando(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Agregar mecánico</Text>
            <Text style={s.modalSubtitle}>Ingresa el @usuario del mecánico en Rodix</Text>
            <TextInput
              style={s.modalInput}
              value={usuarioInput}
              onChangeText={setUsuarioInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="@usuario"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <View style={s.modalBtns}>
              <Pressable style={s.modalBtnCancelar} onPress={() => setAgregando(false)} disabled={buscando}>
                <Text style={s.modalBtnCancelarText}>Cancelar</Text>
              </Pressable>
              <Pressable style={s.modalBtnGuardar} onPress={confirmarAgregar} disabled={buscando}>
                {buscando
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.modalBtnGuardarText}>Agregar</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
  },

  list: { paddingHorizontal: spacing.xl, paddingBottom: 32, gap: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface, padding: spacing.md,
  },
  nombre: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  telRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  telText: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  iconBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center',
  },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.sm },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary, letterSpacing: -0.3, textAlign: 'center', marginTop: spacing.sm },
  emptySubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  modalCard: {
    width: '100%', backgroundColor: colors.bgCard, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.bgSurface, padding: spacing.lg,
  },
  modalTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  modalSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md },
  modalInput: {
    backgroundColor: colors.bgSurface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.accent, color: colors.textPrimary,
    fontFamily: fonts.heading, fontSize: 15, paddingVertical: 12, paddingHorizontal: spacing.md,
  },
  modalBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalBtnCancelar: {
    flex: 1, paddingVertical: 12, borderRadius: radius.md,
    alignItems: 'center', backgroundColor: colors.bgSurface,
  },
  modalBtnCancelarText: { fontFamily: fonts.heading, color: colors.textSecondary, fontSize: 14 },
  modalBtnGuardar: {
    flex: 1, paddingVertical: 12, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent,
  },
  modalBtnGuardarText: { fontFamily: fonts.heading, color: '#fff', fontSize: 14 },
});
