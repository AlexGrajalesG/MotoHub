import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { IconCircleCheck, IconCircleX, IconFileText } from '@tabler/icons-react-native';
import { tokens } from '../lib/tokens';
import { formatCOP } from '../lib/precio';
import { openUrl } from '../lib/openUrl';
import { metaTipo, fechaLarga } from '../lib/historialTipos';
import { separarAnexos, tituloCierre, type ResumenCierre } from '../lib/cierreCitaTexto';

const { colors, spacing, radius, fonts } = tokens;

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={s.dato}>
      <Text style={s.datoEtiqueta}>{etiqueta}</Text>
      <Text style={s.datoValor}>{valor}</Text>
    </View>
  );
}

/** Resumen de un servicio cerrado: cuándo, con quién, kilometraje, costo y anexos. */
export default function ResumenCierreCard({ resumen, onAbrirFotos, incrustado = false }: {
  resumen: ResumenCierre;
  onAbrirFotos?: (urls: string[], indice: number) => void;
  /** Sin márgenes propios, para usarla dentro de otra sección. */
  incrustado?: boolean;
}) {
  const completada = resumen.estado === 'completada';
  const { fotos, documentos } = separarAnexos(resumen.anexos);
  const vehiculo = resumen.vehiculo
    ? `${resumen.vehiculo.marca} ${resumen.vehiculo.modelo}${resumen.vehiculo.placa ? ` · ${resumen.vehiculo.placa.toUpperCase()}` : ''}`
    : null;
  const servicio = resumen.tipo_servicio
    ? (resumen.tipo_servicio === 'personalizado' && resumen.descripcion ? resumen.descripcion : metaTipo(resumen.tipo_servicio).label)
    : null;
  const fecha = resumen.fecha_servicio ?? resumen.fecha_cita;

  return (
    <View style={[s.card, incrustado && s.cardIncrustada]}>
      <View style={s.cabecera}>
        {completada ? <IconCircleCheck size={22} color={colors.accent} /> : <IconCircleX size={22} color={colors.textTertiary} />}
        <Text style={s.titulo}>{tituloCierre(resumen.estado)}</Text>
      </View>

      <View style={s.grid}>
        {fecha && <Dato etiqueta="Fecha" valor={fechaLarga(fecha)} />}
        {resumen.negocio && <Dato etiqueta="Negocio" valor={resumen.negocio} />}
        {resumen.mecanico && <Dato etiqueta="Mecánico" valor={resumen.mecanico} />}
        {vehiculo && <Dato etiqueta="Vehículo" valor={vehiculo} />}
        {completada && (
          <Dato etiqueta="Kilometraje" valor={resumen.km ? `${resumen.km.toLocaleString('es-CO')} km` : 'Sin kilometraje registrado'} />
        )}
        {servicio && <Dato etiqueta="Servicio" valor={servicio} />}
        {completada && resumen.costo != null && <Dato etiqueta="Costo" valor={formatCOP(resumen.costo)} />}
      </View>

      {!!(resumen.notas_servicio || resumen.notas_negocio) && (
        <View style={s.notas}>
          <Text style={s.datoEtiqueta}>Notas</Text>
          {!!resumen.notas_servicio && <Text style={s.notaTexto}>{resumen.notas_servicio}</Text>}
          {!!resumen.notas_negocio && <Text style={s.notaTexto}>{resumen.notas_negocio}</Text>}
        </View>
      )}

      {(fotos.length > 0 || documentos.length > 0) && (
        <View style={s.anexos}>
          <Text style={s.datoEtiqueta}>Anexos</Text>
          {fotos.length > 0 && (
            <View style={s.fotosFila}>
              {fotos.map((url, i) => (
                <Pressable
                  key={url}
                  onPress={() => (onAbrirFotos ? onAbrirFotos(fotos, i) : openUrl(url))}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="Ver foto del servicio"
                >
                  <Image source={{ uri: url }} style={s.foto} resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          )}
          {documentos.map(d => (
            <Pressable key={d.url} style={s.doc} onPress={() => openUrl(d.url)} accessibilityRole="button">
              <IconFileText size={16} color={colors.accent} />
              <Text style={s.docTexto}>{d.tipo === 'factura' ? 'Factura' : 'Documento'}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={s.pie}>
        {resumen.total_mensajes === 1 ? '1 mensaje en la conversación' : `${resumen.total_mensajes} mensajes en la conversación`}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.lg, gap: spacing.md, marginHorizontal: spacing.xl, marginVertical: spacing.md,
  },
  cardIncrustada: { marginHorizontal: 0, marginVertical: 0 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titulo: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary, letterSpacing: -0.3 },
  grid: { gap: spacing.sm },
  dato: { gap: 2 },
  datoEtiqueta: {
    fontFamily: fonts.heading, fontSize: 11, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  datoValor: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary },
  notas: { gap: 4 },
  notaTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  anexos: { gap: spacing.sm },
  fotosFila: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  foto: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.bgSurface },
  doc: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  docTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  pie: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
});
