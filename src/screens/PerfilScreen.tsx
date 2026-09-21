import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  TouchableOpacity, ActivityIndicator, Alert, Animated, AccessibilityInfo,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  IconPencil, IconCheck, IconLogout, IconPhone,
  IconMapPin, IconCamera, IconTools, IconBuildingStore, IconChevronRight, IconCar, IconTool, IconUserPlus,
} from '@tabler/icons-react-native';
import { supabase } from '../lib/supabase';
import { contarInvitacionesRecibidas } from '../lib/invitaciones';
import { fetchPromedio, type Promedio } from '../lib/calificaciones';
import { salirDelEquipo } from '../lib/mecanicos';
import { useAuth } from '../context/AuthContext';
import { useModo } from '../context/ModoContext';
import { tokens } from '../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

type Perfil = {
  nombre: string;
  telefono: string;
  ciudad: string;
  foto_url: string | null;
};

export default function PerfilScreen({ navigation }: any) {
  const { session } = useAuth();
  const { tieneNegocio, modoTaller, setModoTaller, esMecanico, miMecanico, modoMecanico, setModoMecanico, refreshEsMecanico, loadingModo } = useModo();
  const [reputacion, setReputacion] = useState<Promedio>({ promedio: 0, total: 0 });
  const [perfil, setPerfil]             = useState<Perfil>({ nombre: '', telefono: '', ciudad: '', foto_url: null });
  const [perfilOriginal, setPerfilOriginal] = useState<Perfil>({ nombre: '', telefono: '', ciudad: '', foto_url: null });
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [invitacionesPendientes, setInvitacionesPendientes] = useState(0);
  const [editando, setEditando]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [guardando, setGuardando]       = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const avatarScale = useRef(new Animated.Value(0.82)).current;
  const contentOp   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(v => {
      setReduceMotion(v);
      if (v) { avatarScale.setValue(1); contentOp.setValue(1); }
    });
  }, []);

  useFocusEffect(useCallback(() => { fetchPerfil(); }, []));

  async function fetchPerfil() {
    if (session?.user.id) {
      contarInvitacionesRecibidas(session.user.id).then(setInvitacionesPendientes);
      fetchPromedio('mecanico', session.user.id).then(setReputacion);
    }
    const { data } = await supabase
      .from('usuarios')
      .select('nombre, nombre_usuario, telefono, ciudad, foto_url')
      .eq('id', session?.user.id)
      .maybeSingle();

    if (data) {
      setNombreUsuario(data.nombre_usuario ?? '');
      const cargado = {
        nombre:   data.nombre   ?? '',
        telefono: data.telefono ?? '',
        ciudad:   data.ciudad   ?? '',
        foto_url: data.foto_url ?? null,
      };
      setPerfil(cargado);
      setPerfilOriginal(cargado);
    }
    setLoading(false);

    if (!reduceMotion) {
      Animated.parallel([
        Animated.spring(avatarScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 5 }),
        Animated.timing(contentOp,   { toValue: 1, duration: 260, delay: 100, useNativeDriver: true }),
      ]).start();
    }
  }

  async function handleGuardar() {
    setGuardando(true);
    const actualizado = {
      ...perfil,
      nombre:   perfil.nombre.trim(),
      telefono: perfil.telefono.trim(),
      ciudad:   perfil.ciudad.trim(),
    };
    const { error } = await supabase.from('usuarios').update({
      nombre:   actualizado.nombre,
      telefono: actualizado.telefono,
      ciudad:   actualizado.ciudad,
    }).eq('id', session!.user.id);
    setGuardando(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setPerfil(actualizado);
    setPerfilOriginal(actualizado);
    setEditando(false);
  }

  function handleCancelar() {
    if (JSON.stringify(perfil) !== JSON.stringify(perfilOriginal)) {
      Alert.alert('¿Descartar cambios?', 'Perderás la información que editaste.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => { setPerfil(perfilOriginal); setEditando(false); } },
      ]);
      return;
    }
    setEditando(false);
  }

  async function handleFoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', quality: 0.85, allowsEditing: true, aspect: [1, 1],
    });
    if (result.canceled) return;

    setSubiendoFoto(true);
    try {
      const asset  = result.assets[0];
      const rawExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const ext    = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(rawExt) ? rawExt : 'jpg';
      const path   = `perfiles/${session!.user.id}/avatar.${ext}`;

      const response    = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) throw new Error('No se pudo leer la imagen');

      const { error: upErr } = await supabase.storage
        .from('fotos')
        .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path);
      await supabase.from('usuarios').update({ foto_url: publicUrl }).eq('id', session!.user.id);
      setPerfil(p => ({ ...p, foto_url: publicUrl }));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubiendoFoto(false);
    }
  }

  function handleSalirDelTaller() {
    if (!miMecanico) return;
    Alert.alert(
      'Salir del taller',
      `¿Quieres dejar de ser mecánico de ${miMecanico.negocio_nombre}? Perderás el acceso a sus citas. Tu historial y tus calificaciones se conservan.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir', style: 'destructive',
          onPress: async () => {
            const r = await salirDelEquipo(miMecanico.negocio_id);
            if (!r.ok) { Alert.alert('No se pudo salir', r.error); return; }
            setModoMecanico(false);
            await refreshEsMecanico();
          },
        },
      ],
    );
  }

  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const iniciales = (perfil.nombre.trim()
    ? perfil.nombre.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : session?.user.email?.[0].toUpperCase() ?? '?');

  if (loading) return (
    <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Perfil</Text>
        <TouchableOpacity
          style={[s.editBtn, editando && s.editBtnGuardar]}
          onPress={editando ? handleGuardar : () => setEditando(true)}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator size="small" color={colors.onAccent} />
            : editando
              ? <><IconCheck size={15} color={colors.onAccent} /><Text style={[s.editBtnText, { color: colors.onAccent }]}>Guardar</Text></>
              : <><IconPencil size={15} color={colors.accent} /><Text style={s.editBtnText}>Editar</Text></>
          }
        </TouchableOpacity>
      </View>

      {/* ── Avatar ── */}
      <Animated.View style={[s.avatarSection, { transform: [{ scale: avatarScale }] }]}>
        <TouchableOpacity onPress={handleFoto} disabled={subiendoFoto} style={s.avatarWrap} activeOpacity={0.82}>
          {perfil.foto_url
            ? <Image source={{ uri: perfil.foto_url }} style={s.avatar} contentFit="cover" />
            : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.iniciales}>{iniciales}</Text>
              </View>
            )
          }
          <View style={s.cameraBadge}>
            {subiendoFoto
              ? <ActivityIndicator size="small" color={colors.onAccent} />
              : <IconCamera size={15} color={colors.onAccent} />
            }
          </View>
        </TouchableOpacity>
        <Text style={s.nombreText}>{perfil.nombre || 'Sin nombre'}</Text>
        {!!nombreUsuario && <Text style={s.usuarioText} selectable>@{nombreUsuario}</Text>}
        <Text style={s.emailText}>{session?.user.email}</Text>
      </Animated.View>

      {/* ── Campos ── */}
      <Animated.View style={[s.card, { opacity: contentOp }]}>
        <CampoFila
          label="Nombre"
          valor={perfil.nombre}
          editando={editando}
          placeholder="Tu nombre completo"
          onChange={v => setPerfil(p => ({ ...p, nombre: v }))}
        />
        <CampoFila
          label="Teléfono"
          valor={perfil.telefono}
          editando={editando}
          placeholder="+57 300 000 0000"
          keyboardType="phone-pad"
          icon={<IconPhone size={13} color={colors.textSecondary} />}
          onChange={v => setPerfil(p => ({ ...p, telefono: v }))}
        />
        <CampoFila
          label="Ciudad"
          valor={perfil.ciudad}
          editando={editando}
          placeholder="Bucaramanga"
          isLast
          icon={<IconMapPin size={13} color={colors.textSecondary} />}
          onChange={v => setPerfil(p => ({ ...p, ciudad: v }))}
        />
      </Animated.View>

      {/* ── Invitaciones de talleres (solo si hay pendientes) ── */}
      {invitacionesPendientes > 0 && (
        <Animated.View style={{ opacity: contentOp }}>
          <Pressable
            style={({ pressed }) => [s.modoCard, s.invitacionCard, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate('InvitacionesEquipo')}
          >
            <View style={s.modoIconWrap}>
              <IconUserPlus size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.modoTitleAccent}>
                {invitacionesPendientes === 1 ? 'Tienes 1 invitación de un taller' : `Tienes ${invitacionesPendientes} invitaciones de talleres`}
              </Text>
              <Text style={s.modoSubDim}>Acepta o rechaza unirte como mecánico</Text>
            </View>
            <IconChevronRight size={17} color={colors.textTertiary} />
          </Pressable>
        </Animated.View>
      )}

      {/* ── Negocio / Modo Taller ── */}
      {!loadingModo && (
        <Animated.View style={{ opacity: contentOp }}>
          {tieneNegocio ? (
            <Pressable
              style={({ pressed }) => [s.modoCard, pressed && { opacity: 0.85 }]}
              onPress={() => setModoTaller(!modoTaller)}
            >
              <View style={s.modoIconWrap}>
                <IconTools size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modoTitleAccent}>Modo Taller</Text>
                <Text style={s.modoSubDim}>
                  {modoTaller ? 'Viendo la app como negocio' : 'Cambia a la vista de tu negocio'}
                </Text>
              </View>
              <View style={[s.toggle, modoTaller && s.toggleOn]}>
                <View style={[s.toggleDot, modoTaller && s.toggleDotOn]} />
              </View>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [s.modoCard, pressed && { opacity: 0.85 }]}
              onPress={() => navigation.navigate('RegistrarNegocio')}
            >
              <View style={s.modoIconWrap}>
                <IconBuildingStore size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modoTitle}>¿Tienes un taller o tienda?</Text>
                <Text style={s.modoSub}>Regístralo y empieza a recibir clientes</Text>
              </View>
              <IconChevronRight size={17} color={colors.textTertiary} />
            </Pressable>
          )}
        </Animated.View>
      )}

      {/* ── Modo Mecánico ── */}
      {!loadingModo && esMecanico && (
        <Animated.View style={{ opacity: contentOp }}>
          <Pressable
            style={({ pressed }) => [s.modoCard, pressed && { opacity: 0.85 }]}
            onPress={() => setModoMecanico(!modoMecanico)}
          >
            <View style={s.modoIconWrap}>
              <IconTool size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.modoTitleAccent}>Modo Mecánico</Text>
              <Text style={s.modoSubDim}>
                {modoMecanico ? `Viendo las citas de ${miMecanico?.negocio_nombre}` : `Mecánico en ${miMecanico?.negocio_nombre}`}
              </Text>
            </View>
            <View style={[s.toggle, modoMecanico && s.toggleOn]}>
              <View style={[s.toggleDot, modoMecanico && s.toggleDotOn]} />
            </View>
          </Pressable>
          <Pressable onPress={handleSalirDelTaller} style={s.salirBtn} hitSlop={6}>
            <Text style={s.salirText}>Salir de {miMecanico?.negocio_nombre}</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* ── Reputación como mecánico (viaja con la persona, no con el taller) ── */}
      {reputacion.total > 0 && (
        <Animated.View style={{ opacity: contentOp }}>
          <View style={[s.modoCard, { minHeight: 56 }]}>
            <View style={s.modoIconWrap}>
              <IconTool size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.modoTitle}>Tu reputación como mecánico</Text>
              <Text style={s.modoSub}>
                ★ {reputacion.promedio.toFixed(1)} · {reputacion.total} {reputacion.total === 1 ? 'calificación' : 'calificaciones'}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Menú ── */}
      <Animated.View style={{ opacity: contentOp }}>
        <Pressable
          style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('Garage')}
        >
          <View style={s.menuIconWrap}>
            <IconCar size={20} color={colors.accent} />
          </View>
          <Text style={s.menuLabel}>Mis Vehículos</Text>
          <IconChevronRight size={17} color={colors.textTertiary} />
        </Pressable>
      </Animated.View>

      {/* ── Cancelar edición ── */}
      {editando && (
        <Animated.View style={{ opacity: contentOp, marginHorizontal: spacing.xl, marginBottom: spacing.xl }}>
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancelar}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Logout ── */}
      <Animated.View style={{ opacity: contentOp }}>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <IconLogout size={18} color={colors.dangerAction} />
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </Animated.View>

    </ScrollView>
  );
}

/* ─── Campo reutilizable ─── */
function CampoFila({
  label, valor, editando, onChange, placeholder, keyboardType, icon, isLast = false,
}: {
  label: string; valor: string; editando: boolean;
  onChange: (v: string) => void; placeholder?: string;
  keyboardType?: any; icon?: React.ReactNode; isLast?: boolean;
}) {
  return (
    <View style={[cf.row, !isLast && cf.border]}>
      <View style={cf.labelRow}>
        {icon && <View style={cf.iconWrap}>{icon}</View>}
        <Text style={cf.label}>{label}</Text>
      </View>
      {editando
        ? (
          <TextInput
            style={cf.input}
            value={valor}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            keyboardType={keyboardType}
            returnKeyType="done"
          />
        ) : (
          <Text style={[cf.value, !valor && cf.vacio]} numberOfLines={1}>
            {valor || placeholder}
          </Text>
        )
      }
    </View>
  );
}

/* ─── Estilos pantalla ─── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content:   { paddingBottom: 52 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.lg,
  },
  headerTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary, letterSpacing: -0.5 },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingVertical: 10, paddingHorizontal: spacing.md, minHeight: 44,
    borderWidth: 1, borderColor: colors.bgSurface,
  },
  editBtnGuardar: { backgroundColor: colors.accent, borderColor: colors.accent },
  editBtnText:    { fontFamily: fonts.heading, fontSize: 14, color: colors.accent },

  avatarSection: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: 7 },
  avatarWrap:    {
    position: 'relative', marginBottom: spacing.sm,
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3, borderColor: 'rgba(72,151,90,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatar:        { width: 108, height: 108, borderRadius: 54 },
  avatarPlaceholder: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  iniciales:   { fontFamily: fonts.display, fontSize: 32, color: colors.accent },
  cameraBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: colors.bgPrimary,
  },
  nombreText: { fontFamily: fonts.bold,  fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3 },
  usuarioText: { fontFamily: fonts.heading, fontSize: 14, color: colors.accent },
  emailText:  { fontFamily: fonts.body,  fontSize: 13, color: colors.textSecondary },

  card: {
    marginHorizontal: spacing.xl, backgroundColor: colors.bgCard,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.bgSurface,
    marginBottom: spacing.md, paddingHorizontal: spacing.sm, overflow: 'hidden',
  },

  modoCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.md, minHeight: 64,
    marginHorizontal: spacing.xl, marginBottom: spacing.md,
  },
  invitacionCard: { borderColor: colors.accent, backgroundColor: colors.accentDark },
  salirBtn: { alignSelf: 'flex-start', marginHorizontal: spacing.xl, marginTop: -spacing.sm, marginBottom: spacing.md, paddingVertical: spacing.xs },
  salirText: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, textDecorationLine: 'underline' },
  modoIconWrap: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: 'rgba(72,151,90,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  modoTitle: { fontFamily: fonts.heading, fontSize: 14, color: colors.textPrimary },
  modoSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  modoTitleAccent: {
    fontFamily: fonts.bold, fontSize: 12, color: colors.accent,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  modoSubDim: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  toggle: {
    width: 56, height: 28, borderRadius: 14,
    backgroundColor: colors.bgSurface, padding: 3, justifyContent: 'center',
  },
  toggleOn: { backgroundColor: 'rgba(72,151,90,0.35)' },
  toggleDot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.textTertiary,
  },
  toggleDotOn: { backgroundColor: colors.accent, alignSelf: 'flex-end' },

  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.md, minHeight: 64,
    marginHorizontal: spacing.xl, marginBottom: spacing.md,
  },
  menuIconWrap: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary },

  cancelBtn: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.bgSurface, minHeight: 48,
  },
  cancelText: { fontFamily: fonts.heading, color: colors.textSecondary, fontSize: 15 },

  logoutBtn: {
    marginHorizontal: spacing.xl, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderWidth: 1, borderColor: colors.dangerActionBg, minHeight: 52,
  },
  logoutText: { fontFamily: fonts.bold, color: colors.dangerAction, fontSize: 15 },
});

/* ─── Estilos campo ─── */
const cf = StyleSheet.create({
  row:      { paddingVertical: 13, paddingHorizontal: spacing.sm, gap: 4 },
  border:   { borderBottomWidth: 1, borderBottomColor: colors.bgSurface },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  iconWrap: { marginRight: 4 },
  label: {
    fontFamily: fonts.heading, fontSize: 11, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  input: {
    fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary,
    paddingVertical: 4, borderBottomWidth: 1.5, borderBottomColor: colors.accent,
    minHeight: 36,
  },
  value: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, paddingVertical: 3 },
  vacio: { color: colors.textTertiary },
});
