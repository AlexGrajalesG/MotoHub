import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, SectionList, ScrollView, Pressable, ActivityIndicator, Share,
} from 'react-native';
import {
  IconArrowLeft, IconPlus, IconShare2, IconChevronRight, IconCamera, IconBuildingStore, IconRosetteDiscountCheck, IconNotebook,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { tokens } from '../../lib/tokens';
import { formatHistorialCompartible } from '../../lib/historial';
import { formatCOP } from '../../lib/precio';
import { TIPOS_SERVICIO, metaTipo, tituloRegistro, fechaCorta, mesAnio, haceDias } from '../../lib/historialTipos';

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

const COLUMNAS = 'id,tipo,descripcion,fecha,km_en_servicio,taller,negocio_nombre,mecanico_nombre,costo,notas,fotos,anexos,factura_url,detalles,recomendaciones,creado_por,aprobado_propietario';

export default function HistorialVehiculoScreen({ route, navigation }: any) {
  const { vehiculo } = route.params;
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('todos');

  useFocusEffect(useCallback(() => { cargar(); }, []));

  async function cargar() {
    // Lo que envía un taller solo cuenta cuando el dueño lo aceptó.
    const { data } = await supabase
      .from('historial_mantenimiento')
      .select(COLUMNAS)
      .eq('vehiculo_id', vehiculo.id)
      .or('creado_por.eq.propietario,aprobado_propietario.eq.true')
      .order('fecha', { ascending: false });
    setRegistros((data ?? []) as Registro[]);
    setLoading(false);
  }

  const visibles = useMemo(
    () => (filtro === 'todos' ? registros : registros.filter(r => r.tipo === filtro)),
    [registros, filtro],
  );

  const secciones = useMemo(() => {
    const mapa = new Map<string, Registro[]>();
    visibles.forEach(r => {
      const clave = mesAnio(r.fecha);
      mapa.set(clave, [...(mapa.get(clave) ?? []), r]);
    });
    return [...mapa.entries()].map(([titulo, data]) => ({
      titulo, data, subtotal: data.reduce((suma, r) => suma + (r.costo ?? 0), 0),
    }));
  }, [visibles]);

  const total = registros.reduce((suma, r) => suma + (r.costo ?? 0), 0);
  const conteoPorTipo = useMemo(() => {
    const c = new Map<string, number>();
    registros.forEach(r => c.set(r.tipo, (c.get(r.tipo) ?? 0) + 1));
    return c;
  }, [registros]);

  async function compartir() {
    if (registros.length === 0) return;
    try { await Share.share({ message: formatHistorialCompartible(vehiculo, registros) }); } catch { /* cancelado */ }
  }

  const anotar = () => navigation.navigate('AgregarHistorial', { vehiculo });

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]} onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo} numberOfLines={1}>Historial</Text>
          <Text style={s.subtitulo} numberOfLines={1}>{vehiculo.marca} {vehiculo.modelo}{vehiculo.placa ? ` · ${String(vehiculo.placa).toUpperCase()}` : ''}</Text>
        </View>
        {registros.length > 0 && (
          <Pressable style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]} onPress={compartir} hitSlop={8} accessibilityRole="button" accessibilityLabel="Compartir historial">
            <IconShare2 size={20} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>

      {registros.length === 0 ? (
        <View style={s.vacio}>
          <View style={s.vacioIcono}><IconNotebook size={36} color={colors.textTertiary} /></View>
          <Text style={s.vacioTitulo}>Aquí vive la hoja de vida de tu {vehiculo.tipo === 'carro' ? 'carro' : 'moto'}</Text>
          <Text style={s.vacioTexto}>Anota cada aceite, revisión o arreglo. Así sabes cuándo toca el siguiente y, si lo vendes, demuestras cómo lo cuidaste.</Text>
          <Pressable style={({ pressed }) => [s.botonPri, pressed && { opacity: 0.85 }]} onPress={anotar} accessibilityRole="button">
            <IconPlus size={18} color={colors.onAccent} />
            <Text style={s.botonPriTexto}>Anotar el primer servicio</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <SectionList
            sections={secciones}
            keyExtractor={r => r.id}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.lista}
            ListHeaderComponent={
              <View style={{ gap: spacing.lg }}>
                <View style={s.resumen}>
                  <Dato valor={String(registros.length)} etiqueta={registros.length === 1 ? 'Servicio' : 'Servicios'} />
                  <View style={s.divisor} />
                  <Dato valor={total > 0 ? formatCOP(total) : '-'} etiqueta="Invertido" />
                  <View style={s.divisor} />
                  <Dato valor={haceDias(registros[0].fecha)} etiqueta="Último" />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtros} style={{ flexGrow: 0 }}>
                  <Chip texto={`Todos ${registros.length}`} activo={filtro === 'todos'} onPress={() => setFiltro('todos')} />
                  {TIPOS_SERVICIO.filter(t => conteoPorTipo.has(t.key)).map(t => (
                    <Chip key={t.key} texto={`${t.corto} ${conteoPorTipo.get(t.key)}`} activo={filtro === t.key} onPress={() => setFiltro(t.key)} />
                  ))}
                </ScrollView>
              </View>
            }
            renderSectionHeader={({ section }) => (
              <View style={s.mes}>
                <Text style={s.mesTitulo}>{section.titulo}</Text>
                {section.subtotal > 0 && <Text style={s.mesSubtotal}>{formatCOP(section.subtotal)}</Text>}
              </View>
            )}
            renderItem={({ item }) => <Tarjeta r={item} onPress={() => navigation.navigate('DetalleHistorial', { registro: item, vehiculo })} />}
            SectionSeparatorComponent={() => <View style={{ height: 0 }} />}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />

          <View style={s.footer}>
            <Pressable style={({ pressed }) => [s.botonPri, pressed && { opacity: 0.85 }]} onPress={anotar} accessibilityRole="button">
              <IconPlus size={18} color={colors.onAccent} />
              <Text style={s.botonPriTexto}>Anotar servicio</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <View style={s.dato}>
      <Text style={s.datoValor} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
      <Text style={s.datoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable style={[s.chip, activo && s.chipOn]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: activo }}>
      <Text style={[s.chipTexto, activo && s.chipTextoOn]}>{texto}</Text>
    </Pressable>
  );
}

function Tarjeta({ r, onPress }: { r: Registro; onPress: () => void }) {
  const meta = metaTipo(r.tipo);
  const lugar = r.negocio_nombre || r.taller;
  const deTaller = r.creado_por === 'negocio' || r.creado_por === 'mecanico';
  const nFotos = (r.fotos?.length ?? 0) + (r.anexos?.length ?? 0) + (r.factura_url ? 1 : 0);
  const linea = [fechaCorta(r.fecha), r.km_en_servicio ? `${r.km_en_servicio.toLocaleString('es-CO')} km` : null].filter(Boolean).join('  ·  ');

  return (
    <Pressable style={({ pressed }) => [s.tarjeta, pressed && { opacity: 0.85 }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${tituloRegistro(r)}, ${fechaCorta(r.fecha)}`}>
      <View style={[s.tipoIcono, { backgroundColor: `${meta.color}22` }]}>
        <meta.Icon size={22} color={meta.color} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.tarjetaTitulo} numberOfLines={1}>{tituloRegistro(r)}</Text>
        <Text style={s.tarjetaLinea}>{linea}</Text>
        {(lugar || deTaller || nFotos > 0) && (
          <View style={s.pie}>
            {!!lugar && (
              <View style={s.pieItem}>
                <IconBuildingStore size={12} color={colors.textTertiary} />
                <Text style={s.pieTexto} numberOfLines={1}>{lugar}</Text>
              </View>
            )}
            {deTaller && (
              <View style={s.pieItem}>
                <IconRosetteDiscountCheck size={13} color={colors.accent} />
                <Text style={[s.pieTexto, { color: colors.accent }]}>Del taller</Text>
              </View>
            )}
            {nFotos > 0 && (
              <View style={s.pieItem}>
                <IconCamera size={12} color={colors.textTertiary} />
                <Text style={s.pieTexto}>{nFotos}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <View style={s.derecha}>
        {r.costo != null && r.costo > 0 && <Text style={s.costo}>{formatCOP(r.costo)}</Text>}
        <IconChevronRight size={18} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  iconBtn: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  titulo: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 },
  subtitulo: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 1 },

  lista: { paddingHorizontal: spacing.xl, paddingBottom: 110 },

  resumen: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
  },
  dato: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  datoValor: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary },
  datoEtiqueta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  divisor: { width: 1, height: 30, backgroundColor: colors.bgSurface },

  filtros: { gap: spacing.sm, paddingBottom: spacing.xs },
  chip: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },
  chipTextoOn: { fontFamily: fonts.bold, color: colors.onAccent },

  mes: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: spacing.xl, marginBottom: spacing.sm },
  mesTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  mesSubtotal: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary },

  tarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 72,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
  },
  tipoIcono: { width: 46, height: 46, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  tarjetaTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  tarjetaLinea: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  pie: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md, marginTop: 1 },
  pieItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 150 },
  pieTexto: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  derecha: { alignItems: 'flex-end', gap: 4 },
  costo: { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl,
    backgroundColor: colors.bgPrimary, borderTopWidth: 1, borderTopColor: colors.bgSurface,
  },
  botonPri: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 54,
    borderRadius: radius.md, backgroundColor: colors.accent, paddingHorizontal: spacing.xl,
  },
  botonPriTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },

  vacio: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, paddingBottom: 60, gap: spacing.sm },
  vacioIcono: {
    width: 84, height: 84, borderRadius: radius.xl, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  vacioTitulo: { fontFamily: fonts.display, fontSize: 21, color: colors.textPrimary, textAlign: 'center', letterSpacing: -0.3 },
  vacioTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: spacing.lg },
});
