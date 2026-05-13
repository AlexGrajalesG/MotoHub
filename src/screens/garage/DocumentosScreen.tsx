import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Linking
} from 'react-native';
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
};

const TIPOS = [
  { key: 'soat', label: 'SOAT', emoji: '🛡️' },
  { key: 'tarjeta_propiedad', label: 'Tarjeta de Propiedad', emoji: '📋' },
  { key: 'tecnomecanica', label: 'Tecnomecanica', emoji: '🔧' },
  { key: 'otro', label: 'Otro', emoji: '📄' },
];

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
    const { data } = await supabase
      .from('documentos')
      .select('*')
      .eq('vehiculo_id', vehiculo.id)
      .order('created_at', { ascending: false });
    setDocumentos(data ?? []);
    setLoading(false);
  }

  async function handleSubir(tipo: string) {
    Alert.alert('Subir documento', 'Elige el tipo de archivo', [
      {
        text: 'Foto / Imagen',
        onPress: () => subirImagen(tipo),
      },
      {
        text: 'PDF',
        onPress: () => subirPDF(tipo),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function subirImagen(tipo: string) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop();
    await subirArchivo(tipo, asset.uri, `image/${ext}`);
  }

  async function subirPDF(tipo: string) {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await subirArchivo(tipo, asset.uri, 'application/pdf');
  }

  async function subirArchivo(tipo: string, uri: string, mimeType: string) {
    setUploading(tipo);
    try {
      const ext = mimeType === 'application/pdf' ? 'pdf' : 'jpg';
      const path = `${session?.user.id}/${vehiculo.id}/${tipo}_${Date.now()}.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(path, blob, { contentType: mimeType });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(path);

      await supabase.from('documentos').insert({
        vehiculo_id: vehiculo.id,
        tipo,
        nombre: `${tipo}_${Date.now()}`,
        archivo_url: publicUrl,
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
        <ActivityIndicator color="#ff6b00" size="large" />
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
              docs.map((doc) => (
                <View key={doc.id} style={styles.docCard}>
                  <TouchableOpacity
                    style={styles.docInfo}
                    onPress={() => Linking.openURL(doc.archivo_url)}
                  >
                    <Text style={styles.docNombre}>
                      {doc.archivo_url.endsWith('.pdf') ? '📄' : '🖼️'} Ver documento
                    </Text>
                    <Text style={styles.docFecha}>
                      {new Date(doc.created_at ?? '').toLocaleDateString('es-CO')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleEliminar(doc)}>
                    <Text style={styles.eliminar}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 24, paddingTop: 56 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  header: { marginBottom: 32 },
  back: { color: '#ff6b00', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  seccion: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  seccionEmoji: { fontSize: 20, marginRight: 8 },
  seccionLabel: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#fff' },
  subirBtn: {
    backgroundColor: '#ff6b00',
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
    padding: 12,
    marginTop: 8,
  },
  docInfo: { flex: 1 },
  docNombre: { color: '#fff', fontSize: 14 },
  docFecha: { color: '#666', fontSize: 12, marginTop: 2 },
  eliminar: { fontSize: 18, paddingLeft: 12 },
});
