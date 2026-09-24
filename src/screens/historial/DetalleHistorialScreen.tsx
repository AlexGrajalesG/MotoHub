import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Image, Modal,
  KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  IconArrowLeft, IconX, IconPlus, IconCheck, IconShare2, IconDotsVertical, IconPencil, IconTrash,
  IconBuildingStore, IconUser, IconGauge, IconCash, IconPhotoPlus, IconReceipt, IconLock, IconRosetteDiscountCheck,
  IconBulb, IconNotebook, IconFileText,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { formatRegistroCompartible } from '../../lib/historial';
import { useVisorImagenes } from '../../components/VisorImagenes';
import { formatCOP } from '../../lib/precio';
import { openUrl } from '../../lib/openUrl';
import { metaTipo, tituloRegistro, fechaLarga } from '../../lib/historialTipos';

const { colors, fonts, spacing, radius } = tokens;

type Registro = {
  id: string;
  tipo: string;
  descripcion: string | null;
  fecha: string;
  km_en_servicio: number | null;
  taller: string | null;
  negocio_nombre: string | null;
  mecanico_nombre: string | null;
  costo: number | null;
  notas: string | null;
  fotos: string[] | null;
  anexos: string[] | null;
  factura_url: string | null;
  detalles: Record<string, string> | null;
  recomendaciones: string[] | null;
  creado_por: string | null;
  aprobado_propietario: boolean | null;
};

type Nota = { id: string; texto: string; created_at: string };

function fechaNota(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const mes = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()];
  return `${d.getDate()} ${mes} ${d.getFullYear()}, ${hh}:${mm}`;
}

export default function DetalleHistorialScreen({ route, navigation }: any) {
  const { registro: registroParam, vehiculo } = route.params;
  const { session } = useAuth();

  const [registro, setRegistro] = useState<Registro>(registroParam);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [mostrarReco, setMostrarReco] = useState(false);
  const [reco, setReco] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const { abrir, cerrar, visor } = useVisorImagenes(quitarImagen);
  const [menu, setMenu] = useState(false);

  const meta = metaTipo(registro.tipo);
  const titulo = tituloRegistro(registro);
  const esMio = registro.creado_por !== 'negocio' && registro.creado_por !== 'mecanico';
  const lugar = registro.negocio_nombre || registro.taller;

  useEffect(() => {
    cargarNotas();
    recargar();
    // al volver de Editar hay que ver los datos nuevos
    return navigation.addListener('focus', recargar);
  }, []);

  async function recargar() {
    const { data } = await supabase.from('historial_mantenimiento').select('*').eq('id', registroParam.id).maybeSingle();
    if (data) setRegistro(data as Registro);
  }

  async function cargarNotas() {
    const { data } = await supabase
      .from('historial_mensajes').select('id, texto, created_at')
      .eq('historial_id', registroParam.id).order('created_at', { ascending: false });
    setNotas((data ?? []) as Nota[]);
  }

  async function actualizar(cambios: Partial<Registro>) {
    const { error } = await supabase.from('historial_mantenimiento').update(cambios).eq('id', registro.id);
    if (error) { Alert.alert('No se pudo guardar', 'Revisa tu conexión e intenta de nuevo.'); return false; }
    setRegistro(r => ({ ...r, ...cambios }));
    return true;
  }

  // ─── notas de seguimiento ───────────────────────────────────────────────────
  async function guardarNota() {
    const texto = nuevaNota.trim();
    if (!texto || !session) return;
    setGuardandoNota(true);
    const { data: u } = await supabase.from('usuarios').select('nombre').eq('id', session.user.id).maybeSingle();
    const { data, error } = await supabase.from('historial_mensajes').insert({
      historial_id: registro.id, autor_id: session.user.id, autor_nombre: u?.nombre ?? 'Yo', autor_tipo: 'propietario', texto,
    }).select('id, texto, created_at').single();
    setGuardandoNota(false);
    if (error || !data) { Alert.alert('No se pudo guardar la nota', 'Intenta de nuevo.'); return; }
    setNotas(prev => [data as Nota, ...prev]);
    setNuevaNota('');
  }

  async function borrarNota(id: string) {
    await supabase.from('historial_mensajes').delete().eq('id', id);
    setNotas(prev => prev.filter(n => n.id !== id));
  }

  // ─── recomendaciones ────────────────────────────────────────────────────────
  async function agregarReco() {
    const texto = reco.trim();
    if (!texto) return;
    const ok = await actualizar({ recomendaciones: [...(registro.recomendaciones ?? []), texto] });
    if (ok) { setReco(''); setMostrarReco(false); }
  }

  function quitarReco(i: number) {
    actualizar({ recomendaciones: (registro.recomendaciones ?? []).filter((_, j) => j !== i) });
  }

  // ─── fotos y comprobantes ───────────────────────────────────────────────────
  async function agregarImagen(campo: 'fotos' | 'anexos') {
    if (!session) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;

    setSubiendo(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
      const carpeta = campo === 'anexos' ? 'anexos/' : '';
      const path = `${session.user.id}/historial/${vehiculo.id}/${carpeta}${Date.now()}.${safeExt}`;
      const response = await fetch(uri);
      const ab = await response.arrayBuffer();
      if (ab.byteLength === 0) throw new Error('vacio');
      const { error } = await supabase.storage.from('fotos').upload(path, ab, { contentType: `image/${safeExt}` });
      if (error) throw error;
      const url = supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl;
      await actualizar({ [campo]: [...(registro[campo] ?? []), url] });
    } catch {
      Alert.alert('No se pudo subir', 'Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSubiendo(false);
    }
  }

  function quitarImagen(url: string) {
    cerrar();
    const campo: 'fotos' | 'anexos' = (registro.fotos ?? []).includes(url) ? 'fotos' : 'anexos';
    Alert.alert(campo === 'fotos' ? 'Quitar foto' : 'Quitar comprobante', 'Se quitará de este registro.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => actualizar({ [campo]: (registro[campo] ?? []).filter(u => u !== url) }) },
    ]);
  }

  // ─── registro ───────────────────────────────────────────────────────────────
  async function compartir() {
    try { await Share.share({ message: `${formatRegistroCompartible(registro)}\n\n— Compartido desde Rodix` }); } catch { /* cancelado */ }
  }

  function editar() {
    setMenu(false);
    navigation.navigate('AgregarHistorial', { vehiculo, registro });
  }

  function eliminar() {
    setMenu(false);
    Alert.alert('Eliminar este servicio', 'Se borra del historial junto con sus notas y no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('historial_mantenimiento').delete().eq('id', registro.id);
          if (error) { Alert.alert('No se pudo eliminar', 'Intenta de nuevo.'); return; }
          navigation.goBack();
        },
      },
    ]);
  }

  const aceite = registro.tipo === 'aceite' && registro.detalles
    ? [registro.detalles.tipo_aceite, registro.detalles.marca, registro.detalles.viscosidad].filter(Boolean)
    : [];
  const filas: { Icono: any; etiqueta: string; valor: string }[] = [];
  if (registro.km_en_servicio) filas.push({ Icono: IconGauge, etiqueta: 'Kilometraje', valor: `${registro.km_en_servicio.toLocaleString('es-CO')} km` });
  if (registro.costo) filas.push({ Icono: IconCash, etiqueta: 'Costo', valor: formatCOP(registro.costo) });
  if (lugar) filas.push({ Icono: IconBuildingStore, etiqueta: 'Taller o lugar', valor: lugar });
  if (registro.mecanico_nombre) filas.push({ Icono: IconUser, etiqueta: 'Mecánico', valor: registro.mecanico_nombre });

  const fotos = registro.fotos ?? [];
  const anexos = registro.anexos ?? [];
  const recomendaciones = registro.recomendaciones ?? [];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]} onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitulo}>Servicio</Text>
        <Pressable style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]} onPress={compartir} hitSlop={8} accessibilityRole="button" accessibilityLabel="Compartir">
          <IconShare2 size={20} color={colors.textPrimary} />
        </Pressable>
        {esMio && (
          <Pressable style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]} onPress={() => setMenu(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Más opciones">
            <IconDotsVertical size={20} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Resumen */}
          <View style={s.hero}>
            <View style={[s.heroIcono, { backgroundColor: `${meta.color}22` }]}>
              <meta.Icon size={30} color={meta.color} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.heroTitulo}>{titulo}</Text>
              <Text style={s.heroFecha}>{fechaLarga(registro.fecha)}</Text>
            </View>
          </View>

          {aceite.length > 0 && (
            <View style={s.pildoras}>
              {aceite.map((p, i) => <View key={i} style={s.pildora}><Text style={s.pildoraTexto}>{p}</Text></View>)}
            </View>
          )}

          <View style={s.origen}>
            {esMio ? <IconLock size={14} color={colors.textTertiary} /> : <IconRosetteDiscountCheck size={16} color={colors.accent} />}
            <Text style={[s.origenTexto, !esMio && { color: colors.accent }]}>
              {esMio ? 'Lo anotaste tú. Solo tú lo ves.' : `Lo registró ${lugar ?? 'tu taller'} y lo aceptaste. No se puede editar.`}
            </Text>
          </View>

          {filas.length > 0 && (
            <View style={s.tarjeta}>
              {filas.map((f, i) => (
                <View key={f.etiqueta} style={[s.fila, i < filas.length - 1 && s.filaBorde]}>
                  <f.Icono size={18} color={colors.textTertiary} />
                  <Text style={s.filaEtiqueta}>{f.etiqueta}</Text>
                  <Text style={s.filaValor} numberOfLines={2}>{f.valor}</Text>
                </View>
              ))}
            </View>
          )}

          {!!registro.notas && (
            <Bloque titulo="Notas del servicio">
              <Text style={s.texto}>{registro.notas}</Text>
            </Bloque>
          )}

          {/* Fotos */}
          <Bloque titulo="Fotos" ayuda={fotos.length === 0 ? 'La pieza cambiada o el resultado.' : undefined}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tira}>
              {fotos.map(url => (
                <Pressable key={url} onPress={() => abrir(fotos, fotos.indexOf(url))} accessibilityRole="button" accessibilityLabel="Ver foto">
                  <Image source={{ uri: url }} style={s.miniatura} resizeMode="cover" />
                </Pressable>
              ))}
              <Pressable style={({ pressed }) => [s.agregarMiniatura, pressed && { opacity: 0.85 }]} onPress={() => agregarImagen('fotos')} disabled={subiendo} accessibilityRole="button" accessibilityLabel="Agregar foto">
                {subiendo ? <ActivityIndicator color={colors.accent} /> : <IconPhotoPlus size={24} color={colors.textSecondary} />}
                <Text style={s.agregarTexto}>Agregar</Text>
              </Pressable>
            </ScrollView>
          </Bloque>

          {/* Comprobantes */}
          <Bloque titulo="Comprobantes" ayuda={anexos.length === 0 && !registro.factura_url ? 'Factura, recibo o garantía.' : undefined}>
            {!!registro.factura_url && (
              <Pressable style={({ pressed }) => [s.factura, pressed && { opacity: 0.85 }]} onPress={() => openUrl(registro.factura_url!)} accessibilityRole="button">
                <IconFileText size={18} color={colors.accent} />
                <Text style={s.facturaTexto}>Factura del taller</Text>
              </Pressable>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tira}>
              {anexos.map(url => (
                <Pressable key={url} onPress={() => abrir(anexos, anexos.indexOf(url))} accessibilityRole="button" accessibilityLabel="Ver comprobante">
                  <Image source={{ uri: url }} style={s.miniatura} resizeMode="cover" />
                </Pressable>
              ))}
              <Pressable style={({ pressed }) => [s.agregarMiniatura, pressed && { opacity: 0.85 }]} onPress={() => agregarImagen('anexos')} disabled={subiendo} accessibilityRole="button" accessibilityLabel="Agregar comprobante">
                <IconReceipt size={24} color={colors.textSecondary} />
                <Text style={s.agregarTexto}>Agregar</Text>
              </Pressable>
            </ScrollView>
          </Bloque>

          {/* Para la próxima vez */}
          <Bloque
            titulo="Para la próxima vez"
            ayuda={recomendaciones.length === 0 && !mostrarReco ? 'Lo que debes revisar o cambiar después.' : undefined}
            accion={{ texto: mostrarReco ? 'Cancelar' : 'Agregar', onPress: () => { setMostrarReco(v => !v); setReco(''); } }}
          >
            {mostrarReco && (
              <View style={s.recoEntrada}>
                <TextInput
                  style={s.recoInput}
                  value={reco}
                  onChangeText={setReco}
                  placeholder="Ej. Revisar suspensión en 1.000 km"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={agregarReco}
                />
                <Pressable style={[s.recoOk, !reco.trim() && { opacity: 0.4 }]} onPress={agregarReco} disabled={!reco.trim()} accessibilityRole="button" accessibilityLabel="Guardar">
                  <IconCheck size={18} color={colors.onAccent} />
                </Pressable>
              </View>
            )}
            {recomendaciones.map((r, i) => (
              <View key={`${r}-${i}`} style={s.reco}>
                <IconBulb size={16} color={colors.accent} />
                <Text style={[s.texto, { flex: 1 }]}>{r}</Text>
                <Pressable onPress={() => quitarReco(i)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Quitar">
                  <IconX size={16} color={colors.textTertiary} />
                </Pressable>
              </View>
            ))}
          </Bloque>

          {/* Notas de seguimiento */}
          <Bloque titulo="Notas de seguimiento" ayuda="Tu diario de este servicio: cómo se sintió la moto después, qué notaste. Nadie más las ve.">
            <View style={s.notaEntrada}>
              <TextInput
                style={s.notaInput}
                value={nuevaNota}
                onChangeText={setNuevaNota}
                placeholder="Escribe una nota"
                placeholderTextColor={colors.textTertiary}
                multiline
              />
              <Pressable
                style={({ pressed }) => [s.notaBtn, (!nuevaNota.trim() || guardandoNota) && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
                onPress={guardarNota}
                disabled={!nuevaNota.trim() || guardandoNota}
                accessibilityRole="button"
              >
                {guardandoNota ? <ActivityIndicator size="small" color={colors.onAccent} /> : <Text style={s.notaBtnTexto}>Guardar nota</Text>}
              </Pressable>
            </View>
            {notas.map(n => (
              <View key={n.id} style={s.nota}>
                <IconNotebook size={16} color={colors.textTertiary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.notaFecha}>{fechaNota(n.created_at)}</Text>
                  <Text style={s.texto}>{n.texto}</Text>
                </View>
                <Pressable onPress={() => borrarNota(n.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Borrar nota">
                  <IconX size={16} color={colors.textTertiary} />
                </Pressable>
              </View>
            ))}
          </Bloque>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Menú */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={s.velo} onPress={() => setMenu(false)}>
          <Pressable style={s.hoja} onPress={() => {}}>
            <Pressable style={({ pressed }) => [s.opcion, pressed && { opacity: 0.7 }]} onPress={editar} accessibilityRole="button">
              <IconPencil size={20} color={colors.textPrimary} />
              <Text style={s.opcionTexto}>Editar datos</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [s.opcion, pressed && { opacity: 0.7 }]} onPress={eliminar} accessibilityRole="button">
              <IconTrash size={20} color={colors.dangerAction} />
              <Text style={[s.opcionTexto, { color: colors.dangerAction }]}>Eliminar servicio</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {visor}
    </View>
  );
}

function Bloque({ titulo, ayuda, accion, children }: {
  titulo: string; ayuda?: string; accion?: { texto: string; onPress: () => void }; children: React.ReactNode;
}) {
  return (
    <View style={s.bloque}>
      <View style={s.bloqueCabecera}>
        <Text style={s.bloqueTitulo}>{titulo}</Text>
        {accion && (
          <Pressable onPress={accion.onPress} hitSlop={10} style={s.accion} accessibilityRole="button">
            <IconPlus size={14} color={colors.accent} />
            <Text style={s.accionTexto}>{accion.texto}</Text>
          </Pressable>
        )}
      </View>
      {!!ayuda && <Text style={s.bloqueAyuda}>{ayuda}</Text>}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  headerTitulo: { flex: 1, fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4, marginLeft: spacing.xs },
  iconBtn: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },

  contenido: { paddingHorizontal: spacing.xl, paddingBottom: 60, gap: spacing.lg },

  hero: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg,
    backgroundColor: colors.bgCard, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.bgSurface,
  },
  heroIcono: { width: 60, height: 60, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
  heroTitulo: { fontFamily: fonts.display, fontSize: 21, color: colors.textPrimary, letterSpacing: -0.3 },
  heroFecha: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },

  pildoras: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pildora: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface },
  pildoraTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.textPrimary },

  origen: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  origenTexto: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, lineHeight: 18 },

  tarjeta: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface, paddingHorizontal: spacing.md },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 54 },
  filaBorde: { borderBottomWidth: 1, borderBottomColor: colors.bgSurface },
  filaEtiqueta: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  filaValor: { flex: 1, textAlign: 'right', fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },

  bloque: { gap: spacing.md },
  bloqueCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bloqueTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  bloqueAyuda: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: -spacing.sm },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  accionTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.accent },
  texto: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, lineHeight: 22 },

  tira: { gap: spacing.md, paddingRight: spacing.xl },
  miniatura: { width: 104, height: 104, borderRadius: radius.md, backgroundColor: colors.bgSurface },
  agregarMiniatura: {
    width: 104, height: 104, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  agregarTexto: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  factura: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md,
    backgroundColor: colors.accentDark, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)',
  },
  facturaTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.textPrimary },

  recoEntrada: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  recoInput: {
    flex: 1, minHeight: 48, paddingHorizontal: spacing.md, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent,
  },
  recoOk: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  reco: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
  },

  notaEntrada: { gap: spacing.sm },
  notaInput: {
    minHeight: 76, padding: spacing.md, textAlignVertical: 'top', fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
  },
  notaBtn: { alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.accent, justifyContent: 'center' },
  notaBtnTexto: { fontFamily: fonts.bold, fontSize: 14, color: colors.onAccent },
  nota: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
  },
  notaFecha: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },

  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  hoja: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: colors.bgSurface, paddingVertical: spacing.md, paddingBottom: spacing.xxl },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.xl },
  opcionTexto: { fontFamily: fonts.heading, fontSize: 16, color: colors.textPrimary },

  visor: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center', alignItems: 'center' },
  visorImagen: { width: '100%', height: '80%' },
  visorCerrar: { position: 'absolute', top: 52, right: spacing.xl, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  visorQuitar: {
    position: 'absolute', bottom: 48, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: spacing.xl,
    borderRadius: radius.pill, backgroundColor: 'rgba(224,85,85,0.9)',
  },
  visorQuitarTexto: { fontFamily: fonts.bold, fontSize: 15, color: '#fff' },
});
