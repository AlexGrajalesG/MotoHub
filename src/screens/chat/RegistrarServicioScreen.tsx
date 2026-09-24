import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { IconArrowLeft, IconFileText, IconX, IconCircleCheck, IconSend, IconUserCheck, IconNotebook } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import { uploadAdjuntoCita, registrarServicioPendiente } from '../../lib/mensajesCita';
import { Campo, Entrada } from '../../components/FormField';
import { Seccion, SelectorTipo, SelectorFecha, FotosServicio } from '../../components/historial/piezas';
import { metaTipo, fechaAISO, conMiles, soloDigitos } from '../../lib/historialTipos';

const { colors, fonts, spacing, radius } = tokens;

const MAX_FOTOS = 4;

type Vehiculo = { marca: string; modelo: string; placa: string | null; kilometraje: number | null };

/** El taller o el mecánico registra el servicio hecho; el cliente debe aceptarlo. */
export default function RegistrarServicioScreen({ route, navigation }: any) {
  const { citaId, vehiculoId, creadoPor = 'negocio' } = route.params as { citaId: string; vehiculoId: string; creadoPor?: 'negocio' | 'mecanico' };

  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [tipo, setTipo] = useState('aceite');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(fechaAISO(new Date()));
  const [km, setKm] = useState('');
  const [costo, setCosto] = useState('');
  const [notas, setNotas] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [facturaUri, setFacturaUri] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [intento, setIntento] = useState(false);

  useEffect(() => {
    supabase.from('vehiculos').select('marca, modelo, placa, kilometraje').eq('id', vehiculoId).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setVehiculo(data as Vehiculo);
        if (data.kilometraje) setKm(conMiles(String(data.kilometraje)));
      });
  }, [vehiculoId]);

  const meta = metaTipo(tipo);
  const errorDescripcion = tipo === 'personalizado' && !descripcion.trim() ? 'Cuéntale al cliente qué servicio fue' : undefined;

  async function agregarFoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) setFotos(prev => [...prev, result.assets[0].uri]);
  }

  async function elegirFactura() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (!result.canceled && result.assets[0]) setFacturaUri(result.assets[0].uri);
  }

  async function enviar() {
    setIntento(true);
    if (errorDescripcion) return;

    setGuardando(true);
    try {
      const fotosUrls: string[] = [];
      for (const uri of fotos) {
        const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const url = await uploadAdjuntoCita(uri, citaId, ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg');
        if (url) fotosUrls.push(url);
      }

      let facturaUrl: string | null = null;
      if (facturaUri) {
        const ext = facturaUri.split('.').pop()?.toLowerCase() ?? 'pdf';
        facturaUrl = await uploadAdjuntoCita(facturaUri, citaId, ext);
      }

      const { error } = await registrarServicioPendiente({
        cita_id: citaId,
        vehiculo_id: vehiculoId,
        tipo,
        descripcion: tipo === 'personalizado' ? descripcion.trim() : null,
        fecha,
        km_en_servicio: soloDigitos(km),
        costo: soloDigitos(costo),
        notas: notas.trim() || null,
        fotos: fotosUrls,
        factura_url: facturaUrl,
        creado_por: creadoPor,
      });
      if (error) throw error;
      setEnviado(true);
    } catch {
      Alert.alert('No se pudo enviar', 'Revisa tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  if (enviado) {
    return (
      <View style={s.container}>
        <View style={s.exito}>
          <View style={s.exitoIcono}><IconCircleCheck size={44} color={colors.accent} /></View>
          <Text style={s.exitoTitulo}>Enviado al cliente</Text>
          <Text style={s.exitoSub}>Lo verá en el chat. Cuando lo acepte, queda en el historial de su vehículo.</Text>
          <Pressable style={({ pressed }) => [s.botonPri, { alignSelf: 'stretch' }, pressed && { opacity: 0.85 }]} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={s.botonPriTexto}>Volver al chat</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable style={({ pressed }) => [s.back, pressed && { opacity: 0.7 }]} onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo}>Servicio realizado</Text>
          {vehiculo && <Text style={s.subtitulo} numberOfLines={1}>{vehiculo.marca} {vehiculo.modelo}{vehiculo.placa ? ` · ${vehiculo.placa.toUpperCase()}` : ''}</Text>}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={s.pasos}>
            <Paso Icono={IconSend} texto="Lo envías" activo />
            <View style={s.pasoLinea} />
            <Paso Icono={IconUserCheck} texto="El cliente lo acepta" />
            <View style={s.pasoLinea} />
            <Paso Icono={IconNotebook} texto="Queda en su historial" />
          </View>

          <Seccion numero={1} titulo="¿Qué se hizo?">
            <SelectorTipo valor={tipo} onChange={setTipo} />
            {tipo === 'personalizado' && (
              <Campo label="¿Qué servicio fue?" requerido error={intento ? errorDescripcion : undefined}>
                <Entrada value={descripcion} onChangeText={setDescripcion} error={!!(intento && errorDescripcion)} placeholder="Ej. Revisión de suspensión" autoCapitalize="sentences" />
              </Campo>
            )}
          </Seccion>

          <Seccion numero={2} titulo="Datos del servicio">
            <Campo label="Fecha"><SelectorFecha valor={fecha} onChange={setFecha} /></Campo>
            <View style={s.dosCol}>
              <View style={{ flex: 1 }}>
                <Campo label="Kilometraje" ayuda="km del tablero">
                  <Entrada value={km} onChangeText={v => setKm(conMiles(v))} placeholder="15.000" keyboardType="number-pad" />
                </Campo>
              </View>
              <View style={{ flex: 1 }}>
                <Campo label="Costo" ayuda="lo que se cobró">
                  <Entrada value={costo} onChangeText={v => setCosto(conMiles(v))} placeholder="85.000" keyboardType="number-pad" icono={<Text style={s.pesos}>$</Text>} />
                </Campo>
              </View>
            </View>
          </Seccion>

          <Seccion numero={3} titulo="Evidencia" ayuda="Ayuda al cliente a confiar en el trabajo.">
            <FotosServicio uris={fotos} max={MAX_FOTOS} onAgregar={agregarFoto} onQuitar={i => setFotos(prev => prev.filter((_, j) => j !== i))} />
            {facturaUri ? (
              <View style={s.factura}>
                <IconFileText size={18} color={colors.accent} />
                <Text style={s.facturaTexto}>Factura adjunta</Text>
                <Pressable onPress={() => setFacturaUri(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Quitar factura">
                  <IconX size={16} color={colors.textTertiary} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={({ pressed }) => [s.facturaBtn, pressed && { opacity: 0.85 }]} onPress={elegirFactura} accessibilityRole="button">
                <IconFileText size={18} color={colors.textSecondary} />
                <Text style={s.facturaBtnTexto}>Adjuntar factura (PDF o imagen)</Text>
              </Pressable>
            )}
          </Seccion>

          <Seccion numero={4} titulo="Nota para el cliente" ayuda="Lo que hiciste y lo que conviene revisar después.">
            <Entrada
              value={notas}
              onChangeText={setNotas}
              placeholder="Ej. Se cambió el aceite y el filtro. Revisar la cadena en 1.000 km."
              multiline
              style={{ minHeight: 84, textAlignVertical: 'top', paddingTop: 12 }}
            />
          </Seccion>

          <View style={s.vista}>
            <Text style={s.vistaTitulo}>Así lo verá tu cliente</Text>
            <View style={s.vistaFila}>
              <View style={[s.vistaIcono, { backgroundColor: `${meta.color}22` }]}><meta.Icon size={20} color={meta.color} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.vistaTexto} numberOfLines={1}>{tipo === 'personalizado' && descripcion.trim() ? descripcion.trim() : meta.label}</Text>
                <Text style={s.vistaSub} numberOfLines={1}>
                  {[soloDigitos(km) ? `${soloDigitos(km)!.toLocaleString('es-CO')} km` : null, soloDigitos(costo) ? `$${soloDigitos(costo)!.toLocaleString('es-CO')}` : null].filter(Boolean).join('  ·  ') || 'Sin kilometraje ni costo'}
                </Text>
              </View>
            </View>
            <Text style={s.vistaNota}>Él decide si lo acepta o lo rechaza. Solo lo que acepte entra a su historial.</Text>
          </View>
        </ScrollView>

        <View style={s.footer}>
          <Pressable
            style={({ pressed }) => [s.botonPri, guardando && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
            onPress={enviar}
            disabled={guardando}
            accessibilityRole="button"
          >
            {guardando ? <ActivityIndicator color={colors.onAccent} /> : <Text style={s.botonPriTexto}>Enviar al cliente</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Paso({ Icono, texto, activo }: { Icono: any; texto: string; activo?: boolean }) {
  return (
    <View style={s.paso}>
      <View style={[s.pasoCirculo, activo && s.pasoCirculoOn]}>
        <Icono size={16} color={activo ? colors.onAccent : colors.textSecondary} />
      </View>
      <Text style={[s.pasoTexto, activo && { color: colors.textPrimary }]}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  back: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 },
  subtitulo: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 1 },

  form: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.xxl },

  pasos: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface },
  paso: { flex: 1, alignItems: 'center', gap: 6 },
  pasoCirculo: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center' },
  pasoCirculoOn: { backgroundColor: colors.accent },
  pasoTexto: { fontFamily: fonts.heading, fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  pasoLinea: { height: 1, width: 16, backgroundColor: colors.bgSurface, marginTop: 17 },

  dosCol: { flexDirection: 'row', gap: spacing.md },
  pesos: { fontFamily: fonts.bold, fontSize: 16, color: colors.textSecondary },

  facturaBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface },
  facturaBtnTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  factura: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.md, backgroundColor: colors.accentDark, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)' },
  facturaTexto: { flex: 1, fontFamily: fonts.heading, fontSize: 14, color: colors.textPrimary },

  vista: { gap: spacing.md, padding: spacing.lg, backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface },
  vistaTitulo: { fontFamily: fonts.heading, fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  vistaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  vistaIcono: { width: 42, height: 42, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  vistaTexto: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  vistaSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  vistaNota: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, lineHeight: 17 },

  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderTopColor: colors.bgSurface, backgroundColor: colors.bgPrimary },
  botonPri: { minHeight: 54, borderRadius: radius.md, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  botonPriTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },

  exito: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.md },
  exitoIcono: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accentDark, borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)', justifyContent: 'center', alignItems: 'center' },
  exitoTitulo: { fontFamily: fonts.display, fontSize: 24, color: colors.textPrimary, letterSpacing: -0.4 },
  exitoSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: spacing.lg },
});
