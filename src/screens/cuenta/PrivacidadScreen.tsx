import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Share, Alert } from 'react-native';
import { IconFileText, IconShieldCheck, IconDownload, IconTrash } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { exportarMisDatos } from '../../lib/cuenta';
import CabeceraPantalla from '../../components/CabeceraPantalla';
import { FilaAjuste, GrupoAjustes } from '../../components/FilaAjuste';

const { colors, spacing, radius, fonts } = tokens;

const RESUMEN = [
  { titulo: 'Qué guardamos', texto: 'Tu nombre, correo, teléfono y ciudad, y los datos de tus vehículos, documentos, recordatorios, historial y citas.' },
  { titulo: 'Para qué', texto: 'Para darte el garage digital, avisarte de vencimientos y conectarte con talleres.' },
  { titulo: 'Quién los ve', texto: 'Los talleres con los que agendas una cita ven tu nombre, tu teléfono y los datos del vehículo de esa cita.' },
];

export default function PrivacidadScreen({ navigation }: any) {
  const [exportando, setExportando] = useState(false);

  async function descargar() {
    setExportando(true);
    const r = await exportarMisDatos();
    setExportando(false);
    if (!r.ok) { Alert.alert('No se pudo preparar', r.mensaje); return; }
    // Abre el menu de compartir del telefono: guardar en Archivos, enviar por correo, etc.
    await Share.share({ title: 'Mis datos de Rodix', message: r.valor });
  }

  return (
    <View style={s.container}>
      <CabeceraPantalla titulo="Privacidad y datos" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.resumen}>
          {RESUMEN.map(r => (
            <View key={r.titulo} style={{ gap: 2 }}>
              <Text style={s.resumenTitulo}>{r.titulo}</Text>
              <Text style={s.resumenTexto}>{r.texto}</Text>
            </View>
          ))}
        </View>

        <GrupoAjustes titulo="Documentos">
          <FilaAjuste
            icono={<IconShieldCheck size={20} color={colors.accent} />}
            titulo="Política de datos"
            onPress={() => navigation.navigate('Legal', { documento: 'datos' })}
          />
          <FilaAjuste
            icono={<IconFileText size={20} color={colors.accent} />}
            titulo="Términos y condiciones"
            onPress={() => navigation.navigate('Legal', { documento: 'terminos' })}
          />
        </GrupoAjustes>

        <GrupoAjustes titulo="Tus datos">
          <FilaAjuste
            icono={<IconDownload size={20} color={colors.accent} />}
            titulo="Descargar mis datos"
            detalle="Una copia de todo lo que guardamos de ti"
            onPress={descargar}
            ocupado={exportando}
          />
          <FilaAjuste
            icono={<IconTrash size={20} color={colors.dangerAction} />}
            titulo="Eliminar mi cuenta"
            detalle="Borra tu cuenta y tus datos"
            peligro
            onPress={() => navigation.navigate('EliminarCuenta')}
          />
        </GrupoAjustes>

        <Text style={s.derechos}>
          Tienes derecho a conocer, actualizar, rectificar y suprimir tus datos, y a revocar tu autorización cuando quieras.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40, gap: spacing.xl },
  resumen: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.lg, gap: spacing.lg,
  },
  resumenTitulo: { fontFamily: fonts.heading, fontSize: 14, color: colors.accent },
  resumenTexto: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
  derechos: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary, lineHeight: 19, textAlign: 'center' },
});
