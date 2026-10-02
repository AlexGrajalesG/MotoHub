import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Pressable, ScrollView, Modal, TextInput,
  Alert, RefreshControl, AccessibilityInfo, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import {
  IconWorld, IconMotorbike, IconBuildingStore, IconDots, IconFlag, IconUserOff,
  IconPlus, IconShieldCheck, IconX, IconHeart, IconHeartFilled, IconMessageCircle, IconSearch, IconFilterOff,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useModo } from '../../context/ModoContext';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { tokens } from '../../lib/tokens';
import {
  fetchFeed, reportarPost, bloquearUsuario, eliminarPost, misLikes, darLike, quitarLike,
  CATEGORIAS, extraerHashtags, type Post, type Pestana,
} from '../../lib/comunidad';
import TopBar from '../../components/TopBar';
import PressableCard from '../../components/PressableCard';
import FotosPost from '../../components/comunidad/FotosPost';
import VideoPost from '../../components/comunidad/VideoPost';

const { colors, spacing, radius, fonts } = tokens;

const PESTANAS: { key: Pestana; label: string }[] = [
  { key: 'cerca', label: 'Cerca de mí' },
  { key: 'moto', label: 'Mi moto' },
  { key: 'talleres', label: 'Talleres' },
];

function formatRelativo(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ayer';
  if (diffD < 7) return `Hace ${diffD} días`;
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// ─── Esqueleto ───────────────────────────────────────────────────────────────

function EsqueletoCard({ reduceMotion }: { reduceMotion: boolean }) {
  const opacidad = useRef(new Animated.Value(reduceMotion ? 0.6 : 0.4)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(opacidad, { toValue: 0.9, duration: 700, useNativeDriver: true }),
      Animated.timing(opacidad, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View style={[s.card, { opacity: opacidad, padding: spacing.lg }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
        <View style={[s.avatar, { backgroundColor: colors.bgSurface }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[s.esqLinea, { width: '50%' }]} />
          <View style={[s.esqLinea, { width: '30%', height: 10 }]} />
        </View>
      </View>
      <View style={[s.esqLinea, { width: '90%' }]} />
      <View style={[s.esqLinea, { width: '70%', marginTop: 6 }]} />
    </Animated.View>
  );
}

// ─── Tarjeta de publicación ─────────────────────────────────────────────────

const PostCard = memo(function PostCard({
  item, index, reduceMotion, miId, esModerador, liked, onMenu, onToggleLike, onAbrirComentarios, onBuscarHashtag,
}: {
  item: Post; index: number; reduceMotion: boolean; miId?: string; esModerador: boolean; liked: boolean;
  onMenu: (p: Post) => void; onToggleLike: (p: Post) => void; onAbrirComentarios: (p: Post) => void; onBuscarHashtag: (h: string) => void;
}) {
  const nombre = item.negocio?.nombre ?? item.autor?.nombre ?? 'Usuario de Rodix';
  const esTaller = item.rol_autor === 'negocio';
  const categoria = CATEGORIAS.find(c => c.key === item.categoria);
  const [expandido, setExpandido] = useState(false);
  const largo = (item.contenido?.length ?? 0) > 220;
  const hashtags = extraerHashtags(item.contenido);

  return (
    <PressableCard index={index} reduceMotion={reduceMotion} onPress={() => {}} style={s.card} scaleTo={1}>
      <View style={s.cardHeader}>
        {item.autor?.foto_url ? (
          <Image source={{ uri: item.autor.foto_url }} style={s.avatar} contentFit="cover" />
        ) : (
          <View style={[s.avatar, s.avatarPlaceholder]}>
            {esTaller
              ? <IconBuildingStore size={18} color={colors.accent} />
              : <Text style={s.avatarIniciales}>{nombre[0]?.toUpperCase() ?? '?'}</Text>}
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={s.nombreRow}>
            <Text style={s.nombre} numberOfLines={1}>{nombre}</Text>
            {esTaller && <View style={s.badgeTaller}><Text style={s.badgeTallerTexto}>Taller</Text></View>}
          </View>
          <Text style={s.meta} numberOfLines={1}>
            {[item.ciudad, formatRelativo(item.created_at)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Pressable onPress={() => onMenu(item)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Más opciones">
          <IconDots size={18} color={colors.textTertiary} />
        </Pressable>
      </View>

      {!!categoria && categoria.key !== 'general' && (
        <View style={s.categoria}><Text style={s.categoriaTexto}>{categoria.label}</Text></View>
      )}

      {!!item.contenido && (
        <>
          <Text style={s.contenido} numberOfLines={expandido ? undefined : 6}>{item.contenido}</Text>
          {largo && (
            <Pressable onPress={() => setExpandido(v => !v)} hitSlop={8} style={s.verMas} accessibilityRole="button">
              <Text style={s.verMasTexto}>{expandido ? 'Ver menos' : 'Ver más'}</Text>
            </Pressable>
          )}
        </>
      )}

      {hashtags.length > 0 && (
        <View style={s.hashtagsRow}>
          {hashtags.map(h => (
            <Pressable key={h} onPress={() => onBuscarHashtag(h)} style={({ pressed }) => [s.hashtagChip, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={`Buscar ${h}`}>
              <Text style={s.hashtagTexto}>{h}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {item.fotos_urls && item.fotos_urls.length > 0 && <FotosPost urls={item.fotos_urls} />}

      {item.video_url && item.video_plataforma && <VideoPost url={item.video_url} plataforma={item.video_plataforma} />}

      <View style={s.acciones}>
        <Pressable
          style={({ pressed }) => [s.accion, pressed && { opacity: 0.7 }]}
          onPress={() => onToggleLike(item)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Quitar like' : 'Dar like'}
        >
          {liked
            ? <IconHeartFilled size={20} color={colors.dangerAction} />
            : <IconHeart size={20} color={colors.textSecondary} />}
          {item.likes_count > 0 && <Text style={[s.accionTexto, liked && { color: colors.dangerAction }]}>{item.likes_count}</Text>}
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.accion, pressed && { opacity: 0.7 }]}
          onPress={() => onAbrirComentarios(item)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ver comentarios"
        >
          <IconMessageCircle size={20} color={colors.textSecondary} />
          {item.comentarios_count > 0 && <Text style={s.accionTexto}>{item.comentarios_count}</Text>}
        </Pressable>
      </View>
    </PressableCard>
  );
});

// ─── Pantalla ───────────────────────────────────────────────────────────────

export default function ComunidadScreen({ navigation }: any) {
  const { session } = useAuth();
  const { esModerador } = useModo();
  const { unreadCount } = useNotificaciones();

  const [pestana, setPestana] = useState<Pestana>('cerca');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ciudad, setCiudad] = useState<string | null>(null);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [menuPost, setMenuPost] = useState<Post | null>(null);
  const [misLikesSet, setMisLikesSet] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const yaCargo = useRef(false);

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion); }, []);

  useFocusEffect(useCallback(() => { cargarContexto(); }, []));

  async function cargarContexto() {
    if (!session?.user.id) return;
    const [{ data: perfil }, { data: vehiculos }] = await Promise.all([
      supabase.from('usuarios').select('ciudad').eq('id', session.user.id).maybeSingle(),
      supabase.from('vehiculos').select('marca').eq('propietario_id', session.user.id).eq('activo', true),
    ]);
    setCiudad(perfil?.ciudad ?? null);
    setMarcas([...new Set((vehiculos ?? []).map((v: any) => v.marca))]);
  }

  useEffect(() => {
    const t = setTimeout(() => cargar(), busqueda ? 300 : 0);
    return () => clearTimeout(t);
  }, [pestana, ciudad, marcas.join(','), busqueda]);

  async function cargar() {
    if (!yaCargo.current) setLoading(true);
    const { posts: lista } = await fetchFeed(pestana, { ciudad, marcas, busqueda });
    setPosts(lista);
    yaCargo.current = true;
    setLoading(false);
    if (session?.user.id && lista.length > 0) {
      setMisLikesSet(await misLikes(lista.map(p => p.id), session.user.id));
    }
  }

  async function alternarLike(post: Post) {
    const uid = session?.user.id;
    if (!uid) return;
    const yaLeDioLike = misLikesSet.has(post.id);

    setMisLikesSet(prev => {
      const siguiente = new Set(prev);
      yaLeDioLike ? siguiente.delete(post.id) : siguiente.add(post.id);
      return siguiente;
    });
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: p.likes_count + (yaLeDioLike ? -1 : 1) } : p));

    const r = yaLeDioLike ? await quitarLike(post.id, uid) : await darLike(post.id, uid);
    if (!r.ok) {
      // revierte si falló
      setMisLikesSet(prev => {
        const siguiente = new Set(prev);
        yaLeDioLike ? siguiente.add(post.id) : siguiente.delete(post.id);
        return siguiente;
      });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: p.likes_count + (yaLeDioLike ? 1 : -1) } : p));
    }
  }

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  async function reportar() {
    if (!menuPost) return;
    const post = menuPost;
    setMenuPost(null);
    const r = await reportarPost(post.id);
    Alert.alert(r.ok ? 'Reportado' : 'No se pudo reportar', r.ok ? 'Gracias, vamos a revisarla.' : r.mensaje);
  }

  function bloquear() {
    if (!menuPost) return;
    const post = menuPost;
    const nombre = post.autor?.nombre ?? 'este usuario';
    setMenuPost(null);
    Alert.alert('Bloquear a ' + nombre, 'No volverás a ver sus publicaciones, ni él las tuyas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear', style: 'destructive',
        onPress: async () => {
          const r = await bloquearUsuario(post.autor_id);
          if (r.ok) setPosts(prev => prev.filter(p => p.autor_id !== post.autor_id));
          else Alert.alert('No se pudo bloquear', r.mensaje);
        },
      },
    ]);
  }

  const esMio = menuPost?.autor_id === session?.user.id;

  return (
    <View style={s.container}>
      <TopBar
        unreadCount={unreadCount}
        onPressBell={() => navigation.navigate('Notificaciones')}
      />

      <View style={s.busquedaWrap}>
        <IconSearch size={18} color={colors.textTertiary} />
        <TextInput
          style={s.busquedaInput}
          placeholder="Buscar en Comunidad o #hashtag"
          placeholderTextColor={colors.textTertiary}
          value={busqueda}
          onChangeText={setBusqueda}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Buscar en Comunidad"
        />
        {busqueda.length > 0 && (
          <Pressable onPress={() => setBusqueda('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
            <IconX size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow} style={{ flexGrow: 0 }}>
        {PESTANAS.map(({ key, label }) => {
          const activo = pestana === key;
          return (
            <Pressable
              key={key}
              style={[s.tab, activo && s.tabActivo]}
              onPress={() => setPestana(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
            >
              <Text style={[s.tabTexto, activo && s.tabTextoActivo]}>{label}</Text>
            </Pressable>
          );
        })}
        {esModerador && (
          <Pressable style={s.moderarBtn} onPress={() => navigation.navigate('Moderacion')} accessibilityRole="button" accessibilityLabel="Moderación">
            <IconShieldCheck size={16} color={colors.accent} />
          </Pressable>
        )}
      </ScrollView>

      {loading ? (
        <View style={s.list}>{[0, 1, 2].map(i => <EsqueletoCard key={i} reduceMotion={reduceMotion} />)}</View>
      ) : posts.length === 0 ? (
        <View style={s.vacio}>
          <View style={s.vacioIcono}>
            {busqueda
              ? <IconFilterOff size={40} color={colors.textTertiary} />
              : pestana === 'moto' ? <IconMotorbike size={40} color={colors.textTertiary} /> : <IconWorld size={40} color={colors.textTertiary} />}
          </View>
          <Text style={s.vacioTitulo}>
            {busqueda
              ? 'No encontramos resultados'
              : pestana === 'moto' && marcas.length === 0
                ? 'Agrega un vehículo para ver esto'
                : 'Todavía no hay publicaciones'}
          </Text>
          <Text style={s.vacioSub}>
            {busqueda
              ? 'Prueba con otra palabra o #hashtag.'
              : pestana === 'moto' && marcas.length === 0
                ? 'Así te mostramos publicaciones de tu marca de moto o carro.'
                : 'Sé el primero en compartir algo por aquí.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={p => p.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.bgCard} />
          }
          renderItem={({ item, index }) => (
            <PostCard
              item={item} index={index} reduceMotion={reduceMotion} miId={session?.user.id} esModerador={esModerador}
              liked={misLikesSet.has(item.id)}
              onMenu={setMenuPost}
              onToggleLike={alternarLike}
              onAbrirComentarios={p => navigation.navigate('Comentarios', { postId: p.id })}
              onBuscarHashtag={setBusqueda}
            />
          )}
        />
      )}

      <Pressable
        style={({ pressed }) => [s.fab, pressed && { opacity: 0.85 }]}
        onPress={() => navigation.navigate('CrearPost')}
        accessibilityRole="button"
        accessibilityLabel="Publicar"
      >
        <IconPlus size={26} color={colors.onAccent} />
      </Pressable>

      <Modal visible={!!menuPost} transparent animationType="fade" onRequestClose={() => setMenuPost(null)}>
        <Pressable style={s.fondoModal} onPress={() => setMenuPost(null)}>
          <Pressable style={s.hoja} onPress={() => {}}>
            {esMio || esModerador ? (
              <Pressable
                style={({ pressed }) => [s.opcion, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  const post = menuPost!; setMenuPost(null);
                  Alert.alert('Eliminar publicación', '¿Seguro que quieres eliminarla?', [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Eliminar', style: 'destructive',
                      onPress: async () => {
                        const r = await eliminarPost(post.id);
                        if (r.ok) setPosts(prev => prev.filter(p => p.id !== post.id));
                        else Alert.alert('No se pudo eliminar', r.mensaje);
                      },
                    },
                  ]);
                }}
              >
                <IconX size={18} color={colors.dangerAction} />
                <Text style={[s.opcionTexto, { color: colors.dangerAction }]}>Eliminar publicación</Text>
              </Pressable>
            ) : (
              <>
                <Pressable style={({ pressed }) => [s.opcion, pressed && { opacity: 0.7 }]} onPress={reportar}>
                  <IconFlag size={18} color={colors.textPrimary} />
                  <Text style={s.opcionTexto}>Reportar publicación</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [s.opcion, pressed && { opacity: 0.7 }]} onPress={bloquear}>
                  <IconUserOff size={18} color={colors.dangerAction} />
                  <Text style={[s.opcionTexto, { color: colors.dangerAction }]}>Bloquear usuario</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  busquedaWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.xl, marginBottom: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.lg, minHeight: 48,
  },
  busquedaInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, paddingVertical: 10 },

  tabsRow: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingBottom: spacing.md, alignItems: 'center' },
  tab: {
    minHeight: 40, justifyContent: 'center', paddingHorizontal: 2,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActivo: { borderBottomColor: colors.accent },
  tabTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.textSecondary },
  tabTextoActivo: { color: colors.accent, fontFamily: fonts.bold },

  hashtagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  hashtagChip: { minHeight: 28, paddingHorizontal: spacing.sm, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.accentDark },
  hashtagTexto: { fontFamily: fonts.heading, fontSize: 12, color: colors.accent },
  moderarBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentDark,
    borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)', justifyContent: 'center', alignItems: 'center',
  },

  list: { paddingHorizontal: spacing.xl, paddingBottom: 100, gap: spacing.md },

  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface, padding: spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { backgroundColor: colors.accentDark, justifyContent: 'center', alignItems: 'center' },
  avatarIniciales: { fontFamily: fonts.bold, fontSize: 15, color: colors.accent },
  nombreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nombre: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  badgeTaller: { backgroundColor: colors.accentDark, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTallerTexto: { fontFamily: fonts.bold, fontSize: 10, color: colors.accent, textTransform: 'uppercase' },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 1 },

  acciones: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingVertical: spacing.sm },
  accionTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },

  contenido: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, lineHeight: 21 },
  categoria: { alignSelf: 'flex-start', marginBottom: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.accentDark },
  categoriaTexto: { fontFamily: fonts.bold, fontSize: 11, color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.6 },
  verMas: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  verMasTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.accent },

  esqLinea: { height: 12, borderRadius: 6, backgroundColor: colors.bgSurface },

  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, paddingBottom: 60 },
  vacioIcono: {
    width: 88, height: 88, borderRadius: radius.xl, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg,
  },
  vacioTitulo: { fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3, textAlign: 'center' },
  vacioSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },

  fab: {
    position: 'absolute', right: spacing.xl, bottom: spacing.xl,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },

  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  hoja: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: colors.bgSurface, paddingVertical: spacing.md, paddingBottom: spacing.xxl },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.xl },
  opcionTexto: { fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
});
