import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import {
  IconArrowLeft, IconSearch, IconUserPlus, IconBike, IconCheck,
} from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { buscarClientePorNombreUsuario, crearOrdenWalkin, type ClienteWalkin } from '../../lib/walkin';

const { colors, spacing, radius, fonts } = tokens;

export default function NuevaOrdenWalkinScreen({ route, navigation }: any) {
  const { negocioId } = route.params as { negocioId: string };

  const [usuario, setUsuario] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [cliente, setCliente] = useState<ClienteWalkin | null>(null);
  const [vehiculoId, setVehiculoId] = useState<string | null>(null);
  const [estado, setEstado] = useState<'confirmada' | 'completada'>('confirmada');
  const [creando, setCreando] = useState(false);

  async function handleBuscar() {
    if (!usuario.trim()) return;
    setBuscando(true);
    const encontrado = await buscarClientePorNombreUsuario(usuario);
    setCliente(encontrado);
    setVehiculoId(encontrado?.vehiculos[0]?.id ?? null);
    setBuscado(true);
    setBuscando(false);
  }

  function handleReintentar() {
    setCliente(null);
    setBuscado(false);
    setUsuario('');
  }

  async function handleCrear() {
    if (!cliente) return;
    setCreando(true);
    const citaId = await crearOrdenWalkin(negocioId, cliente.id, vehiculoId, estado);
    setCreando(false);
    if (!citaId) {
      Alert.alert('No se pudo crear la orden', 'Intenta de nuevo. Si el problema sigue, revisa tu conexión.');
      return;
    }
    navigation.replace('ChatCita', { citaId });
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Nueva orden (sin cita)</Text>
      </View>

      {!buscado && (
        <View style={s.body}>
          <Text style={s.label}>Usuario del cliente</Text>
          <View style={s.searchRow}>
            <TextInput
              style={s.input}
              placeholder="@usuario"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              value={usuario}
              onChangeText={setUsuario}
              onSubmitEditing={handleBuscar}
              autoFocus
            />
            <Pressable
              style={({ pressed }) => [s.searchBtn, (!usuario.trim() || buscando) && s.searchBtnDisabled, pressed && { opacity: 0.85 }]}
              onPress={handleBuscar}
              disabled={!usuario.trim() || buscando}
            >
              {buscando ? <ActivityIndicator size="small" color={colors.onAccent} /> : <IconSearch size={18} color={colors.onAccent} />}
            </Pressable>
          </View>
        </View>
      )}

      {buscado && !cliente && (
        <View style={s.body}>
          <View style={s.notFoundCard}>
            <Text style={s.notFoundTitle}>No encontramos una cuenta con ese usuario</Text>
            <Text style={s.notFoundText}>
              Revisa que esté escrito igual que en su perfil, o pídele que se registre en Rodix para que este servicio quede en su historial.
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.85 }]}
            onPress={handleReintentar}
          >
            <Text style={s.secondaryBtnText}>Intentar otro usuario</Text>
          </Pressable>
        </View>
      )}

      {buscado && cliente && (
        <View style={s.body}>
          <View style={s.clienteCard}>
            <View style={s.clienteAvatar}>
              <Text style={s.clienteAvatarText}>{cliente.nombre.trim()[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View>
              <Text style={s.clienteNombre}>{cliente.nombre}</Text>
              <Text style={s.clienteUsuario}>@{cliente.nombre_usuario}</Text>
            </View>
          </View>

          {cliente.vehiculos.length > 0 ? (
            <>
              <Text style={s.label}>Vehículo</Text>
              <View style={s.chipsRow}>
                {cliente.vehiculos.map(v => (
                  <Pressable
                    key={v.id}
                    style={[s.vehiculoChip, vehiculoId === v.id && s.vehiculoChipActive]}
                    onPress={() => setVehiculoId(v.id)}
                  >
                    <IconBike size={14} color={vehiculoId === v.id ? colors.accent : colors.textSecondary} />
                    <Text style={[s.vehiculoChipText, vehiculoId === v.id && s.vehiculoChipTextActive]}>
                      {v.placa.toUpperCase()} · {v.marca} {v.modelo}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <Text style={s.sinVehiculos}>Este cliente no tiene vehículos registrados — la orden se creará sin vehículo asignado.</Text>
          )}

          <Text style={s.label}>Estado</Text>
          <View style={s.chipsRow}>
            <Pressable
              style={[s.estadoChip, estado === 'confirmada' && s.estadoChipActive]}
              onPress={() => setEstado('confirmada')}
            >
              <Text style={[s.estadoChipText, estado === 'confirmada' && s.estadoChipTextActive]}>En este momento</Text>
            </Pressable>
            <Pressable
              style={[s.estadoChip, estado === 'completada' && s.estadoChipActive]}
              onPress={() => setEstado('completada')}
            >
              <Text style={[s.estadoChipText, estado === 'completada' && s.estadoChipTextActive]}>Ya se hizo</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [s.crearBtn, creando && s.searchBtnDisabled, pressed && { opacity: 0.85 }]}
            onPress={handleCrear}
            disabled={creando}
          >
            {creando
              ? <ActivityIndicator size="small" color={colors.onAccent} />
              : <><IconUserPlus size={18} color={colors.onAccent} /><Text style={s.crearBtnText}>Crear orden</Text></>
            }
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3 },

  body: { paddingHorizontal: spacing.xl, gap: spacing.md },

  label: {
    fontFamily: fonts.heading, fontSize: 12, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm,
  },

  searchRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, minHeight: 48,
  },
  searchBtn: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
  },
  searchBtnDisabled: { opacity: 0.4 },

  notFoundCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface, padding: spacing.lg, gap: spacing.xs,
  },
  notFoundTitle: { fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
  notFoundText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  secondaryBtn: {
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    minHeight: 48, justifyContent: 'center', alignItems: 'center',
  },
  secondaryBtnText: { fontFamily: fonts.heading, fontSize: 14, color: colors.textSecondary },

  clienteCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface, padding: spacing.md,
  },
  clienteAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  clienteAvatarText: { fontFamily: fonts.bold, fontSize: 17, color: colors.accent },
  clienteNombre: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  clienteUsuario: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 2 },

  sinVehiculos: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, lineHeight: 19 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  vehiculoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bgCard, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, minHeight: 44,
  },
  vehiculoChipActive: { borderColor: colors.accent, backgroundColor: 'rgba(72,151,90,0.1)' },
  vehiculoChipText: { fontFamily: fonts.heading, fontSize: 12, color: colors.textSecondary },
  vehiculoChipTextActive: { color: colors.accent },

  estadoChip: {
    justifyContent: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, minHeight: 44,
  },
  estadoChipActive: { borderColor: colors.accent, backgroundColor: 'rgba(72,151,90,0.1)' },
  estadoChipText: { fontFamily: fonts.heading, fontSize: 12, color: colors.textSecondary },
  estadoChipTextActive: { color: colors.accent },

  crearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.accent, borderRadius: radius.md,
    minHeight: 52, marginTop: spacing.md,
  },
  crearBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onAccent },
});
