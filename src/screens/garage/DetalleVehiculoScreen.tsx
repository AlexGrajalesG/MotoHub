import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Pressable, Dimensions, Linking,
  Animated, AccessibilityInfo, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  IconPencil, IconBell, IconTool, IconClock,
  IconShield, IconId, IconSettings, IconFile,
  IconTrash, IconX, IconChevronRight,
  IconCamera,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { verificarRecordatoriosKm } from '../../lib/notificaciones';
import { tokens } from '../../lib/tokens';
import { getDocStatus, formatFechaCorta } from '../../lib/documentos';
import { TIPO_LABEL, formatFecha } from '../../lib/historial';

const { colors, spacing, radius, fonts } = tokens;
const { width: SW } = Dimensions.get('window');

/* ─── Types ─── */
type Vehiculo = {
  id: string; marca: string; modelo: string; anio: number;
  placa: string; tipo: string; kilometraje: number; fotos: string[];
};

type DocItem = {
  id: string; tipo: string; archivo_url: string;
  fecha_vencimiento: string | null;
  created_at: string; signedUrl?: string;
};

type RegistroHistorial = {
  id: string;
  tipo: string;
  descripcion: string | null;
  fecha: string;
  km_en_servicio: number | null;
  taller: string | null;
  negocio_nombre: string | null;
};

/* ─── Constantes docs ─── */
const DOC_TIPOS: { key: string; label: string; Icon: any }[] = [
  { key: 'soat',              label: 'SOAT',                 Icon: IconShield   },
  { key: 'tarjeta_propiedad', label: 'Tarjeta de Propiedad', Icon: IconId       },
  { key: 'tecnomecanica',     label: 'Tecnomecánica',        Icon: IconSettings },
  { key: 'otro',              label: 'Otro documento',       Icon: IconFile     },
];

/** Tipos de documento que tienen fecha de vencimiento relevante. */
const TIPOS_CON_VENCIMIENTO = new Set(['soat', 'tecnomecanica']);

function extraerPathFotos(url: string): string {
  if (!url.startsWith('http')) return url;
  const marker = '/object/public/fotos/';
  const idx = url.indexOf(marker);
  return idx !== -1 ? url.slice(idx + marker.length) : url;
}

function extraerPathDocs(urlOrPath: string): string {
  if (!urlOrPath.startsWith('http')) return urlOrPath;
  const marker = '/object/public/documentos/';
  const idx = urlOrPath.indexOf(marker);
  if (idx !== -1) return urlOrPath.slice(idx + marker.length);
  const markerPriv = '/storage/v1/object/sign/documentos/';
  const idx2 = urlOrPath.indexOf(markerPriv);
  return idx2 !== -1 ? urlOrPath.slice(idx2 + markerPriv.length).split('?')[0] : urlOrPath;
}

/* ════════════════════════════════════════════════════════
   PANTALLA PRINCIPAL
   ════════════════════════════════════════════════════════ */
export default function DetalleVehiculoScreen({ route, navigation }: any) {
  const { vehiculo: inicial } = route.params;
  const { session } = useAuth();
  const [vehiculo, setVehiculo] = useState<Vehiculo>({ ...inicial, fotos: inicial.fotos ?? [] });
  const [subiendo, setSubiendo] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  /* Docs state */
  const [documentos, setDocumentos]   = useState<DocItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [viewingImg, setViewingImg]   = useState<string | null>(null);

  /* Fecha de vencimiento (SOAT/Tecno) */
  const [pendingUpload, setPendingUpload] = useState<{ tipo: string; uri: string; mimeType: string; ext: string } | null>(null);
  const [fechaPicker, setFechaPicker]      = useState(new Date());

  /* Historial preview */
  const [historialPreview, setHistorialPreview] = useState<RegistroHistorial[]>([]);

  /* Actualizar kilometraje */
  const [editandoKm, setEditandoKm] = useState(false);
  const [kmInput, setKmInput]       = useState('');

  /* Animaciones */
  const docSectionOp = useRef(new Animated.Value(0)).current;
  const activeDotOp  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(v => {
      setReduceMotion(v);
      if (v) docSectionOp.setValue(1);
      else {
        Animated.loop(
          Animated.sequence([
            Animated.timing(activeDotOp, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            Animated.timing(activeDotOp, { toValue: 1,   duration: 800, useNativeDriver: true }),
          ])
        ).start();
      }
    });
  }, []);

  useFocusEffect(useCallback(() => {
    refrescar();
    fetchDocumentos();
    fetchHistorialPreview();
  }, []));

  /* ── Historial preview ── */
  async function fetchHistorialPreview() {
    const { data } = await supabase
      .from('historial_mantenimiento')
      .select('id,tipo,descripcion,fecha,km_en_servicio,taller,negocio_nombre')
      .eq('vehiculo_id', inicial.id)
      .order('fecha', { ascending: false })
      .limit(2);
    setHistorialPreview(data ?? []);
  }

  /* ── Vehículo ── */
  async function refrescar() {
    const { data } = await supabase
      .from('vehiculos')
      .select('id, marca, modelo, anio, placa, tipo, kilometraje, fotos')
      .eq('id', inicial.id).single();
    if (data) setVehiculo({ ...data, fotos: data.fotos ?? [] });
  }

  async function handleAgregarFoto() {
    if (vehiculo.fotos.length >= 5) {
      Alert.alert('Límite', 'Máximo 5 fotos por vehículo'); return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85 });
    if (result.canceled) return;
    setSubiendo(true);
    try {
      const asset  = result.assets[0];
      const rawExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const ext    = ['jpg','jpeg','png','heic','webp'].includes(rawExt) ? rawExt : 'jpg';
      const path   = `${session?.user.id}/${vehiculo.id}/${Date.now()}.${ext}`;

      const response = await fetch(asset.uri);
      const buffer   = await response.arrayBuffer();
      if (buffer.byteLength === 0) throw new Error('No se pudo leer la imagen');

      const { error: upErr } = await supabase.storage.from('fotos')
        .upload(path, buffer, { contentType: `image/${ext}` });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path);
      const nuevas = [...vehiculo.fotos, publicUrl];
      await supabase.from('vehiculos').update({ fotos: nuevas }).eq('id', vehiculo.id);
      setVehiculo(v => ({ ...v, fotos: nuevas }));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubiendo(false);
    }
  }

  function handleLongPressFoto(url: string) {
    Alert.alert('Eliminar foto', '¿Quieres eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarFoto(url) },
    ]);
  }

  async function eliminarFoto(url: string) {
    const path = extraerPathFotos(url);
    await supabase.storage.from('fotos').remove([path]);
    const nuevas = vehiculo.fotos.filter(f => f !== url);
    await supabase.from('vehiculos').update({ fotos: nuevas }).eq('id', vehiculo.id);
    setVehiculo(v => ({ ...v, fotos: nuevas }));
  }

  function handleActualizarKm() {
    setKmInput(String(vehiculo.kilometraje));
    setEditandoKm(true);
  }

  async function confirmarKm() {
    const nuevoKm = parseInt(kmInput);
    if (isNaN(nuevoKm) || nuevoKm < vehiculo.kilometraje) {
      Alert.alert('Error', `El valor debe ser ≥ ${vehiculo.kilometraje.toLocaleString()} km`); return;
    }
    setEditandoKm(false);
    const { error } = await supabase.from('vehiculos').update({ kilometraje: nuevoKm }).eq('id', vehiculo.id);
    if (error) { Alert.alert('Error', error.message); return; }
    setVehiculo(v => ({ ...v, kilometraje: nuevoKm }));
    await verificarRecordatoriosKm(vehiculo.id, `${vehiculo.marca} ${vehiculo.modelo}`, nuevoKm);
  }

  /* ── Documentos ── */
  async function fetchDocumentos() {
    setLoadingDocs(true);
    try {
      const { data } = await supabase
        .from('documentos')
        .select('*')
        .eq('vehiculo_id', vehiculo.id)
        .order('created_at', { ascending: false });

      if (!data) { setDocumentos([]); return; }

      const conUrls = await Promise.all(data.map(async (doc) => {
        const path = extraerPathDocs(doc.archivo_url);
        const { data: signed } = await supabase.storage.from('documentos').createSignedUrl(path, 3600);
        return { ...doc, signedUrl: signed?.signedUrl };
      }));
      setDocumentos(conUrls);

      if (!reduceMotion) {
        Animated.timing(docSectionOp, { toValue: 1, duration: 300, delay: 80, useNativeDriver: true }).start();
      }
    } catch (e) {
      console.error('fetchDocumentos:', e);
    } finally {
      setLoadingDocs(false);
    }
  }

  async function handleSubirDoc(tipo: string) {
    Alert.alert('Subir documento', 'Elige el tipo de archivo', [
      { text: 'Foto / Imagen', onPress: () => subirImagen(tipo) },
      { text: 'PDF',           onPress: () => subirPDF(tipo) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function subirImagen(tipo: string) {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85 });
    if (result.canceled) return;
    const asset  = result.assets[0];
    const rawExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const ext    = ['jpg','jpeg','png','heic','webp'].includes(rawExt) ? rawExt : 'jpg';
    iniciarSubida(tipo, asset.uri, `image/${ext}`, ext);
  }

  async function subirPDF(tipo: string) {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled) return;
    iniciarSubida(tipo, result.assets[0].uri, 'application/pdf', 'pdf');
  }

  function iniciarSubida(tipo: string, uri: string, mimeType: string, ext: string) {
    if (TIPOS_CON_VENCIMIENTO.has(tipo)) {
      setFechaPicker(new Date());
      setPendingUpload({ tipo, uri, mimeType, ext });
    } else {
      subirArchivo(tipo, uri, mimeType, ext, null);
    }
  }

  async function confirmarFechaVencimiento() {
    if (!pendingUpload) return;
    const { tipo, uri, mimeType, ext } = pendingUpload;
    setPendingUpload(null);
    await subirArchivo(tipo, uri, mimeType, ext, fechaPicker.toISOString().slice(0, 10));
  }

  async function subirArchivo(tipo: string, uri: string, mimeType: string, ext: string, fechaVencimiento: string | null) {
    setUploadingDoc(tipo);
    try {
      const path  = `${session?.user.id}/${vehiculo.id}/${tipo}_${Date.now()}.${ext}`;
      const resp  = await fetch(uri);
      const buffer = await resp.arrayBuffer();
      if (buffer.byteLength === 0) throw new Error('No se pudo leer el archivo');

      const { error: upErr } = await supabase.storage.from('documentos')
        .upload(path, buffer, { contentType: mimeType });
      if (upErr) throw upErr;

      await supabase.from('documentos').insert({
        vehiculo_id: vehiculo.id, tipo, nombre: `${tipo}_${Date.now()}`, archivo_url: path,
        fecha_vencimiento: fechaVencimiento,
      });
      await fetchDocumentos();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUploadingDoc(null);
    }
  }

  async function handleEliminarDoc(doc: DocItem) {
    Alert.alert('Eliminar documento', '¿Confirmas la eliminación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const path = extraerPathDocs(doc.archivo_url);
          await supabase.storage.from('documentos').remove([path]);
          await supabase.from('documentos').delete().eq('id', doc.id);
          await fetchDocumentos();
        },
      },
    ]);
  }

  /* ── Render ── */
  const filas = [
    { label: 'Marca',       valor: vehiculo.marca,                         onPress: undefined },
    { label: 'Modelo',      valor: vehiculo.modelo,                        onPress: undefined },
    { label: 'Año',         valor: String(vehiculo.anio),                  onPress: undefined },
    { label: 'Placa',       valor: vehiculo.placa.toUpperCase(),           onPress: undefined },
    { label: 'Tipo',        valor: vehiculo.tipo,                          onPress: undefined },
    { label: 'Kilometraje', valor: `${vehiculo.kilometraje.toLocaleString()} km`, onPress: handleActualizarKm },
  ];

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Foto hero ── */}
        <View style={s.heroWrapper}>
          {vehiculo.fotos.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.92} style={s.hero}
              onLongPress={() => handleLongPressFoto(vehiculo.fotos[0])}
            >
              <Image source={vehiculo.fotos[0]} style={s.heroFoto} contentFit="cover" />
              <LinearGradient colors={['transparent', colors.bgPrimary]} style={s.heroGradient} pointerEvents="none" />
              <View style={s.heroActiveBadge}>
                <Animated.View style={[s.heroActiveDot, { opacity: activeDotOp }]} />
                <Text style={s.heroActiveText}>Activo</Text>
              </View>
              <View style={s.heroPlacaChip}>
                <Text style={s.heroPlacaText}>{vehiculo.placa.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.heroEmpty} onPress={handleAgregarFoto} disabled={subiendo}>
              {subiendo
                ? <ActivityIndicator color={colors.accent} />
                : <>
                    <IconCamera size={28} color={colors.accent} />
                    <Text style={s.heroEmptyText}>Agregar foto</Text>
                  </>
              }
            </TouchableOpacity>
          )}

          {vehiculo.fotos.length > 1 || vehiculo.fotos.length < 5 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbs}>
              {vehiculo.fotos.slice(1).map((url, idx) => (
                <TouchableOpacity key={idx} onLongPress={() => handleLongPressFoto(url)} activeOpacity={0.88} style={s.thumbItem}>
                  <Image source={url} style={s.thumbFoto} contentFit="cover" />
                </TouchableOpacity>
              ))}
              {vehiculo.fotos.length < 5 && (
                <TouchableOpacity style={s.thumbAddBtn} onPress={handleAgregarFoto} disabled={subiendo}>
                  {subiendo
                    ? <ActivityIndicator color={colors.accent} size="small" />
                    : <IconCamera size={20} color={colors.accent} />
                  }
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : null}

          {vehiculo.fotos.length > 0 && (
            <Text style={s.galeriaHint}>Mantén presionado para eliminar</Text>
          )}
        </View>

        {/* ── Info nombre ── */}
        <View style={s.infoHeader}>
          <Text style={s.nombre} numberOfLines={1}>{vehiculo.marca} {vehiculo.modelo}</Text>
          <TouchableOpacity
            style={s.editarBtn}
            onPress={() => navigation.navigate('EditarVehiculo', { vehiculo })}
          >
            <IconPencil size={14} color={colors.accent} />
            <Text style={s.editarText}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* ── Datos ── */}
        <View style={s.card}>
          {filas.map((fila, i) => (
            <TouchableOpacity
              key={fila.label}
              style={[s.fila, i === filas.length - 1 && s.filaLast]}
              onPress={fila.onPress}
              disabled={!fila.onPress}
              activeOpacity={fila.onPress ? 0.6 : 1}
            >
              <Text style={s.filaLabel}>{fila.label}</Text>
              <View style={s.filaRight}>
                <Text style={[s.filaValor, !!fila.onPress && s.filaEditable]}>{fila.valor}</Text>
                {!!fila.onPress && <IconChevronRight size={14} color={colors.accent} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Acciones ── */}
        <View style={s.acciones}>
          <TouchableOpacity
            style={s.accion}
            onPress={() => navigation.navigate('HistorialVehiculo', { vehiculo })}
          >
            <IconClock size={22} color={colors.iconInactive} />
            <Text style={s.accionTexto}>Historial</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.accion}
            onPress={() => navigation.navigate('Recordatorios', { vehiculo })}
          >
            <IconBell size={22} color={colors.iconInactive} />
            <Text style={s.accionTexto}>Recordatorios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.accion}
            onPress={() => navigation.navigate('AgregarHistorial', { vehiculo })}
          >
            <IconTool size={22} color={colors.iconInactive} />
            <Text style={s.accionTexto}>Servicio</Text>
          </TouchableOpacity>
        </View>

        {/* ── Documentos inline ── */}
        <Animated.View style={{ opacity: loadingDocs ? 1 : docSectionOp }}>
          <DocumentosInline
            documentos={documentos}
            loading={loadingDocs}
            uploading={uploadingDoc}
            onSubir={handleSubirDoc}
            onEliminar={handleEliminarDoc}
            onVerImagen={setViewingImg}
          />
        </Animated.View>

        {/* ── Historial de mantenimiento (preview) ── */}
        {historialPreview.length > 0 && (
          <HistorialPreview
            registros={historialPreview}
            onVerTodo={() => navigation.navigate('HistorialVehiculo', { vehiculo })}
          />
        )}

      </ScrollView>

      {/* ── Modal imagen fullscreen ── */}
      <Modal visible={!!viewingImg} transparent animationType="fade" onRequestClose={() => setViewingImg(null)}>
        <Pressable style={s.modalBg} onPress={() => setViewingImg(null)}>
          {viewingImg && (
            <Image source={{ uri: viewingImg }} style={s.modalImg} contentFit="contain" />
          )}
          <TouchableOpacity style={s.modalClose} onPress={() => setViewingImg(null)}>
            <IconX size={20} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* ── Modal actualizar kilometraje ── */}
      <Modal visible={editandoKm} transparent animationType="fade" onRequestClose={() => setEditandoKm(false)}>
        <View style={s.modalBg}>
          <View style={s.fechaCard}>
            <Text style={s.fechaTitle}>Actualizar kilometraje</Text>
            <Text style={s.fechaSubtitle}>Actual: {vehiculo.kilometraje.toLocaleString()} km</Text>
            <TextInput
              style={s.kmInput}
              value={kmInput}
              onChangeText={setKmInput}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
            />
            <View style={s.fechaBtns}>
              <TouchableOpacity style={s.fechaBtnCancelar} onPress={() => setEditandoKm(false)}>
                <Text style={s.fechaBtnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.fechaBtnGuardar} onPress={confirmarKm}>
                <Text style={s.fechaBtnGuardarText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal fecha de vencimiento ── */}
      <Modal visible={!!pendingUpload} transparent animationType="fade" onRequestClose={() => setPendingUpload(null)}>
        <View style={s.modalBg}>
          <View style={s.fechaCard}>
            <Text style={s.fechaTitle}>Fecha de vencimiento</Text>
            <Text style={s.fechaSubtitle}>
              {DOC_TIPOS.find(d => d.key === pendingUpload?.tipo)?.label}
            </Text>
            <DateTimePicker
              value={fechaPicker}
              mode="date"
              display="spinner"
              themeVariant="dark"
              onChange={(_, date) => date && setFechaPicker(date)}
            />
            <View style={s.fechaBtns}>
              <TouchableOpacity style={s.fechaBtnCancelar} onPress={() => setPendingUpload(null)}>
                <Text style={s.fechaBtnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.fechaBtnGuardar} onPress={confirmarFechaVencimiento}>
                <Text style={s.fechaBtnGuardarText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ════════════════════════════════════════════════════════
   DOCUMENTOS INLINE
   ════════════════════════════════════════════════════════ */
function DocumentosInline({
  documentos, loading, uploading, onSubir, onEliminar, onVerImagen,
}: {
  documentos: DocItem[];
  loading: boolean;
  uploading: string | null;
  onSubir: (tipo: string) => void;
  onEliminar: (doc: DocItem) => void;
  onVerImagen: (url: string) => void;
}) {
  return (
    <View style={ds.container}>
      <Text style={ds.sectionTitle}>Documentos</Text>

      {loading ? (
        <View style={ds.loadingWrap}>
          <ActivityIndicator color={colors.accent} size="small" />
        </View>
      ) : (
        DOC_TIPOS.map(({ key, label, Icon }) => {
          const docs      = documentos.filter(d => d.tipo === key);
          const subiendo  = uploading === key;

          const conVencimiento = TIPOS_CON_VENCIMIENTO.has(key);
          const docsConFecha   = docs.filter(d => d.fecha_vencimiento);
          const masReciente    = docsConFecha.length > 0
            ? docsConFecha.reduce((a, b) => (a.fecha_vencimiento! > b.fecha_vencimiento! ? a : b))
            : null;
          const estado = masReciente ? getDocStatus(masReciente.fecha_vencimiento) : null;

          const ctaPrimaria = conVencimiento && (!estado || estado.estado !== 'al_dia');
          const ctaLabel = !conVencimiento
            ? 'Subir documento'
            : estado?.estado === 'al_dia' ? 'Actualizar' : 'Renovar';

          return (
            <View key={key} style={ds.tipoCard}>
              {/* Cabecera tipo */}
              <View style={ds.tipoHeader}>
                <View style={ds.tipoIconWrap}>
                  <Icon size={20} color={colors.accent} />
                </View>
                <View style={ds.tipoHeaderText}>
                  <Text style={ds.tipoLabel}>{label}</Text>
                  {conVencimiento && masReciente ? (
                    <Text style={ds.tipoExp}>Exp: {formatFechaCorta(masReciente.fecha_vencimiento!)}</Text>
                  ) : !conVencimiento && docs.length > 0 ? (
                    <Text style={ds.tipoExp}>{docs.length} archivo{docs.length > 1 ? 's' : ''}</Text>
                  ) : null}
                </View>
                {conVencimiento && estado && (
                  estado.estado === 'al_dia' ? (
                    <View style={ds.estadoPillNeutral}>
                      <Text style={ds.estadoPillTextNeutral}>{estado.label.toUpperCase()}</Text>
                    </View>
                  ) : (
                    <View style={[ds.estadoPill, { backgroundColor: estado.color + '22', borderColor: estado.color + '55' }]}>
                      <Text style={[ds.estadoPillText, { color: estado.color }]}>
                        {estado.label.toUpperCase()}
                      </Text>
                    </View>
                  )
                )}
              </View>

              {/* Lista docs */}
              {docs.length > 0 && (
                <View style={ds.docList}>
                  {docs.map((doc) => {
                    const esPDF = doc.archivo_url.endsWith('.pdf');
                    return (
                      <DocRow
                        key={doc.id}
                        doc={doc}
                        esPDF={esPDF}
                        onPress={() => {
                          if (esPDF) {
                            doc.signedUrl && Linking.openURL(doc.signedUrl);
                          } else {
                            doc.signedUrl && onVerImagen(doc.signedUrl);
                          }
                        }}
                        onEliminar={() => onEliminar(doc)}
                      />
                    );
                  })}
                </View>
              )}

              {/* CTA */}
              <TouchableOpacity
                style={[ds.cta, ctaPrimaria ? ds.ctaPrimary : ds.ctaSecondary, subiendo && ds.ctaDisabled]}
                onPress={() => onSubir(key)}
                disabled={subiendo}
              >
                {subiendo
                  ? <ActivityIndicator size="small" color={ctaPrimaria ? '#fff' : colors.accent} />
                  : <Text style={[ds.ctaText, ctaPrimaria ? ds.ctaTextPrimary : ds.ctaTextSecondary]}>
                      {ctaLabel.toUpperCase()}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );
}

function DocRow({ doc, esPDF, onPress, onEliminar }: {
  doc: DocItem; esPDF: boolean;
  onPress: () => void; onEliminar: () => void;
}) {
  const fecha = doc.created_at
    ? new Date(doc.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  return (
    <TouchableOpacity style={ds.docRow} onPress={onPress} activeOpacity={0.75}>
      {/* Thumbnail */}
      {esPDF ? (
        <View style={ds.pdfThumb}>
          <Text style={ds.pdfLabel}>PDF</Text>
        </View>
      ) : doc.signedUrl ? (
        <Image source={{ uri: doc.signedUrl }} style={ds.imgThumb} contentFit="cover" />
      ) : (
        <View style={ds.pdfThumb}><IconFile size={20} color={colors.accent} /></View>
      )}

      {/* Meta */}
      <View style={ds.docMeta}>
        <Text style={ds.docTipo}>{esPDF ? 'PDF' : 'Imagen'}</Text>
        <Text style={ds.docFecha}>{fecha}</Text>
      </View>

      {/* Delete */}
      <TouchableOpacity style={ds.deleteBtn} onPress={onEliminar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <IconTrash size={16} color={colors.dangerAction} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

/* ════════════════════════════════════════════════════════
   HISTORIAL DE MANTENIMIENTO (preview)
   ════════════════════════════════════════════════════════ */
function HistorialPreview({ registros, onVerTodo }: {
  registros: RegistroHistorial[];
  onVerTodo: () => void;
}) {
  return (
    <View style={hs.container}>
      <View style={hs.header}>
        <Text style={hs.sectionTitle}>Historial de Mantenimiento</Text>
        <TouchableOpacity onPress={onVerTodo} hitSlop={8}>
          <Text style={hs.verTodo}>Ver Todo</Text>
        </TouchableOpacity>
      </View>

      {registros.map((item, idx) => {
        const titulo = item.tipo === 'personalizado' && item.descripcion
          ? item.descripcion
          : (TIPO_LABEL[item.tipo] ?? item.tipo);
        const proveedor = item.negocio_nombre || item.taller;
        const sub = [proveedor, item.km_en_servicio ? `${item.km_en_servicio.toLocaleString('es-CO')} km` : null]
          .filter(Boolean).join(' · ');
        const reciente = idx === 0;
        const isLast   = idx === registros.length - 1;

        return (
          <View key={item.id} style={[hs.item, !isLast && hs.itemConnected]}>
            <View style={hs.dotRing}>
              <View style={[hs.dot, reciente ? hs.dotActivo : hs.dotInactivo]} />
            </View>
            <View style={[hs.itemCard, !reciente && hs.itemCardOld]}>
              <View style={hs.itemTop}>
                <Text style={hs.itemTitulo} numberOfLines={1}>{titulo}</Text>
                <Text style={[hs.itemFecha, reciente ? hs.itemFechaActivo : hs.itemFechaInactivo]}>
                  {formatFecha(item.fecha)}
                </Text>
              </View>
              {sub ? <Text style={hs.itemSub} numberOfLines={1}>{sub}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ─── Estilos pantalla ─── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content:   { paddingBottom: 48 },

  heroWrapper: { paddingTop: 56, paddingHorizontal: spacing.lg },
  hero: {
    width: '100%', height: 240, borderRadius: radius.lg,
    overflow: 'hidden', position: 'relative', backgroundColor: colors.bgCard,
  },
  heroFoto:     { width: '100%', height: '100%' },
  heroGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' },
  heroEmpty: {
    width: '100%', height: 240, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.bgSurface, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgCard, gap: 8,
  },
  heroEmptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  heroActiveBadge: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.pill,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10, paddingVertical: 5,
  },
  heroActiveDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  heroActiveText: {
    fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.5,
    color: '#fff', textTransform: 'uppercase',
  },
  heroPlacaChip: {
    position: 'absolute', bottom: spacing.md, left: spacing.md,
    backgroundColor: colors.bgSurface, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.accent,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  heroPlacaText: {
    fontFamily: fonts.display, fontSize: 16, color: colors.accent,
    letterSpacing: 3, textTransform: 'uppercase',
  },

  thumbs:        { gap: 8, paddingTop: spacing.sm, alignItems: 'center' },
  thumbItem:     { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden' },
  thumbFoto:     { width: '100%', height: '100%' },
  thumbAddBtn: {
    width: 64, height: 64, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.bgSurface, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgCard,
  },
  galeriaHint:  { textAlign: 'center', color: colors.textTertiary, fontSize: 11, marginTop: 8 },

  infoHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  nombre: {
    flex: 1, marginRight: spacing.md,
    fontFamily: fonts.display, fontSize: 24, color: colors.textPrimary, letterSpacing: -0.4,
  },
  editarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.bgSurface, minHeight: 44,
  },
  editarText: { fontFamily: fonts.heading, color: colors.accent, fontSize: 13 },

  card: {
    marginHorizontal: spacing.xl, marginTop: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.bgSurface,
    marginBottom: spacing.lg,
  },
  fila: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.bgSurface,
  },
  filaLast:    { borderBottomWidth: 0 },
  filaLabel:   { fontFamily: fonts.body, color: colors.textSecondary, fontSize: 14 },
  filaRight:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filaValor:   { fontFamily: fonts.heading, color: colors.textPrimary, fontSize: 14 },
  filaEditable: { color: colors.accent },

  acciones: {
    flexDirection: 'row', marginHorizontal: spacing.xl,
    gap: spacing.sm, marginBottom: spacing.xl,
  },
  accion: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    paddingVertical: spacing.md, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.bgSurface, minHeight: 72,
    justifyContent: 'center',
  },
  accionDisabled: { opacity: 0.45 },
  accionTexto: { fontFamily: fonts.body, color: colors.textSecondary, fontSize: 10, textAlign: 'center' },

  /* Modal imagen */
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalImg: { width: SW, height: SW * 1.2 },
  modalClose: {
    position: 'absolute', top: 56, right: spacing.xl,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },

  /* Modal fecha de vencimiento */
  fechaCard: {
    width: SW - spacing.xl * 2, backgroundColor: colors.bgCard,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.lg, alignItems: 'center',
  },
  fechaTitle:    { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  fechaSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  kmInput: {
    width: '100%', backgroundColor: colors.bgSurface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.accent, color: colors.textPrimary,
    fontFamily: fonts.heading, fontSize: 16, textAlign: 'center',
    paddingVertical: 12, marginTop: spacing.sm,
  },
  fechaBtns: {
    flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, width: '100%',
  },
  fechaBtnCancelar: {
    flex: 1, paddingVertical: 12, borderRadius: radius.md,
    alignItems: 'center', backgroundColor: colors.bgSurface,
  },
  fechaBtnCancelarText: { fontFamily: fonts.heading, color: colors.textSecondary, fontSize: 14 },
  fechaBtnGuardar: {
    flex: 1, paddingVertical: 12, borderRadius: radius.md,
    alignItems: 'center', backgroundColor: colors.accent,
  },
  fechaBtnGuardarText: { fontFamily: fonts.heading, color: '#fff', fontSize: 14 },
});

/* ─── Estilos documentos inline ─── */
const ds = StyleSheet.create({
  container:    { marginHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionTitle: {
    fontFamily: fonts.display, fontSize: 20, color: colors.accent,
    letterSpacing: -0.3, marginBottom: spacing.md,
  },
  loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },

  tipoCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: spacing.lg, marginBottom: spacing.md,
  },
  tipoHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  tipoIconWrap: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.sm,
  },
  tipoHeaderText: { flex: 1 },
  tipoLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  tipoExp:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  estadoPill: {
    borderRadius: radius.sm, borderWidth: 1,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  estadoPillText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.3 },
  estadoPillNeutral: {
    backgroundColor: colors.bgElevated, borderRadius: radius.sm,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  estadoPillTextNeutral: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.3, color: colors.textTertiary },

  cta: {
    borderRadius: radius.md, paddingVertical: 10, marginTop: spacing.sm,
    alignItems: 'center', justifyContent: 'center', minHeight: 40,
  },
  ctaPrimary:   { backgroundColor: colors.accent },
  ctaSecondary: { backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  ctaDisabled:  { opacity: 0.6 },
  ctaText:        { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  ctaTextPrimary:   { color: '#fff' },
  ctaTextSecondary: { color: colors.textPrimary },

  docList: { gap: spacing.sm, marginBottom: spacing.xs },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgSurface, borderRadius: radius.md, padding: spacing.sm,
    minHeight: 56,
  },
  imgThumb: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.bgPrimary },
  pdfThumb: {
    width: 52, height: 52, borderRadius: radius.md,
    backgroundColor: 'rgba(232,82,42,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  pdfLabel: { fontFamily: fonts.bold, color: colors.accent, fontSize: 11 },
  docMeta:  { flex: 1 },
  docTipo:  { fontFamily: fonts.heading, color: colors.textPrimary, fontSize: 14 },
  docFecha: { fontFamily: fonts.body, color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  deleteBtn:{ padding: spacing.xs, minWidth: 36, minHeight: 36, justifyContent: 'center', alignItems: 'center' },
});

/* ─── Estilos historial (preview) ─── */
const hs = StyleSheet.create({
  container: { marginHorizontal: spacing.xl, marginBottom: spacing.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3,
  },
  verTodo: { fontFamily: fonts.heading, fontSize: 13, color: colors.accent },

  item: {
    position: 'relative', paddingLeft: spacing.xl,
    borderLeftWidth: 1, borderLeftColor: colors.bgElevated,
  },
  itemConnected: { paddingBottom: spacing.md },
  dotRing: {
    position: 'absolute', left: -8, top: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center', alignItems: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActivo:   { backgroundColor: colors.accent },
  dotInactivo: { backgroundColor: colors.bgElevated },

  itemCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md,
  },
  itemCardOld: { opacity: 0.6 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  itemTitulo: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  itemFecha: { fontFamily: fonts.bold, fontSize: 12 },
  itemFechaActivo:   { color: colors.accent },
  itemFechaInactivo: { color: colors.textTertiary },
  itemSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
