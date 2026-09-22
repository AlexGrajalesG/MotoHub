import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { IconFlag, IconCheck, IconTrash, IconShieldCheck } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { fetchColaModeracion, moderarPost, type PostReportado } from '../../lib/comunidad';
import CabeceraPantalla from '../../components/CabeceraPantalla';

const { colors, spacing, radius, fonts } = tokens;

export default function ModeracionScreen({ navigation }: any) {
  const [cola, setCola] = useState<PostReportado[]>([]);
  const [loading, setLoading] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { cargar(); }, []));

  async function cargar() {
    setLoading(true);
    setCola(await fetchColaModeracion());
    setLoading(false);
  }

  async function resolver(id: string, accion: 'restaurar' | 'eliminar') {
    setOcupado(id);
    const r = await moderarPost(id, accion);
    setOcupado(null);
    if (!r.ok) { Alert.alert('No se pudo completar', r.mensaje); return; }
    setCola(prev => prev.filter(p => p.id !== id));
  }

  return (
    <View style={s.container}>
      <CabeceraPantalla titulo="Moderación" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : cola.length === 0 ? (
        <View style={s.vacio}>
          <View style={s.vacioIcono}><IconShieldCheck size={40} color={colors.success} /></View>
          <Text style={s.vacioTitulo}>Sin reportes pendientes</Text>
          <Text style={s.vacioSub}>Cuando una publicación reciba 3 reportes aparecerá aquí.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {cola.map(post => (
            <View key={post.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.autor}>{post.autor_nombre ?? 'Usuario'}{post.autor_usuario ? ` · @${post.autor_usuario}` : ''}</Text>
                <View style={s.reportesBadge}>
                  <IconFlag size={13} color={colors.dangerAction} />
                  <Text style={s.reportesTexto}>{post.total_reportes}</Text>
                </View>
              </View>

              {!!post.contenido && <Text style={s.contenido} numberOfLines={6}>{post.contenido}</Text>}
              {!!post.video_url && <Text style={s.videoUrl} numberOfLines={1}>{post.video_url}</Text>}

              {post.fotos_urls && post.fotos_urls.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                  {post.fotos_urls.map((url, i) => <Image key={i} source={{ uri: url }} style={s.foto} contentFit="cover" />)}
                </ScrollView>
              )}

              {post.motivos.length > 0 && (
                <Text style={s.motivos}>Motivos: {post.motivos.filter(Boolean).join(', ') || 'sin detalle'}</Text>
              )}

              <View style={s.acciones}>
                <Pressable
                  style={({ pressed }) => [s.accionBtn, s.restaurarBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => resolver(post.id, 'restaurar')}
                  disabled={ocupado === post.id}
                  accessibilityRole="button"
                >
                  {ocupado === post.id ? <ActivityIndicator size="small" color={colors.accent} /> : (
                    <><IconCheck size={16} color={colors.accent} /><Text style={s.restaurarTexto}>Restaurar</Text></>
                  )}
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.accionBtn, s.eliminarBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => Alert.alert('Eliminar publicación', 'Esta acción no se puede deshacer.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => resolver(post.id, 'eliminar') },
                  ])}
                  disabled={ocupado === post.id}
                  accessibilityRole="button"
                >
                  <IconTrash size={16} color="#fff" />
                  <Text style={s.eliminarTexto}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40, gap: spacing.md },

  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.dangerActionBorder, padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  autor: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  reportesBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.dangerActionBg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  reportesTexto: { fontFamily: fonts.bold, fontSize: 12, color: colors.dangerAction },

  contenido: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  videoUrl: { fontFamily: fonts.body, fontSize: 12, color: colors.accent },
  foto: { width: 80, height: 80, borderRadius: radius.sm, marginRight: spacing.sm, backgroundColor: colors.bgSurface },
  motivos: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, fontStyle: 'italic' },

  acciones: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  accionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radius.md },
  restaurarBtn: { borderWidth: 1, borderColor: colors.accent },
  restaurarTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.accent },
  eliminarBtn: { backgroundColor: colors.dangerAction },
  eliminarTexto: { fontFamily: fonts.heading, fontSize: 13, color: '#fff' },

  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  vacioIcono: { width: 88, height: 88, borderRadius: radius.xl, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  vacioTitulo: { fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, textAlign: 'center' },
  vacioSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
});
