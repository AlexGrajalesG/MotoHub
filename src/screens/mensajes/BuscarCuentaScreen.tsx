import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, Keyboard } from 'react-native';
import { IconSearch } from '@tabler/icons-react-native';
import { tokens } from '../../lib/tokens';
import { estilosTema } from '../../lib/estilosTema';
import CabeceraPantalla from '../../components/CabeceraPantalla';
import { inicialDe } from '../../lib/bandejaTexto';
import {
  buscarCuenta, fetchRelacion, seguirUsuario, dejarDeSeguir, iniciarChatDirecto,
  type CuentaEncontrada,
} from '../../lib/conversaciones';
import {
  normalizarUsuario, usuarioBuscable, etiquetaRelacion, textoBotonSeguir, avisoEscribir, LARGO_MINIMO_USUARIO,
  type Relacion,
} from '../../lib/conversacionesTexto';

const { colors, spacing, radius, fonts } = tokens;

type Estado = 'inicial' | 'buscando' | 'encontrada' | 'sin_resultado' | 'error';

/** Buscar a una persona por @usuario exacto para seguirla o escribirle. */
export default function BuscarCuentaScreen({ navigation }: any) {
  const [entrada, setEntrada] = useState('');
  const [estado, setEstado] = useState<Estado>('inicial');
  const [mensajeError, setMensajeError] = useState('');
  const [cuenta, setCuenta] = useState<CuentaEncontrada | null>(null);
  const [relacion, setRelacion] = useState<Relacion | null>(null);
  const [ocupado, setOcupado] = useState<'seguir' | 'escribir' | null>(null);
  const [avisoAccion, setAvisoAccion] = useState<string | null>(null);

  async function buscar() {
    if (!usuarioBuscable(entrada)) return;
    Keyboard.dismiss();
    setEstado('buscando');
    setAvisoAccion(null);
    const r = await buscarCuenta(entrada);
    if (!r.ok) { setMensajeError(r.mensaje); setEstado('error'); return; }
    if (!r.data) { setCuenta(null); setRelacion(null); setEstado('sin_resultado'); return; }
    const rel = await fetchRelacion(r.data.id);
    setCuenta(r.data);
    setRelacion(rel.ok ? rel.data : null);
    setEstado('encontrada');
  }

  async function alternarSeguir() {
    if (!cuenta || !relacion || ocupado) return;
    setOcupado('seguir');
    setAvisoAccion(null);
    const r = relacion.yo_sigo ? await dejarDeSeguir(cuenta.id) : await seguirUsuario(cuenta.id);
    if (!r.ok) { setAvisoAccion(r.mensaje); setOcupado(null); return; }
    const rel = await fetchRelacion(cuenta.id);
    if (rel.ok) setRelacion(rel.data);
    setOcupado(null);
  }

  async function escribir() {
    if (!cuenta || ocupado) return;
    setOcupado('escribir');
    setAvisoAccion(null);
    const r = await iniciarChatDirecto(cuenta.id);
    setOcupado(null);
    if (!r.ok) { setAvisoAccion(r.mensaje); return; }
    navigation.replace('ChatConversacion', { conversacionId: r.data });
  }

  const etiqueta = relacion ? etiquetaRelacion(relacion) : null;
  const aviso = relacion ? avisoEscribir(relacion) : null;

  return (
    <View style={s.container}>
      <CabeceraPantalla titulo="Buscar persona" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>Escribe el @usuario completo de la persona. Solo aparece quien coincide exactamente.</Text>

        <View style={s.buscador}>
          <View style={s.campo}>
            <Text style={s.arroba}>@</Text>
            <TextInput
              style={s.input}
              value={entrada}
              onChangeText={t => { setEntrada(t); if (estado !== 'buscando') setEstado('inicial'); }}
              onSubmitEditing={buscar}
              placeholder="usuario"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Nombre de usuario"
            />
          </View>
          <Pressable
            style={({ pressed }) => [s.btnBuscar, (!usuarioBuscable(entrada) || estado === 'buscando') && s.deshabilitado, pressed && { opacity: 0.85 }]}
            onPress={buscar}
            disabled={!usuarioBuscable(entrada) || estado === 'buscando'}
            accessibilityRole="button"
            accessibilityLabel="Buscar"
          >
            {estado === 'buscando'
              ? <ActivityIndicator size="small" color={colors.onAccent} />
              : <IconSearch size={20} color={colors.onAccent} />}
          </Pressable>
        </View>
        {entrada.length > 0 && !usuarioBuscable(entrada) && (
          <Text style={s.ayuda}>Escribe al menos {LARGO_MINIMO_USUARIO} caracteres de «{normalizarUsuario(entrada) || '…'}».</Text>
        )}

        {estado === 'sin_resultado' && (
          <View style={s.mensajeCaja} accessibilityRole="alert">
            <Text style={s.mensajeTitulo}>No encontramos a nadie con @{normalizarUsuario(entrada)}</Text>
            <Text style={s.mensajeTexto}>Revisa que esté bien escrito. La persona también pudo cerrar su cuenta.</Text>
          </View>
        )}

        {estado === 'error' && (
          <View style={s.mensajeCaja} accessibilityRole="alert">
            <Text style={s.mensajeTitulo}>No se pudo buscar</Text>
            <Text style={s.mensajeTexto}>{mensajeError}</Text>
            <Pressable style={s.btnSecundario} onPress={buscar} accessibilityRole="button">
              <Text style={s.btnSecundarioTexto}>Intentar de nuevo</Text>
            </Pressable>
          </View>
        )}

        {estado === 'encontrada' && cuenta && (
          <View style={s.tarjeta}>
            <View style={s.perfil}>
              <View style={s.avatar}><Text style={s.avatarTexto}>{inicialDe(cuenta.nombre)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.nombre} numberOfLines={1}>{cuenta.nombre}</Text>
                <Text style={s.usuario} numberOfLines={1}>@{cuenta.nombre_usuario}</Text>
              </View>
              {!!etiqueta && (
                <View style={s.chip}><Text style={s.chipTexto}>{etiqueta}</Text></View>
              )}
            </View>

            {relacion && (
              <View style={s.acciones}>
                <Pressable
                  style={({ pressed }) => [s.btnPrimario, ocupado === 'escribir' && s.deshabilitado, pressed && { opacity: 0.85 }]}
                  onPress={escribir}
                  disabled={!!ocupado}
                  accessibilityRole="button"
                >
                  {ocupado === 'escribir'
                    ? <ActivityIndicator size="small" color={colors.onAccent} />
                    : <Text style={s.btnPrimarioTexto}>Escribir</Text>}
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.btnSecundario, relacion.yo_sigo && s.btnSiguiendo, ocupado === 'seguir' && s.deshabilitado, pressed && { opacity: 0.85 }]}
                  onPress={alternarSeguir}
                  disabled={!!ocupado}
                  accessibilityRole="button"
                  accessibilityLabel={relacion.yo_sigo ? 'Siguiendo. Toca para dejar de seguir' : textoBotonSeguir(relacion)}
                >
                  {ocupado === 'seguir'
                    ? <ActivityIndicator size="small" color={colors.textPrimary} />
                    : <Text style={s.btnSecundarioTexto}>{textoBotonSeguir(relacion)}</Text>}
                </Pressable>
              </View>
            )}

            {!!aviso && <Text style={s.ayuda}>{aviso}</Text>}
            {!!avisoAccion && <Text style={s.errorTexto} accessibilityRole="alert">{avisoAccion}</Text>}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = estilosTema(() => ({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  intro: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  buscador: { flexDirection: 'row', gap: spacing.sm },
  campo: {
    flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
  },
  arroba: { fontFamily: fonts.heading, fontSize: 16, color: colors.textSecondary, marginRight: 2 },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary, paddingVertical: 10 },
  btnBuscar: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  ayuda: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  errorTexto: { fontFamily: fonts.heading, fontSize: 13, color: colors.dangerAction, lineHeight: 18 },

  mensajeCaja: {
    gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface,
  },
  mensajeTitulo: { fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
  mensajeTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  tarjeta: {
    gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.bgSurface,
  },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bgPrimary,
    borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center',
  },
  avatarTexto: { fontFamily: fonts.display, fontSize: 22, color: colors.accent },
  nombre: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary },
  usuario: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 1 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.accentTenue, borderWidth: 1, borderColor: colors.accentBorde },
  chipTexto: { fontFamily: fonts.heading, fontSize: 12, color: colors.accent },

  acciones: { flexDirection: 'row', gap: spacing.md },
  btnPrimario: { flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  btnPrimarioTexto: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
  btnSecundario: {
    flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.bgPrimary,
    borderWidth: 1, borderColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg,
  },
  btnSiguiendo: { borderColor: colors.accentBorde },
  btnSecundarioTexto: { fontFamily: fonts.heading, fontSize: 16, color: colors.textPrimary },
  deshabilitado: { opacity: 0.4 },
}));
