import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { IconChevronDown, IconChevronUp, IconBrandWhatsapp, IconMail, IconFileText, IconShieldCheck } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { SOPORTE } from '../../lib/soporte';
import CabeceraPantalla from '../../components/CabeceraPantalla';
import { FilaAjuste, GrupoAjustes } from '../../components/FilaAjuste';
import app from '../../../app.json';

const { colors, spacing, radius, fonts } = tokens;

const PREGUNTAS = [
  {
    p: '¿Cómo agrego un vehículo?',
    r: 'En Inicio toca "Agregar mi primer vehículo" o el botón + . Son 3 pasos cortos y puedes cambiar los datos después.',
  },
  {
    p: '¿Cómo me avisan cuando algo va a vencer?',
    r: 'Sube tu SOAT y tu tecnomecánica con su fecha, o crea un recordatorio. En Inicio verás en "Necesitas atención" lo que vence pronto.',
  },
  {
    p: '¿Cómo registro un mantenimiento?',
    r: 'En Inicio toca "Registrar servicio", o entra a tu vehículo y elige Historial. Ahí guardas el tipo, la fecha, el kilometraje y el costo.',
  },
  {
    p: '¿Cómo agendo una cita en un taller?',
    r: 'Ve a Servicios, elige un taller y toca "Ver servicios y agendar". Puedes seguir la cita y chatear con el taller desde Mis citas.',
  },
  {
    p: '¿Cómo me vuelvo mecánico de un taller?',
    r: 'El dueño del taller te invita con tu @usuario. Te llega una notificación y, en tu Perfil, aceptas o rechazas la invitación.',
  },
  {
    p: '¿Puedo registrar mi taller o tienda?',
    r: 'Sí. En tu Perfil toca "¿Tienes un taller o tienda?" y sigue los pasos.',
  },
];

export default function AyudaScreen({ navigation }: any) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const version = (app as { expo: { version: string } }).expo.version;
  const hayContacto = !!SOPORTE.whatsapp || !!SOPORTE.correo;

  return (
    <View style={s.container}>
      <CabeceraPantalla titulo="Ayuda" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.grupo}>
          <Text style={s.grupoTitulo}>Preguntas frecuentes</Text>
          <View style={s.tarjeta}>
            {PREGUNTAS.map((q, i) => {
              const activa = abierta === i;
              return (
                <View key={q.p} style={i > 0 && s.divisor}>
                  <Pressable
                    style={({ pressed }) => [s.pregunta, pressed && { opacity: 0.8 }]}
                    onPress={() => setAbierta(activa ? null : i)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: activa }}
                  >
                    <Text style={s.preguntaTexto}>{q.p}</Text>
                    {activa
                      ? <IconChevronUp size={18} color={colors.accent} />
                      : <IconChevronDown size={18} color={colors.textTertiary} />}
                  </Pressable>
                  {activa && <Text style={s.respuesta}>{q.r}</Text>}
                </View>
              );
            })}
          </View>
        </View>

        {hayContacto && (
          <GrupoAjustes titulo="¿Necesitas hablar con alguien?">
            {!!SOPORTE.whatsapp && (
              <FilaAjuste
                icono={<IconBrandWhatsapp size={20} color={colors.accent} />}
                titulo="Escríbenos por WhatsApp"
                onPress={() => Linking.openURL(`https://wa.me/${SOPORTE.whatsapp}`)}
              />
            )}
            {!!SOPORTE.correo && (
              <FilaAjuste
                icono={<IconMail size={20} color={colors.accent} />}
                titulo="Escríbenos por correo"
                detalle={SOPORTE.correo}
                onPress={() => Linking.openURL(`mailto:${SOPORTE.correo}`)}
              />
            )}
          </GrupoAjustes>
        )}

        <GrupoAjustes titulo="Acerca de Rodix">
          <FilaAjuste
            icono={<IconFileText size={20} color={colors.accent} />}
            titulo="Términos y condiciones"
            onPress={() => navigation.navigate('Legal', { documento: 'terminos' })}
          />
          <FilaAjuste
            icono={<IconShieldCheck size={20} color={colors.accent} />}
            titulo="Política de datos"
            onPress={() => navigation.navigate('Legal', { documento: 'datos' })}
          />
        </GrupoAjustes>

        <Text style={s.version}>Rodix · versión {version}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40, gap: spacing.xl },

  grupo: { gap: spacing.sm },
  grupoTitulo: {
    fontFamily: fonts.heading, fontSize: 12, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: spacing.xs,
  },
  tarjeta: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface, overflow: 'hidden' },
  divisor: { borderTopWidth: 1, borderTopColor: colors.bgSurface },
  pregunta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  preguntaTexto: { flex: 1, fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary, lineHeight: 21 },
  respuesta: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, lineHeight: 22, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

  version: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, textAlign: 'center' },
});
