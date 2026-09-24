import { View, Text, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { IconCheck, IconX, IconClock, IconCircleCheck, IconCircleX, IconReceipt } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { formatCOP } from '../../lib/precio';
import { openUrl } from '../../lib/openUrl';
import { metaTipo, fechaLarga } from '../../lib/historialTipos';

const { colors, spacing, radius, fonts } = tokens;

type Historial = {
  id: string;
  tipo: string;
  fecha: string;
  km_en_servicio: number | null;
  costo: number | null;
  fotos: string[] | null;
  factura_url: string | null;
  aprobado_propietario: boolean | null;
};

/** Tarjeta de un servicio registrado por el taller, dentro del chat de la cita. */
export default function RegistroCard({ h, esCliente, busy, onResolver, onVerFoto }: {
  h: Historial; esCliente: boolean; busy: string | null; onResolver: (id: string, aceptar: boolean) => void;
  onVerFoto?: (urls: string[], indice: number) => void;
}) {
  const meta = metaTipo(h.tipo);
  const pendiente = h.aprobado_propietario === null;
  const aceptado = h.aprobado_propietario === true;

  const estado = pendiente
    ? { Icono: IconClock, texto: esCliente ? 'Falta tu respuesta' : 'Esperando al cliente', color: '#f5a623' }
    : aceptado
      ? { Icono: IconCircleCheck, texto: 'Aceptado', color: colors.success }
      : { Icono: IconCircleX, texto: 'Rechazado', color: colors.dangerAction };

  const mensaje = pendiente
    ? (esCliente
      ? 'El taller registró este servicio. Si es correcto, acéptalo y queda en el historial de tu vehículo.'
      : 'El cliente debe aceptarlo para que quede en el historial de su vehículo.')
    : aceptado
      ? 'Ya está en el historial del vehículo.'
      : 'No se agregó al historial.';

  return (
    <View style={s.card}>
      <View style={s.cabecera}>
        <View style={[s.icono, { backgroundColor: `${meta.color}22` }]}>
          <meta.Icon size={22} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo}>{meta.label}</Text>
          <Text style={s.fecha}>{fechaLarga(h.fecha)}</Text>
        </View>
      </View>

      <View style={[s.estado, { backgroundColor: `${estado.color}1f` }]}>
        <estado.Icono size={15} color={estado.color} />
        <Text style={[s.estadoTexto, { color: estado.color }]}>{estado.texto}</Text>
      </View>

      {(h.km_en_servicio != null || h.costo != null) && (
        <View style={s.datos}>
          {h.km_en_servicio != null && <Dato etiqueta="Kilometraje" valor={`${h.km_en_servicio.toLocaleString('es-CO')} km`} />}
          {h.costo != null && <Dato etiqueta="Costo" valor={formatCOP(h.costo)} />}
        </View>
      )}

      {((h.fotos?.length ?? 0) > 0 || h.factura_url) && (
        <View style={s.adjuntos}>
          {h.fotos?.map((url, i) => (
            <Pressable key={i} onPress={() => onVerFoto?.(h.fotos ?? [], i)} accessibilityRole="imagebutton" accessibilityLabel={`Ver foto ${i + 1}`}>
              <Image source={{ uri: url }} style={s.foto} resizeMode="cover" />
            </Pressable>
          ))}
          {h.factura_url && (
            <Pressable style={s.factura} onPress={() => openUrl(h.factura_url!)} accessibilityRole="button" accessibilityLabel="Abrir factura">
              <IconReceipt size={16} color={colors.accent} />
              <Text style={s.facturaTexto}>Factura</Text>
            </Pressable>
          )}
        </View>
      )}

      <Text style={s.mensaje}>{mensaje}</Text>

      {pendiente && esCliente && (
        <View style={s.acciones}>
          <Pressable
            style={({ pressed }) => [s.aceptar, pressed && { opacity: 0.85 }]}
            onPress={() => onResolver(h.id, true)}
            disabled={busy === h.id}
            accessibilityRole="button"
          >
            {busy === h.id
              ? <ActivityIndicator size="small" color={colors.onAccent} />
              : <><IconCheck size={17} color={colors.onAccent} /><Text style={s.aceptarTexto}>Aceptar</Text></>}
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.rechazar, pressed && { opacity: 0.85 }]}
            onPress={() => onResolver(h.id, false)}
            disabled={busy === h.id}
            accessibilityRole="button"
          >
            <IconX size={17} color={colors.textSecondary} />
            <Text style={s.rechazarTexto}>Rechazar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={s.dato}>
      <Text style={s.datoEtiqueta}>{etiqueta}</Text>
      <Text style={s.datoValor}>{valor}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    gap: spacing.md, padding: spacing.lg, backgroundColor: colors.bgCard,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.bgSurface,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icono: { width: 46, height: 46, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary, letterSpacing: -0.2 },
  fecha: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },

  estado: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  estadoTexto: { fontFamily: fonts.bold, fontSize: 12 },

  datos: { flexDirection: 'row', gap: spacing.md },
  dato: { flex: 1, padding: spacing.md, backgroundColor: colors.bgPrimary, borderRadius: radius.md, gap: 2 },
  datoEtiqueta: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  datoValor: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },

  adjuntos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  foto: { width: 68, height: 68, borderRadius: radius.md },
  factura: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 68, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.bgSurface },
  facturaTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.accent },

  mensaje: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  acciones: { flexDirection: 'row', gap: spacing.sm },
  aceptar: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.accent },
  aceptarTexto: { fontFamily: fonts.bold, fontSize: 14, color: colors.onAccent },
  rechazar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface },
  rechazarTexto: { fontFamily: fonts.bold, fontSize: 14, color: colors.textSecondary },
});
