import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { IconArrowLeft, IconPackage, IconMessageCircle, IconBuildingStore } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { openTel } from '../../lib/openUrl';
import { formatCOP } from '../../lib/precio';
import type { Producto } from '../../lib/productos';

const { colors, spacing, radius, fonts } = tokens;

export default function DetalleProductoScreen({ route, navigation }: any) {
  const { producto, negocio } = route.params as { producto: Producto; negocio: { id: string; nombre: string; telefono: string | null } };
  const [fotoActiva, setFotoActiva] = useState(0);

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
        <Text style={s.headerTitle} numberOfLines={1}>{producto.nombre}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {producto.fotos.length > 0
          ? <Image source={{ uri: producto.fotos[fotoActiva] }} style={s.fotoGrande} contentFit="cover" />
          : <View style={[s.fotoGrande, s.fotoPlaceholder]}><IconPackage size={48} color={colors.textTertiary} /></View>
        }
        {producto.fotos.length > 1 && (
          <View style={s.thumbsRow}>
            {producto.fotos.map((url, idx) => (
              <Pressable key={idx} onPress={() => setFotoActiva(idx)}>
                <Image source={{ uri: url }} style={[s.thumb, idx === fotoActiva && s.thumbActive]} contentFit="cover" />
              </Pressable>
            ))}
          </View>
        )}

        <View style={s.body}>
          <View style={s.negocioRow}>
            <IconBuildingStore size={14} color={colors.textTertiary} />
            <Text style={s.negocioNombre}>{negocio.nombre}</Text>
          </View>
          <Text style={s.nombre}>{producto.nombre}</Text>
          <Text style={s.precio}>{formatCOP(producto.precio)}</Text>
          <Text style={[s.stock, producto.stock === 0 && s.stockAgotado]}>
            {producto.stock === 0 ? 'Agotado' : `${producto.stock} disponibles`}
          </Text>

          {producto.descripcion && (
            <Text style={s.descripcion}>{producto.descripcion}</Text>
          )}

          {producto.compatible_con.length > 0 && (
            <View style={s.chipsRow}>
              {producto.compatible_con.map(c => (
                <View key={c} style={s.chip}>
                  <Text style={s.chipText}>{c.charAt(0).toUpperCase() + c.slice(1)}</Text>
                </View>
              ))}
            </View>
          )}

          {negocio.telefono && (
            <Pressable style={({ pressed }) => [s.contactarBtn, pressed && { opacity: 0.85 }]} onPress={() => openTel(negocio.telefono)}>
              <IconMessageCircle size={18} color="#fff" />
              <Text style={s.contactarText}>Contactar al negocio</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
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
  headerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },

  fotoGrande: { width: '100%', height: 280, backgroundColor: colors.bgSurface },
  fotoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  thumbsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: radius.md, opacity: 0.6 },
  thumbActive: { opacity: 1, borderWidth: 2, borderColor: colors.accent },

  body: { padding: spacing.xl, gap: 4 },
  negocioRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  negocioNombre: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  nombre: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.3 },
  precio: { fontFamily: fonts.bold, fontSize: 20, color: colors.accent, marginTop: 4 },
  stock: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, marginTop: 2 },
  stockAgotado: { color: colors.dangerAction },
  descripcion: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginTop: spacing.md },

  chipsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  chip: { backgroundColor: colors.bgElevated, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: fonts.bold, fontSize: 11, color: colors.textPrimary },

  contactarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: radius.lg, minHeight: 50, marginTop: spacing.xl,
  },
  contactarText: { fontFamily: fonts.bold, fontSize: 15, color: '#fff' },
});
