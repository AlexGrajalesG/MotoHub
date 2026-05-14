import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Linking
} from 'react-native';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

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
  { key: 'soat', label: 'SOAT', emoji: '🛡️' },
  { key: 'tarjeta_propiedad', label: 'Tarjeta de Propiedad', emoji: '📋' },
  { key: 'tecnomecanica', label: 'Tecnomecanica', emoji: '🔧' },
  { key: 'otro', label: 'Otro', emoji: '📄' },
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

  useFocusEffect(
    useCallback(() => {
      fetchDocumentos();
    }, [])
  );

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
          else console.log('[Docs] signed URL ok para:', path);
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

  async function handleSubir(tipo: string) {
    Alert.alert('Subir documento', 'Elige el tipo de archivo', [
      { text: 'Foto / Imagen', onPress: () => subirImagen(tipo) },
      { text: 'PDF', onPress: () => subirPDF(tipo) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function subirImagen(tipo: string) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
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

      if (arrayBuffer.byteLength === 0) {
        throw new Error('No se pudo leer el archivo. Intenta de nuevo.');
      }

      console.log('[Upload]', tipo, arrayBuffer.byteLength, 'bytes');

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(path, arrayBuffer, { contentType: mimeType });

      if (uploadError) throw uploadError;

      await supabase.from('documentos').insert({
        vehiculo_id: vehiculo.id,
        tipo,
        nombre: `${tipo}_${Date.now()}`,
        archivo_url: path,
      });

      await fetchDocumentos();
      Alert.alert('Listo', 'Documento subido correctamente');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUploading(null);
    }
  }

  async function handleEliminar(doc: Documento) {
    Alert.alert('Eliminar', '¿Eliminar este documento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
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
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e8522a" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Documentos</Text>
        <Text style={styles.subtitle}>{vehiculo.marca} {vehiculo.modelo}</Text>
      </View>

      {TIPOS.map((tipo) => {
        const docs = docsPorTipo(tipo.key);
        const subiendo = uploading === tipo.key;

        return (
          <View key={tipo.key} style={styles.seccion}>
            <View style={styles.seccionHeader}>
              <Text style={styles.seccionEmoji}>{tipo.emoji}</Text>
              <Text style={styles.seccionLabel}>{tipo.label}</Text>
              <TouchableOpacity
                style={[styles.subirBtn, subiendo && styles.subirBtnDisabled]}
                onPress={() => handleSubir(tipo.key)}
                disabled={subiendo}
              >
                {subiendo
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.subirBtnText}>+ Subir</Text>
                }
              </TouchableOpacity>
            </View>

            {docs.length === 0 ? (
              <Text style={styles.vacio}>Sin documentos</Text>
            ) : (
              docs.map((doc) => {
                const esPDF = extraerPath(doc.archivo_url).endsWith('.pdf');
                return (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.docCard}
                    onPress={() => doc.signedUrl && Linking.openURL(doc.signedUrl)}
                  >
                    {esPDF ? (
                      <View style={styles.pdfPreview}>
                        <Text style={styles.pdfIcon}>PDF</Text>
                      </View>
                    ) : doc.signedUrl ? (
                      <Image
                        source={doc.signedUrl}
                        style={styles.imgPreview}
                        contentFit="cover"
                        onError={(e) => console.error('[Docs] Image load error:', e, '| url:', doc.signedUrl?.slice(0, 80))}
                      />
                    ) : (
                      <View style={styles.pdfPreview}>
                        <Text style={styles.pdfIcon}>🖼️</Text>
                      </View>
                    )}
                    <View style={styles.docMeta}>
                      <Text style={styles.docNombre}>
                        {esPDF ? 'Ver PDF' : 'Ver imagen'}
                      </Text>
                      <Text style={styles.docFecha}>
                        {doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString('es-CO')
                          : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.eliminarBtn}
                      onPress={() => handleEliminar(doc)}
                    >
                      <Text style={styles.eliminar}>🗑️</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111318' },
  content: { padding: 24, paddingTop: 56 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111318' },
  header: { marginBottom: 32 },
  back: { color: '#e8522a', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  seccion: {
    backgroundColor: '#1c1f27',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2d38',
  },
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  seccionEmoji: { fontSize: 20, marginRight: 8 },
  seccionLabel: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#fff' },
  subirBtn: {
    backgroundColor: '#e8522a',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  subirBtnDisabled: { opacity: 0.6 },
  subirBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  vacio: { color: '#444', fontSize: 13, paddingLeft: 4 },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 12,
  },
  imgPreview: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  pdfPreview: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#2a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfIcon: { color: '#e8522a', fontWeight: 'bold', fontSize: 12 },
  docMeta: { flex: 1 },
  docNombre: { color: '#fff', fontSize: 14 },
  docFecha: { color: '#666', fontSize: 12, marginTop: 2 },
  eliminarBtn: { padding: 4 },
  eliminar: { fontSize: 18 },
});
