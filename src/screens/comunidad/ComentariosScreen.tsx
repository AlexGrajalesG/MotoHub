import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { IconArrowLeft, IconSend, IconTrash } from '@tabler/icons-react-native';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { fetchComentarios, crearComentario, eliminarComentario, type Comentario } from '../../lib/comunidad';

const { colors, spacing, radius, fonts } = tokens;

function formatRelativo(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  return `Hace ${Math.floor(diffH / 24)} d`;
}

export default function ComentariosScreen({ route, navigation }: any) {
  const { postId } = route.params as { postId: string };
  const { session } = useAuth();
  const miId = session?.user.id;

  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const listRef = useRef<FlatList>(null);

  useFocusEffect(useCallback(() => { cargar(); }, [postId]));

  async function cargar() {
    setLoading(true);
    setComentarios(await fetchComentarios(postId));
    setLoading(false);
  }

  async function enviar() {
    if (!miId || !texto.trim() || enviando) return;
    setEnviando(true);
    const r = await crearComentario(postId, miId, texto);
    setEnviando(false);
    if (!r.ok) { Alert.alert('No se pudo comentar', r.mensaje); return; }
    setTexto('');
    await cargar();
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function borrar(c: Comentario) {
    Alert.alert('Eliminar comentario', '¿Seguro que quieres eliminarlo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          setComentarios(prev => prev.filter(x => x.id !== c.id));
          const r = await eliminarComentario(c.id);
          if (!r.ok) { Alert.alert('No se pudo eliminar', r.mensaje); cargar(); }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Pressable style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]} onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Volver">
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Comentarios</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={comentarios}
          keyExtractor={c => c.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.fila}>
              {item.autor?.foto_url
                ? <Image source={{ uri: item.autor.foto_url }} style={s.avatar} contentFit="cover" />
                : <View style={[s.avatar, s.avatarPlaceholder]}><Text style={s.avatarIniciales}>{(item.autor?.nombre ?? '?')[0]?.toUpperCase()}</Text></View>}
              <View style={{ flex: 1 }}>
                <View style={s.filaHeader}>
                  <Text style={s.nombre} numberOfLines={1}>{item.autor?.nombre ?? 'Usuario de Rodix'}</Text>
                  <Text style={s.hora}>{formatRelativo(item.created_at)}</Text>
                </View>
                <Text style={s.texto}>{item.contenido}</Text>
              </View>
              {item.autor_id === miId && (
                <Pressable onPress={() => borrar(item)} hitSlop={8} accessibilityLabel="Eliminar comentario">
                  <IconTrash size={16} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>Sé el primero en comentar.</Text>
            </View>
          }
        />
      )}

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Escribe un comentario…"
          placeholderTextColor={colors.textTertiary}
          value={texto}
          onChangeText={setTexto}
          multiline
        />
        <Pressable
          style={({ pressed }) => [s.sendBtn, (!texto.trim() || enviando) && s.sendBtnDisabled, pressed && { opacity: 0.85 }]}
          onPress={enviar}
          disabled={!texto.trim() || enviando}
          hitSlop={8}
          accessibilityLabel="Enviar comentario"
        >
          {enviando ? <ActivityIndicator size="small" color={colors.onAccent} /> : <IconSend size={18} color={colors.onAccent} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
    gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.bgSurface,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },

  list: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary },

  fila: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarPlaceholder: { backgroundColor: colors.accentDark, justifyContent: 'center', alignItems: 'center' },
  avatarIniciales: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  filaHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nombre: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  hora: { fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary },
  texto: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 19, marginTop: 2 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.bgSurface,
  },
  input: {
    flex: 1, maxHeight: 100, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
