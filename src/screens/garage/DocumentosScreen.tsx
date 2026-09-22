import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, Linking } from 'react-native';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import {
  IconShieldCheck, IconClipboardText, IconTool, IconFileText, IconFileTypePdf,
  IconPhoto, IconTrash, IconPlus,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import CabeceraPantalla from '../../components/CabeceraPantalla';

const { colors, spacing, radius, fonts } = tokens;

type Documento = {
  id: string;
  tipo: string;
  nombre: string;
  archivo_url: string;
  fecha_vencimiento: string | null;
  created_at?: string;
  signedUrl?: string;
};

const TIPOS = [
  { key: 'soat', label: 'SOAT', Icon: IconShieldCheck },
  { key: 'tarjeta_propiedad', label: 'Tarjeta de Propiedad', Icon: IconClipboardText },
  { key: 'tecnomecanica', label: 'Tecnomecánica', Icon: IconTool },
  { key: 'otro', label: 'Otro', Icon: IconFileText },
];

function extraerPath(urlOrPath: string): string {
  if (!urlOrPath.startsWith('http')) return urlOrPath;
  const marker = '/object/public/documentos/';
  const idx = urlOrPath.indexOf(marker);
  if (idx !== -1) return urlOrPath.slice(idx + marker.length);
  return urlOrPath;
}

export default function DocumentosScreen({ route, navigation }: any) {
  const { vehiculo } = route.params;
  const { session } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { fetchDocumentos(); }, []));

  async function fetchDocumentos() {
    try {
      const { data } = await supabase
        .from('documentos')
        .select('*')
        .eq('vehiculo_id', vehiculo.id)
        .order('created_at', { ascending: false });

      if (!data) { setDocumentos([]); return; }

      const docsConUrl = await Promise.all(
        data.map(async (doc) => {
          const path = extraerPath(doc.archivo_url);
          const { data: signed, error: signError } = await supabase.storage
            .from('documentos')
            .createSignedUrl(path, 3600);
          if (signError) console.error('[Docs] createSignedUrl error:', signError.message, '| path:', path);
          return { ...doc, signedUrl: signed?.signedUrl };
        })
      );

      setDocumentos(docsConUrl);
    } catch (e) {
      console.error('fetchDocumentos error:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleSubir(tipo: string) {
    Alert.alert('Subir documento', 'Elige el tipo de archivo', [
      { text: 'Foto / Imagen', onPress: () => subirImagen(tipo) },
      { text: 'PDF', onPress: () => subirPDF(tipo) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function subirImagen(tipo: string) {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const rawExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const ext = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(rawExt) ? rawExt : 'jpg';
    await subirArchivo(tipo, asset.uri, `image/${ext}`, ext);
  }

  async function subirPDF(tipo: string) {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled) return;
    const asset = result.assets[0];
    await subirArchivo(tipo, asset.uri, 'application/pdf', 'pdf');
  }

  async function subirArchivo(tipo: string, uri: string, mimeType: string, ext: string) {
    setUploading(tipo);
    try {
      const path = `${session?.user.id}/${vehiculo.id}/${tipo}_${Date.now()}.${ext}`;
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) throw new Error('No se pudo leer el archivo. Intenta de nuevo.');

      const { error: uploadError } = await supabase.storage.from('documentos').upload(path, arrayBuffer, { contentType: mimeType });
      if (uploadError) throw uploadError;

      await supabase.from('documentos').insert({
        vehiculo_id: vehiculo.id, tipo, nombre: `${tipo}_${Date.now()}`, archivo_url: path,
      });

      await fetchDocumentos();
    } catch (e: any) {
      Alert.alert('No se pudo subir', e.message);
    } finally {
      setUploading(null);
    }
  }

  function handleEliminar(doc: Documento) {
    Alert.alert('Eliminar', '¿Eliminar este documento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const path = extraerPath(doc.archivo_url);
          await supabase.storage.from('documentos').remove([path]);
          await supabase.from('documentos').delete().eq('id', doc.id);
          await fetchDocumentos();
        },
      },
    ]);
  }

  function docsPorTipo(tipo: string) {
    return documentos.filter((d) => d.tipo === tipo);
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <View style={s.container}>
      <CabeceraPantalla titulo="Documentos" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.subtitulo}>{vehiculo.marca} {vehiculo.modelo}</Text>

        {TIPOS.map(({ key, label, Icon }) => {
          const docs = docsPorTipo(key);
          const subiendo = uploading === key;

          return (
            <View key={key} style={s.seccion}>
              <View style={s.seccionHeader}>
                <Icon size={18} color={colors.accent} />
                <Text style={s.seccionLabel}>{label}</Text>
                <Pressable
                  style={({ pressed }) => [s.subirBtn, subiendo && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
                  onPress={() => handleSubir(key)}
                  disabled={subiendo}
                  accessibilityRole="button"
                  accessibilityLabel={`Subir ${label}`}
                >
                  {subiendo
                    ? <ActivityIndicator color={colors.onAccent} size="small" />
                    : <><IconPlus size={14} color={colors.onAccent} /><Text style={s.subirBtnText}>Subir</Text></>}
                </Pressable>
              </View>

              {docs.length === 0 ? (
                <Text style={s.vacio}>Sin documentos</Text>
              ) : (
                docs.map((doc) => {
                  const esPDF = extraerPath(doc.archivo_url).endsWith('.pdf');
                  return (
                    <Pressable
                      key={doc.id}
                      style={({ pressed }) => [s.docCard, pressed && { opacity: 0.85 }]}
                      onPress={() => doc.signedUrl && Linking.openURL(doc.signedUrl)}
                      accessibilityRole="button"
                      accessibilityLabel={esPDF ? 'Ver PDF' : 'Ver imagen'}
                    >
                      {esPDF ? (
                        <View style={s.pdfPreview}><IconFileTypePdf size={24} color={colors.accent} /></View>
                      ) : doc.signedUrl ? (
                        <Image source={doc.signedUrl} style={s.imgPreview} contentFit="cover" />
                      ) : (
                        <View style={s.pdfPreview}><IconPhoto size={24} color={colors.textTertiary} /></View>
                      )}
                      <View style={s.docMeta}>
                        <Text style={s.docNombre}>{esPDF ? 'Ver PDF' : 'Ver imagen'}</Text>
                        <Text style={s.docFecha}>{doc.created_at ? new Date(doc.created_at).toLocaleDateString('es-CO') : ''}</Text>
                      </View>
                      <Pressable
                        style={s.eliminarBtn}
                        onPress={() => handleEliminar(doc)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Eliminar documento"
                      >
                        <IconTrash size={18} color={colors.dangerAction} />
                      </Pressable>
                    </Pressable>
                  );
                })
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  subtitulo: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg },

  seccion: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.bgSurface,
  },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  seccionLabel: { flex: 1, fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
  subirBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent,
    borderRadius: radius.md, minHeight: 32, paddingHorizontal: spacing.md,
  },
  subirBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.onAccent },
  vacio: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, paddingLeft: 2 },

  docCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm,
  },
  imgPreview: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.bgSurface },
  pdfPreview: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center' },
  docMeta: { flex: 1 },
  docNombre: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  docFecha: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  eliminarBtn: { padding: spacing.xs },
});
