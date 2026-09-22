import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, Image as RNImage,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  IconAlertCircle, IconPhoto, IconLink, IconX, IconCheck, IconBrandTiktok, IconBrandInstagram,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useModo } from '../../context/ModoContext';
import { tokens } from '../../lib/tokens';
import {
  crearPost, subirFotoComunidad, detectarPlataforma, CATEGORIAS, type Categoria, type VideoPlataforma,
} from '../../lib/comunidad';
import CabeceraPantalla from '../../components/CabeceraPantalla';

const { colors, spacing, radius, fonts } = tokens;

const MAX_FOTOS = 4;
const MAX_CARACTERES = 500;

export default function CrearPostScreen({ navigation }: any) {
  const { session } = useAuth();
  const { tieneNegocio, negocioId } = useModo();

  const [contenido, setContenido] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [enlace, setEnlace] = useState('');
  const [comoNegocio, setComoNegocio] = useState(false);
  const [categoria, setCategoria] = useState<Categoria>('general');
  const [publicando, setPublicando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plataforma: VideoPlataforma | null = enlace.trim() ? detectarPlataforma(enlace) : null;
  const enlaceInvalido = enlace.trim().length > 0 && plataforma === null;
  const vacio = !contenido.trim() && !enlace.trim();

  async function agregarFotos() {
    if (fotos.length >= MAX_FOTOS) return;
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permiso.status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para agregar fotos.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', quality: 0.7, allowsMultipleSelection: true, selectionLimit: MAX_FOTOS - fotos.length,
    });
    if (resultado.canceled) return;

    setSubiendoFoto(true);
    for (const asset of resultado.assets) {
      const url = await subirFotoComunidad(asset.uri, session!.user.id);
      if (url) setFotos(prev => [...prev, url]);
    }
    setSubiendoFoto(false);
  }

  function quitarFoto(url: string) {
    setFotos(prev => prev.filter(f => f !== url));
  }

  async function publicar() {
    setError(null);
    if (vacio) { setError('Escribe algo o agrega un enlace de TikTok o Instagram.'); return; }
    if (enlaceInvalido) { setError('Ese enlace no es de TikTok ni de Instagram Reels.'); return; }

    setPublicando(true);
    const { data: perfil } = await supabase.from('usuarios').select('ciudad').eq('id', session!.user.id).maybeSingle();

    const r = await crearPost(session!.user.id, {
      contenido,
      fotosUrls: fotos,
      videoUrl: enlace.trim() || null,
      videoPlataforma: plataforma,
      categoria,
      ciudad: perfil?.ciudad ?? null,
      marca: null,
      negocioId: comoNegocio ? negocioId : null,
      rolAutor: comoNegocio ? 'negocio' : 'propietario',
    });
    setPublicando(false);

    if (!r.ok) { setError(r.mensaje); return; }
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <CabeceraPantalla titulo="Publicar" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TextInput
          style={s.textoInput}
          placeholder="¿Qué quieres compartir? Una ruta, un tip, un taller que recomiendas..."
          placeholderTextColor={colors.textTertiary}
          value={contenido}
          onChangeText={t => t.length <= MAX_CARACTERES && setContenido(t)}
          multiline
          textAlignVertical="top"
          autoFocus
        />
        <Text style={s.contador}>{contenido.length}/{MAX_CARACTERES}</Text>

        {fotos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            {fotos.map(url => (
              <View key={url} style={s.fotoWrap}>
                <RNImage source={{ uri: url }} style={s.foto} />
                <Pressable style={s.fotoQuitar} onPress={() => quitarFoto(url)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Quitar foto">
                  <IconX size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={s.accionesFila}>
          <Pressable
            style={({ pressed }) => [s.accionChip, pressed && { opacity: 0.8 }, fotos.length >= MAX_FOTOS && { opacity: 0.4 }]}
            onPress={agregarFotos}
            disabled={fotos.length >= MAX_FOTOS || subiendoFoto}
            accessibilityRole="button"
            accessibilityLabel="Agregar fotos"
          >
            {subiendoFoto ? <ActivityIndicator size="small" color={colors.accent} /> : <IconPhoto size={18} color={colors.accent} />}
            <Text style={s.accionChipTexto}>Fotos ({fotos.length}/{MAX_FOTOS})</Text>
          </Pressable>
        </View>

        <View style={{ gap: 6 }}>
          <View style={s.enlaceInputRow}>
            <IconLink size={18} color={colors.textTertiary} />
            <TextInput
              style={s.enlaceInput}
              placeholder="Pega un enlace de TikTok o Instagram Reels"
              placeholderTextColor={colors.textTertiary}
              value={enlace}
              onChangeText={setEnlace}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {plataforma === 'tiktok' && <IconBrandTiktok size={18} color={colors.accent} />}
            {plataforma === 'instagram' && <IconBrandInstagram size={18} color={colors.accent} />}
          </View>
          {enlaceInvalido && (
            <View style={s.errorRow}>
              <IconAlertCircle size={13} color={colors.dangerAction} />
              <Text style={s.errorInline}>Solo aceptamos enlaces de TikTok o Instagram Reels</Text>
            </View>
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={s.label}>Categoría</Text>
          <View style={s.chips}>
            {CATEGORIAS.map(({ key, label }) => {
              const activo = categoria === key;
              return (
                <Pressable
                  key={key}
                  style={({ pressed }) => [s.chip, activo && s.chipActivo, pressed && { opacity: 0.85 }]}
                  onPress={() => setCategoria(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                >
                  <Text style={[s.chipTexto, activo && s.chipTextoActivo]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {tieneNegocio && (
          <Pressable style={s.negocioRow} onPress={() => setComoNegocio(v => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: comoNegocio }}>
            <View style={[s.check, comoNegocio && s.checkOn]}>
              {comoNegocio && <IconCheck size={15} color={colors.onAccent} />}
            </View>
            <Text style={s.negocioTexto}>Publicar como mi taller</Text>
          </Pressable>
        )}

        {error && (
          <View style={s.errorRow}>
            <IconAlertCircle size={16} color={colors.dangerAction} />
            <Text style={s.errorInline}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.boton, (publicando || vacio) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
          onPress={publicar}
          disabled={publicando}
          accessibilityRole="button"
          accessibilityLabel="Publicar"
        >
          {publicando ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.botonTexto}>Publicar</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },

  textoInput: {
    minHeight: 100, fontFamily: fonts.body, fontSize: 17, color: colors.textPrimary,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.md,
  },
  contador: { fontFamily: fonts.body, fontSize: 11, color: colors.textTertiary, textAlign: 'right', marginTop: -spacing.sm },

  fotoWrap: { marginRight: spacing.sm },
  foto: { width: 90, height: 90, borderRadius: radius.md, backgroundColor: colors.bgSurface },
  fotoQuitar: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.dangerAction, justifyContent: 'center', alignItems: 'center',
  },

  accionesFila: { flexDirection: 'row', gap: spacing.sm },
  accionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: spacing.md,
    borderRadius: radius.pill, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
  },
  accionChipTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.accent },

  enlaceInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
    paddingHorizontal: spacing.md, minHeight: 50,
  },
  enlaceInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, paddingVertical: 12 },

  label: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
  },
  chipActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  chipTextoActivo: { fontFamily: fonts.bold, color: colors.onAccent },

  negocioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.bgSurface, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center' },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  negocioTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorInline: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.dangerAction },

  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl,
    backgroundColor: colors.bgPrimary, borderTopWidth: 1, borderTopColor: colors.bgCard,
  },
  boton: { backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 54, justifyContent: 'center', alignItems: 'center' },
  botonTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
});
