import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { IconArrowLeft, IconBellRinging, IconLock } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import { Campo, Entrada } from '../../components/FormField';
import { Seccion, SelectorTipo, SelectorFecha, FotosServicio } from '../../components/historial/piezas';
import {
  metaTipo, fechaAISO, fechaLarga, isoAFecha, conMiles, soloDigitos,
} from '../../lib/historialTipos';

const { colors, fonts, spacing, radius } = tokens;

const ACEITE_TIPOS = [
  { key: 'mineral', label: 'Mineral' },
  { key: 'sintetico', label: 'Sintético' },
  { key: 'semisintetico', label: 'Semisintético' },
];

const MAX_FOTOS = 4;

/**
 * Anotar un servicio en el historial de un vehículo, o editar uno propio.
 * Params: `vehiculo` y, para editar, `registro`.
 */
export default function AgregarHistorialScreen({ route, navigation }: any) {
  const { vehiculo, registro } = route.params;
  const editando = !!registro;
  const { session } = useAuth();

  const [tipo, setTipo] = useState<string>(registro?.tipo ?? 'aceite');
  const [descripcion, setDescripcion] = useState<string>(registro?.descripcion ?? '');
  const [fecha, setFecha] = useState<string>(registro?.fecha ?? fechaAISO(new Date()));
  const [km, setKm] = useState<string>(conMiles(String(registro?.km_en_servicio ?? vehiculo.kilometraje ?? '')));
  const [costo, setCosto] = useState<string>(conMiles(String(registro?.costo ?? '')));
  const [taller, setTaller] = useState<string>(registro?.negocio_nombre ?? registro?.taller ?? '');
  const [mecanico, setMecanico] = useState<string>(registro?.mecanico_nombre ?? '');
  const [notas, setNotas] = useState<string>(registro?.notas ?? '');
  const [fotos, setFotos] = useState<string[]>([]);
  const [tipoAceite, setTipoAceite] = useState<string>(registro?.detalles?.tipo_aceite ?? '');
  const [marcaAceite, setMarcaAceite] = useState<string>(registro?.detalles?.marca ?? '');
  const [viscosidad, setViscosidad] = useState<string>(registro?.detalles?.viscosidad ?? '');
  const [recordar, setRecordar] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(false);

  const meta = metaTipo(tipo);
  const kmNum = soloDigitos(km);
  const intervalo = meta.intervalo;

  const errorDescripcion = tipo === 'personalizado' && !descripcion.trim() ? 'Cuéntanos qué servicio fue' : undefined;

  // Vista previa del recordatorio que se creará al guardar.
  let textoRecordatorio: string | null = null;
  let puedeRecordar = false;
  if (!editando && intervalo) {
    if (intervalo.tipo === 'km') {
      if (kmNum) { puedeRecordar = true; textoRecordatorio = `Te avisamos a los ${(kmNum + intervalo.valor).toLocaleString('es-CO')} km`; }
      else textoRecordatorio = 'Escribe el kilometraje para poder programarlo';
    } else {
      const proxima = isoAFecha(fecha);
      proxima.setDate(proxima.getDate() + intervalo.valor);
      puedeRecordar = true;
      textoRecordatorio = `Te avisamos el ${fechaLarga(fechaAISO(proxima))}`;
    }
  }

  async function agregarFoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para agregar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) setFotos(prev => [...prev, result.assets[0].uri]);
  }

  async function subirFotos(uris: string[]): Promise<string[]> {
    if (!session) return [];
    const urls: string[] = [];
    for (let i = 0; i < uris.length; i++) {
      const ext = uris[i].split('.').pop()?.toLowerCase() ?? 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
      const path = `${session.user.id}/historial/${vehiculo.id}/${Date.now()}_${i}.${safeExt}`;
      try {
        const response = await fetch(uris[i]);
        const ab = await response.arrayBuffer();
        if (ab.byteLength === 0) continue;
        const { error } = await supabase.storage.from('fotos').upload(path, ab, { contentType: `image/${safeExt}` });
        if (!error) urls.push(supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl);
      } catch {
        // una foto que falle no debe tumbar el registro
      }
    }
    return urls;
  }

  async function programarRecordatorio() {
    if (!intervalo) return;
    if (intervalo.tipo === 'km' && kmNum) {
      await supabase.from('recordatorios').insert({
        vehiculo_id: vehiculo.id, tipo, km_limite: kmNum + intervalo.valor, km_aviso: 500, estado: 'pendiente',
      });
    } else if (intervalo.tipo === 'dias') {
      const proxima = isoAFecha(fecha);
      proxima.setDate(proxima.getDate() + intervalo.valor);
      await supabase.from('recordatorios').insert({
        vehiculo_id: vehiculo.id, tipo, fecha_limite: fechaAISO(proxima), km_aviso: null, estado: 'pendiente',
      });
    }
  }

  async function guardar() {
    setIntento(true);
    if (errorDescripcion) return;

    setGuardando(true);
    try {
      const detalles: Record<string, string> = {};
      if (tipo === 'aceite') {
        if (tipoAceite) detalles.tipo_aceite = tipoAceite;
        if (marcaAceite.trim()) detalles.marca = marcaAceite.trim();
        if (viscosidad.trim()) detalles.viscosidad = viscosidad.trim();
      }

      const campos = {
        tipo,
        descripcion: tipo === 'personalizado' ? descripcion.trim() : null,
        fecha,
        km_en_servicio: kmNum,
        taller: taller.trim() || null,
        negocio_nombre: taller.trim() || null,
        mecanico_nombre: mecanico.trim() || null,
        costo: soloDigitos(costo),
        notas: notas.trim() || null,
        detalles: Object.keys(detalles).length > 0 ? detalles : null,
      };

      if (editando) {
        const { error } = await supabase.from('historial_mantenimiento').update(campos).eq('id', registro.id);
        if (error) throw error;
      } else {
        const fotosUrls = await subirFotos(fotos);
        const { error } = await supabase.from('historial_mantenimiento').insert({
          ...campos, vehiculo_id: vehiculo.id, fotos: fotosUrls, creado_por: 'propietario',
        });
        if (error) throw error;
        if (recordar && puedeRecordar) await programarRecordatorio();
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('No se pudo guardar', 'Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable style={({ pressed }) => [s.back, pressed && { opacity: 0.7 }]} onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo} numberOfLines={1}>{editando ? 'Editar registro' : 'Anotar servicio'}</Text>
          <Text style={s.subtitulo} numberOfLines={1}>{vehiculo.marca} {vehiculo.modelo}{vehiculo.placa ? ` · ${String(vehiculo.placa).toUpperCase()}` : ''}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.privado}>
            <IconLock size={14} color={colors.textTertiary} />
            <Text style={s.privadoTexto}>Solo tú ves este registro. Lo puedes compartir cuando quieras.</Text>
          </View>

          <Seccion numero={1} titulo="¿Qué le hiciste?">
            <SelectorTipo valor={tipo} onChange={setTipo} />

            {tipo === 'personalizado' && (
              <Campo label="¿Qué servicio fue?" requerido error={intento ? errorDescripcion : undefined}>
                <Entrada value={descripcion} onChangeText={setDescripcion} error={!!(intento && errorDescripcion)} placeholder="Ej. Revisión de suspensión" autoCapitalize="sentences" />
              </Campo>
            )}

            {tipo === 'aceite' && (
              <View style={s.detalleAceite}>
                <Text style={s.miniTitulo}>Detalles del aceite <Text style={s.opcional}>opcional</Text></Text>
                <View style={s.chips}>
                  {ACEITE_TIPOS.map(a => {
                    const activo = tipoAceite === a.key;
                    return (
                      <Pressable
                        key={a.key}
                        style={[s.chip, activo && s.chipOn]}
                        onPress={() => setTipoAceite(prev => (prev === a.key ? '' : a.key))}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: activo }}
                      >
                        <Text style={[s.chipTexto, activo && s.chipTextoOn]}>{a.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={s.dosCol}>
                  <View style={{ flex: 1 }}>
                    <Campo label="Marca"><Entrada value={marcaAceite} onChangeText={setMarcaAceite} placeholder="Mobil, Castrol" /></Campo>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Campo label="Viscosidad"><Entrada value={viscosidad} onChangeText={setViscosidad} placeholder="10W40" autoCapitalize="characters" /></Campo>
                  </View>
                </View>
              </View>
            )}
          </Seccion>

          <Seccion numero={2} titulo="Cuándo y cuánto">
            <Campo label="Fecha del servicio"><SelectorFecha valor={fecha} onChange={setFecha} /></Campo>
            <View style={s.dosCol}>
              <View style={{ flex: 1 }}>
                <Campo label="Kilometraje" ayuda="km del tablero">
                  <Entrada value={km} onChangeText={v => setKm(conMiles(v))} placeholder="15.000" keyboardType="number-pad" />
                </Campo>
              </View>
              <View style={{ flex: 1 }}>
                <Campo label="Costo" ayuda="en pesos">
                  <Entrada
                    value={costo}
                    onChangeText={v => setCosto(conMiles(v))}
                    placeholder="85.000"
                    keyboardType="number-pad"
                    icono={<Text style={s.pesos}>$</Text>}
                  />
                </Campo>
              </View>
            </View>
          </Seccion>

          <Seccion numero={3} titulo="¿Dónde?" ayuda="Si lo hiciste tú mismo, déjalo en blanco.">
            <Campo label="Taller o lugar"><Entrada value={taller} onChangeText={setTaller} placeholder="Ej. Taller Los Andes" autoCapitalize="words" /></Campo>
            <Campo label="Mecánico"><Entrada value={mecanico} onChangeText={setMecanico} placeholder="Nombre de quien lo hizo" autoCapitalize="words" /></Campo>
          </Seccion>

          {!editando && (
            <Seccion numero={4} titulo="Fotos" ayuda="La pieza cambiada, la factura o el resultado.">
              <FotosServicio uris={fotos} max={MAX_FOTOS} onAgregar={agregarFoto} onQuitar={i => setFotos(prev => prev.filter((_, j) => j !== i))} />
            </Seccion>
          )}

          <Seccion numero={editando ? 4 : 5} titulo="Notas">
            <Entrada
              value={notas}
              onChangeText={setNotas}
              placeholder="Qué se hizo, qué se notó, qué quedó pendiente"
              multiline
              style={{ minHeight: 84, textAlignVertical: 'top', paddingTop: 12 }}
            />
          </Seccion>

          {!editando && intervalo && (
            <View style={[s.recordatorio, !puedeRecordar && { opacity: 0.6 }]}>
              <IconBellRinging size={22} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={s.recordatorioTitulo}>Recordarme el próximo {intervalo.etiqueta}</Text>
                <Text style={s.recordatorioTexto}>{textoRecordatorio}</Text>
              </View>
              <Switch
                value={recordar && puedeRecordar}
                onValueChange={setRecordar}
                disabled={!puedeRecordar}
                trackColor={{ false: colors.bgSurface, true: colors.accent }}
                thumbColor="#fff"
                accessibilityLabel="Programar recordatorio"
              />
            </View>
          )}
        </ScrollView>

        <View style={s.footer}>
          <Pressable
            style={({ pressed }) => [s.guardar, guardando && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
            onPress={guardar}
            disabled={guardando}
            accessibilityRole="button"
          >
            {guardando ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.guardarTexto}>{editando ? 'Guardar cambios' : 'Guardar en el historial'}</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  back: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  titulo: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 },
  subtitulo: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 1 },

  form: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.xxl },
  privado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  privadoTexto: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },

  detalleAceite: { gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface },
  miniTitulo: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  opcional: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.bgSurface },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary },
  chipTextoOn: { fontFamily: fonts.bold, color: colors.onAccent },

  dosCol: { flexDirection: 'row', gap: spacing.md },
  pesos: { fontFamily: fonts.bold, fontSize: 16, color: colors.textSecondary },

  recordatorio: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.accentDark, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)',
  },
  recordatorioTitulo: { fontFamily: fonts.heading, fontSize: 14, color: colors.textPrimary },
  recordatorioTexto: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderTopColor: colors.bgSurface, backgroundColor: colors.bgPrimary },
  guardar: { minHeight: 54, borderRadius: radius.md, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  guardarTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
});
