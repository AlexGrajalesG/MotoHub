import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import {
  IconArrowLeft, IconPlus, IconPackage, IconEye, IconEyeOff, IconTrash, IconPencil,
} from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { formatCOP } from '../../lib/precio';
import { fetchProductosDeNegocio, actualizarProducto, eliminarProducto, type Producto } from '../../lib/productos';

const { colors, spacing, radius, fonts } = tokens;

export default function MisProductosScreen({ route, navigation }: any) {
  const { negocioId } = route.params as { negocioId: string };

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { cargar(); }, [negocioId]));

  async function cargar() {
    setLoading(true);
    setProductos(await fetchProductosDeNegocio(negocioId, false));
    setLoading(false);
  }

  async function toggleActivo(p: Producto) {
    setBusy(p.id);
    const { error } = await actualizarProducto(p.id, { activo: !p.activo });
    setBusy(null);
    if (error) { Alert.alert('Error', error.message); return; }
    setProductos(prev => prev.map(x => x.id === p.id ? { ...x, activo: !x.activo } : x));
  }

  function handleEliminar(p: Producto) {
    Alert.alert('Eliminar producto', `¿Seguro que quieres eliminar "${p.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          setBusy(p.id);
          const { error } = await eliminarProducto(p.id);
          setBusy(null);
          if (error) { Alert.alert('Error', error.message); return; }
          setProductos(prev => prev.filter(x => x.id !== p.id));
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
        <Text style={s.headerTitle}>Mis Productos</Text>
        <Pressable
          style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('EditarProducto', { negocioId })}
          hitSlop={8}
          accessibilityLabel="Agregar producto"
        >
          <IconPlus size={18} color={colors.onAccent} />
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : productos.length === 0 ? (
        <View style={s.empty}>
          <IconPackage size={40} color={colors.bgSurface} />
          <Text style={s.emptyTitle}>Sin productos</Text>
          <Text style={s.emptySubtitle}>Agrega tu primer producto para que los clientes lo vean</Text>
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={p => p.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.card}>
              {item.fotos[0]
                ? <Image source={{ uri: item.fotos[0] }} style={s.foto} contentFit="cover" />
                : <View style={[s.foto, s.fotoPlaceholder]}><IconPackage size={24} color={colors.textTertiary} /></View>
              }
              <View style={{ flex: 1 }}>
                <Text style={s.nombre} numberOfLines={1}>{item.nombre}</Text>
                <Text style={s.precio}>{formatCOP(item.precio)}</Text>
                <Text style={[s.stock, item.stock === 0 && s.stockAgotado]}>
                  {item.stock === 0 ? 'Agotado' : `Stock: ${item.stock}`}
                </Text>
              </View>
              <Pressable
                style={s.iconBtn}
                onPress={() => navigation.navigate('EditarProducto', { negocioId, producto: item })}
                hitSlop={8}
                accessibilityLabel={`Editar ${item.nombre}`}
              >
                <IconPencil size={16} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                style={s.iconBtn}
                onPress={() => toggleActivo(item)}
                disabled={busy === item.id}
                hitSlop={8}
                accessibilityLabel={item.activo ? `Ocultar ${item.nombre}` : `Mostrar ${item.nombre}`}
              >
                {busy === item.id
                  ? <ActivityIndicator size="small" color={colors.textSecondary} />
                  : item.activo ? <IconEye size={16} color={colors.success} /> : <IconEyeOff size={16} color={colors.textTertiary} />
                }
              </Pressable>
              <Pressable
                style={s.iconBtn}
                onPress={() => handleEliminar(item)}
                disabled={busy === item.id}
                hitSlop={8}
                accessibilityLabel={`Eliminar ${item.nombre}`}
              >
                <IconTrash size={16} color={colors.dangerAction} />
              </Pressable>
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
  addBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
  },

  list: { paddingHorizontal: spacing.xl, paddingBottom: 32, gap: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface, padding: spacing.sm,
  },
  foto: { width: 56, height: 56, borderRadius: radius.md },
  fotoPlaceholder: { backgroundColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center' },
  nombre: { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  precio: { fontFamily: fonts.heading, fontSize: 13, color: colors.accent, marginTop: 2 },
  stock: { fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  stockAgotado: { color: colors.dangerAction },
  iconBtn: {
    width: 34, height: 34, borderRadius: radius.md,
    backgroundColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center',
  },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.sm },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary, letterSpacing: -0.3, textAlign: 'center', marginTop: spacing.sm },
  emptySubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
});
