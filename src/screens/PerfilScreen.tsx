import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  IconSettings, IconCamera, IconMapPin, IconStarFilled, IconUserPlus, IconChevronRight, IconX,
  IconBuildingStore, IconPlus, IconPencil, IconShieldLock, IconShieldCheck, IconHelpCircle,
  IconGavel, IconLogout, IconNotes, IconVideo, IconMessageCircle, IconTool,
} from '@tabler/icons-react-native';
import { supabase } from '../lib/supabase';
import { contarInvitacionesRecibidas } from '../lib/invitaciones';
import { fetchPromedio, type Promedio } from '../lib/calificaciones';
import { salirDelEquipo } from '../lib/mecanicos';
import { FORMATO_USUARIO, usuarioDisponible } from '../lib/cuenta';
import { CATEGORIAS } from '../lib/comunidadTexto';
import { fetchCitasNoLeidas } from '../lib/lecturas';
import { formatCOP } from '../lib/precio';
import { useAuth } from '../context/AuthContext';
import { useModo } from '../context/ModoContext';
import { FilaAjuste, GrupoAjustes } from '../components/FilaAjuste';
import { useVisorImagenes } from '../components/VisorImagenes';
import { tokens } from '../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

const PORTADA = require('../../assets/fondo-auth.jpg');
const CIUDADES_RAPIDAS = ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Bogotá', 'Medellín'];
const BIO_MAX = 160;
const LIMITE_HISTORIAL = 40;

type Perfil = {
  nombre: string;
  bio: string;
  telefono: string;
  ciudad: string;
  edad: number | null;
  foto_url: string | null;
  contacto_emergencia_nombre: string;
  contacto_emergencia_telefono: string;
};

type MiPost = {
  id: string; contenido: string; fotos_urls: string[] | null; video_url: string | null;
  categoria: string; ciudad: string | null; created_at: string; estado: string;
};

type EstadoCita = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

type Servicio = {
  id: string; fecha_solicitada: string; estado: EstadoCita; descripcion: string | null; precio_acordado: number | null;
  negocio: string | null; vehiculo: string | null; servicio: string | null;
};

type Chat = { citaId: string; negocio: string; ultimo: string; fecha: string; noLeido: boolean };

type Pestana = 'publicaciones' | 'historial';
type SubHistorial = 'servicios' | 'chats';

const VACIO: Perfil = {
  nombre: '', bio: '', telefono: '', ciudad: '', edad: null, foto_url: null,
  contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
};

const ESTADO_LABEL: Record<EstadoCita, string> = { pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Completada', cancelada: 'Cancelada' };
const ESTADO_COLOR: Record<EstadoCita, string> = { pendiente: '#f5a623', confirmada: '#5ac8fa', completada: '#34c759', cancelada: colors.dangerAction };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaCita(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

function hace(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function vistaPrevia(m: { texto: string | null; tipo_mensaje: string; adjuntos: any[] | null }): string {
  if (m.tipo_mensaje === 'registro_servicio') return 'Registro de servicio';
  if (m.texto) return m.texto;
  if (m.adjuntos && m.adjuntos.length > 0) return 'Adjunto';
  return 'Mensaje';
}

export default function PerfilScreen({ navigation }: any) {
  const { session } = useAuth();
  const {
    tieneNegocio, esModerador, modoTaller, setModoTaller, esMecanico, miMecanico,
    modoMecanico, setModoMecanico, refreshEsMecanico, loadingModo,
  } = useModo();

  const [perfil, setPerfil] = useState<Perfil>(VACIO);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [reputacion, setReputacion] = useState<Promedio>({ promedio: 0, total: 0 });
  const [invitaciones, setInvitaciones] = useState(0);
  const [totalVehiculos, setTotalVehiculos] = useState(0);
  const [posts, setPosts] = useState<MiPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [pestana, setPestana] = useState<Pestana>('publicaciones');
  const [sub, setSub] = useState<SubHistorial>('servicios');
  const [loading, setLoading] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [ajustesAbierto, setAjustesAbierto] = useState(false);
  const [editorAbierto, setEditorAbierto] = useState(false);
  const { abrir: abrirFotos, visor: visorFotos } = useVisorImagenes();

  useFocusEffect(useCallback(() => { cargar(); }, []));

  async function cargar() {
    const uid = session?.user.id;
    if (!uid) return;
    contarInvitacionesRecibidas(uid).then(setInvitaciones);
    fetchPromedio('mecanico', uid).then(setReputacion);

    const [{ data: u }, { count: nVehiculos }, { data: p, count }, { data: c }] = await Promise.all([
      supabase.from('usuarios')
        .select('nombre, nombre_usuario, bio, telefono, ciudad, edad, foto_url, contacto_emergencia_nombre, contacto_emergencia_telefono')
        .eq('id', uid).maybeSingle(),
      supabase.from('vehiculos').select('id', { count: 'exact', head: true }).eq('propietario_id', uid).eq('activo', true),
      supabase.from('posts')
        .select('id, contenido, fotos_urls, video_url, categoria, ciudad, created_at, estado', { count: 'exact' })
        .eq('autor_id', uid).order('created_at', { ascending: false }).limit(30),
      supabase.from('citas')
        .select('id, fecha_solicitada, estado, descripcion, precio_acordado, negocios ( nombre ), vehiculos ( marca, modelo ), servicios ( nombre )')
        .eq('usuario_id', uid)
        .order('fecha_solicitada', { ascending: false })
        .limit(LIMITE_HISTORIAL),
    ]);

    if (u) {
      setNombreUsuario(u.nombre_usuario ?? '');
      setPerfil({
        nombre: u.nombre ?? '', bio: u.bio ?? '', telefono: u.telefono ?? '', ciudad: u.ciudad ?? '',
        edad: u.edad ?? null, foto_url: u.foto_url ?? null,
        contacto_emergencia_nombre: u.contacto_emergencia_nombre ?? '',
        contacto_emergencia_telefono: u.contacto_emergencia_telefono ?? '',
      });
    }
    setTotalVehiculos(nVehiculos ?? 0);
    setPosts((p ?? []) as MiPost[]);
    setTotalPosts(count ?? (p ?? []).length);

    const citas: Servicio[] = (c ?? []).map((r: any) => ({
      id: r.id, fecha_solicitada: r.fecha_solicitada, estado: r.estado, descripcion: r.descripcion, precio_acordado: r.precio_acordado,
      negocio: r.negocios?.nombre ?? null,
      vehiculo: r.vehiculos ? `${r.vehiculos.marca} ${r.vehiculos.modelo}` : null,
      servicio: r.servicios?.nombre ?? null,
    }));
    setServicios(citas);
    setLoading(false);
    cargarChats(uid, citas);
  }

  /** Un chat por cita: el ultimo mensaje de cada una, las mas recientes primero. */
  async function cargarChats(uid: string, citas: Servicio[]) {
    const ids = citas.map(x => x.id);
    if (ids.length === 0) { setChats([]); return; }
    const [{ data: msgs }, noLeidas] = await Promise.all([
      supabase.from('mensajes_cita')
        .select('cita_id, texto, tipo_mensaje, adjuntos, created_at')
        .in('cita_id', ids).order('created_at', { ascending: false }).limit(300),
      fetchCitasNoLeidas(ids, uid),
    ]);
    const ultimo = new Map<string, any>();
    (msgs ?? []).forEach((m: any) => { if (!ultimo.has(m.cita_id)) ultimo.set(m.cita_id, m); });
    const lista: Chat[] = citas
      .filter(x => ultimo.has(x.id))
      .map(x => {
        const m = ultimo.get(x.id);
        return { citaId: x.id, negocio: x.negocio ?? 'Taller', ultimo: vistaPrevia(m), fecha: m.created_at, noLeido: noLeidas.has(x.id) };
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    setChats(lista);
  }

  async function handleFoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', quality: 0.85, allowsEditing: true, aspect: [1, 1],
    });
    if (result.canceled) return;

    setSubiendoFoto(true);
    try {
      const asset = result.assets[0];
      const rawExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const ext = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(rawExt) ? rawExt : 'jpg';
      const path = `perfiles/${session!.user.id}/avatar.${ext}`;

      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) throw new Error('No se pudo leer la imagen');

      const { error: upErr } = await supabase.storage
        .from('fotos')
        .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path);
      await supabase.from('usuarios').update({ foto_url: publicUrl }).eq('id', session!.user.id);
      setPerfil(p => ({ ...p, foto_url: `${publicUrl}?t=${Date.now()}` }));
    } catch (e: any) {
      Alert.alert('No se pudo subir la foto', e.message);
    } finally {
      setSubiendoFoto(false);
    }
  }

  function cambiarModo(m: 'personal' | 'taller' | 'mecanico') {
    setModoTaller(m === 'taller');
    setModoMecanico(m === 'mecanico');
  }

  function handleSalirDelTaller() {
    if (!miMecanico) return;
    setAjustesAbierto(false);
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
    setAjustesAbierto(false);
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  function irA(pantalla: string, params?: any) {
    setAjustesAbierto(false);
    navigation.navigate(pantalla, params);
  }

  const abrirChat = (citaId: string) => navigation.navigate('Servicios', { screen: 'ChatCita', params: { citaId } });

  const iniciales = perfil.nombre.trim()
    ? perfil.nombre.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : session?.user.email?.[0].toUpperCase() ?? '?';

  const modoActual = modoTaller ? 'taller' : modoMecanico ? 'mecanico' : 'personal';
  const hayModos = !loadingModo && (tieneNegocio || esMecanico);
  const chatsSinLeer = chats.filter(c => c.noLeido).length;

  if (loading) return (
    <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
  );

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Portada + configuración */}
        <View style={s.portadaWrap}>
          <Image source={PORTADA} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2,2,2,0.2)' }]} />
          <Pressable
            style={({ pressed }) => [s.ajustesBtn, pressed && { opacity: 0.8 }]}
            onPress={() => setAjustesAbierto(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Configuración"
          >
            <IconSettings size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Avatar + editar */}
        <View style={s.filaAvatar}>
          <Pressable onPress={() => (perfil.foto_url ? abrirFotos([perfil.foto_url], 0) : handleFoto())} style={s.avatarWrap} accessibilityRole="button" accessibilityLabel={perfil.foto_url ? 'Ver foto de perfil' : 'Agregar foto de perfil'}>
            {perfil.foto_url
              ? <Image source={{ uri: perfil.foto_url }} style={s.avatar} contentFit="cover" />
              : <View style={[s.avatar, s.avatarVacio]}><Text style={s.iniciales}>{iniciales}</Text></View>}
            <Pressable style={s.camara} onPress={handleFoto} disabled={subiendoFoto} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil">
              {subiendoFoto
                ? <ActivityIndicator size="small" color={colors.onAccent} />
                : <IconCamera size={14} color={colors.onAccent} />}
            </Pressable>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.editarBtn, pressed && { opacity: 0.8 }]}
            onPress={() => setEditorAbierto(true)}
            accessibilityRole="button"
          >
            <IconPencil size={16} color={colors.textPrimary} />
            <Text style={s.editarTexto}>Editar perfil</Text>
          </Pressable>
        </View>

        {/* Identidad */}
        <View style={s.identidad}>
          <Text style={s.nombre} numberOfLines={1}>{perfil.nombre || 'Sin nombre'}</Text>
          <View style={s.metaFila}>
            {!!nombreUsuario && <Text style={s.usuario} selectable>@{nombreUsuario}</Text>}
            {!!perfil.ciudad && (
              <View style={s.ciudadFila}>
                <IconMapPin size={13} color={colors.textSecondary} />
                <Text style={s.ciudad}>{perfil.ciudad}</Text>
              </View>
            )}
          </View>

          {perfil.bio
            ? <Text style={s.bio}>{perfil.bio}</Text>
            : (
              <Pressable onPress={() => setEditorAbierto(true)} hitSlop={6} accessibilityRole="button">
                <Text style={s.bioVacia}>Cuéntale a la comunidad quién eres y qué manejas</Text>
              </Pressable>
            )}

          <View style={s.chips}>
            <View style={s.chip}><Text style={s.chipTexto}>Propietario</Text></View>
            {tieneNegocio && <View style={s.chip}><Text style={s.chipTexto}>Dueño de negocio</Text></View>}
            {esMecanico && <View style={s.chip}><Text style={s.chipTexto} numberOfLines={1}>Mecánico en {miMecanico?.negocio_nombre}</Text></View>}
          </View>
        </View>

        {/* Cifras */}
        <View style={s.stats}>
          <Stat valor={String(totalVehiculos)} etiqueta="Vehículos" onPress={() => navigation.navigate('Garage')} />
          <View style={s.statDivisor} />
          <Stat valor={String(totalPosts)} etiqueta="Publicaciones" onPress={() => setPestana('publicaciones')} />
          <View style={s.statDivisor} />
          <Stat
            valor={reputacion.total > 0 ? reputacion.promedio.toFixed(1) : '-'}
            etiqueta={reputacion.total > 0 ? `${reputacion.total} ${reputacion.total === 1 ? 'reseña' : 'reseñas'}` : 'Reseñas'}
            estrella={reputacion.total > 0}
          />
        </View>

        {/* Invitación pendiente */}
        {invitaciones > 0 && (
          <Pressable
            style={({ pressed }) => [s.aviso, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate('InvitacionesEquipo')}
            accessibilityRole="button"
          >
            <IconUserPlus size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={s.avisoTitulo}>
                {invitaciones === 1 ? 'Un taller te invitó a su equipo' : `${invitaciones} talleres te invitaron a su equipo`}
              </Text>
              <Text style={s.avisoSub}>Acepta o rechaza</Text>
            </View>
            <IconChevronRight size={17} color={colors.textTertiary} />
          </Pressable>
        )}

        {/* Pestañas */}
        <View style={s.tabs} accessibilityRole="tablist">
          <Tab texto="Publicaciones" activa={pestana === 'publicaciones'} onPress={() => setPestana('publicaciones')} />
          <Tab texto="Historial" activa={pestana === 'historial'} onPress={() => setPestana('historial')} punto={chatsSinLeer > 0} />
        </View>

        {pestana === 'publicaciones' && (
          <View style={s.lista}>
            {posts.length === 0 ? (
              <Vacio
                icono={<IconNotes size={30} color={colors.textTertiary} />}
                titulo="Aún no has publicado"
                texto="Comparte una ruta, un tip o una foto de tu vehículo con la comunidad."
                accion="Crear publicación"
                onPress={() => navigation.navigate('Comunidad', { screen: 'CrearPost' })}
              />
            ) : posts.map(p => (
              <View key={p.id} style={s.post}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={s.postMeta}>
                    <Text style={s.postCategoria}>{CATEGORIAS.find(c => c.key === p.categoria)?.label ?? 'General'}</Text>
                    <Text style={s.postFecha}>{[p.ciudad, hace(p.created_at)].filter(Boolean).join(' · ')}</Text>
                  </View>
                  {!!p.contenido && <Text style={s.postTexto} numberOfLines={4}>{p.contenido}</Text>}
                  {!!p.video_url && (
                    <View style={s.postVideo}><IconVideo size={14} color={colors.textSecondary} /><Text style={s.postVideoTexto}>Video en enlace</Text></View>
                  )}
                  {p.estado !== 'visible' && <Text style={s.postRevision}>En revisión, solo tú la ves</Text>}
                </View>
                {p.fotos_urls?.[0] && (
                  <Pressable onPress={() => abrirFotos(p.fotos_urls!, 0)} accessibilityRole="imagebutton" accessibilityLabel="Ver fotos de la publicación">
                    <Image source={{ uri: p.fotos_urls[0] }} style={s.postFoto} contentFit="cover" />
                  </Pressable>
                )}
              </View>
            ))}
            {posts.length > 0 && (
              <Pressable style={({ pressed }) => [s.botonSec, pressed && { opacity: 0.8 }]} onPress={() => navigation.navigate('Comunidad', { screen: 'CrearPost' })} accessibilityRole="button">
                <IconPlus size={16} color={colors.textPrimary} />
                <Text style={s.botonSecTexto}>Nueva publicación</Text>
              </Pressable>
            )}
          </View>
        )}

        {pestana === 'historial' && (
          <View style={s.lista}>
            <View style={s.segmento} accessibilityRole="tablist">
              <Segmento texto="Servicios" activo={sub === 'servicios'} onPress={() => setSub('servicios')} />
              <Segmento texto={chatsSinLeer > 0 ? `Chats (${chatsSinLeer})` : 'Chats'} activo={sub === 'chats'} onPress={() => setSub('chats')} />
            </View>

            {sub === 'servicios' && (servicios.length === 0 ? (
              <Vacio
                icono={<IconTool size={30} color={colors.textTertiary} />}
                titulo="Aún no has pedido servicios"
                texto="Cuando agendes una cita con un taller, la verás aquí con su estado."
                accion="Buscar talleres"
                onPress={() => navigation.navigate('Servicios')}
              />
            ) : servicios.map(x => (
              <Pressable
                key={x.id}
                style={({ pressed }) => [s.fila, pressed && { opacity: 0.85 }]}
                onPress={() => abrirChat(x.id)}
                accessibilityRole="button"
                accessibilityLabel={`${x.servicio ?? x.descripcion ?? 'Servicio'}, ${ESTADO_LABEL[x.estado]}`}
              >
                <View style={s.filaTop}>
                  <View style={[s.estado, { backgroundColor: `${ESTADO_COLOR[x.estado]}22` }]}>
                    <View style={[s.estadoPunto, { backgroundColor: ESTADO_COLOR[x.estado] }]} />
                    <Text style={[s.estadoTexto, { color: ESTADO_COLOR[x.estado] }]}>{ESTADO_LABEL[x.estado]}</Text>
                  </View>
                  <Text style={s.filaFecha}>{fechaCita(x.fecha_solicitada)}</Text>
                </View>
                <Text style={s.filaTitulo} numberOfLines={1}>{x.servicio ?? x.descripcion ?? 'Servicio'}</Text>
                <View style={s.filaPie}>
                  <IconBuildingStore size={13} color={colors.accent} />
                  <Text style={s.filaSub} numberOfLines={1}>{[x.negocio, x.vehiculo].filter(Boolean).join(' · ')}</Text>
                  {x.precio_acordado != null && <Text style={s.filaPrecio}>{formatCOP(x.precio_acordado)}</Text>}
                </View>
              </Pressable>
            )))}

            {sub === 'chats' && (chats.length === 0 ? (
              <Vacio
                icono={<IconMessageCircle size={30} color={colors.textTertiary} />}
                titulo="Aún no tienes conversaciones"
                texto="Cada cita con un taller abre un chat para coordinar el servicio."
                accion="Buscar talleres"
                onPress={() => navigation.navigate('Servicios')}
              />
            ) : chats.map(c => (
              <Pressable
                key={c.citaId}
                style={({ pressed }) => [s.chat, pressed && { opacity: 0.85 }]}
                onPress={() => abrirChat(c.citaId)}
                accessibilityRole="button"
                accessibilityLabel={`Chat con ${c.negocio}${c.noLeido ? ', mensaje nuevo' : ''}`}
              >
                <View style={s.chatIcono}><IconBuildingStore size={20} color={colors.accent} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.chatTop}>
                    <Text style={[s.chatNombre, c.noLeido && { color: colors.textPrimary }]} numberOfLines={1}>{c.negocio}</Text>
                    <Text style={s.filaFecha}>{hace(c.fecha)}</Text>
                  </View>
                  <Text style={[s.chatUltimo, c.noLeido && s.chatUltimoNuevo]} numberOfLines={1}>{c.ultimo}</Text>
                </View>
                {c.noLeido && <View style={s.puntoNuevo} />}
              </Pressable>
            )))}
          </View>
        )}
      </ScrollView>

      {visorFotos}

      {/* Configuración */}
      <Modal visible={ajustesAbierto} transparent animationType="slide" onRequestClose={() => setAjustesAbierto(false)}>
        <Pressable style={s.velo} onPress={() => setAjustesAbierto(false)} accessibilityLabel="Cerrar configuración" />
        <View style={s.hoja}>
          <View style={s.hojaCabecera}>
            <Text style={s.hojaTitulo}>Configuración</Text>
            <Pressable onPress={() => setAjustesAbierto(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar">
              <IconX size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
            {hayModos && (
              <View style={s.modos}>
                <Text style={s.modosTitulo}>Usar Rodix como</Text>
                <View style={s.segmento} accessibilityRole="tablist">
                  <Segmento texto="Personal" activo={modoActual === 'personal'} onPress={() => cambiarModo('personal')} />
                  {tieneNegocio && <Segmento texto="Taller" activo={modoActual === 'taller'} onPress={() => cambiarModo('taller')} />}
                  {esMecanico && <Segmento texto="Mecánico" activo={modoActual === 'mecanico'} onPress={() => cambiarModo('mecanico')} />}
                </View>
                {esMecanico && (
                  <Pressable onPress={handleSalirDelTaller} hitSlop={6} style={s.salirBtn} accessibilityRole="button">
                    <Text style={s.salirTexto}>Salir de {miMecanico?.negocio_nombre}</Text>
                  </Pressable>
                )}
              </View>
            )}

            <GrupoAjustes>
              {!loadingModo && !tieneNegocio ? (
                <FilaAjuste
                  icono={<IconBuildingStore size={20} color={colors.accent} />}
                  titulo="Registrar mi taller o tienda"
                  detalle="Empieza a recibir clientes"
                  onPress={() => irA('RegistrarNegocio')}
                />
              ) : null}
              <FilaAjuste icono={<IconShieldLock size={20} color={colors.accent} />} titulo="Seguridad" onPress={() => irA('Seguridad')} />
              <FilaAjuste icono={<IconShieldCheck size={20} color={colors.accent} />} titulo="Privacidad y datos" onPress={() => irA('Privacidad')} />
              <FilaAjuste icono={<IconHelpCircle size={20} color={colors.accent} />} titulo="Ayuda" onPress={() => irA('Ayuda')} />
              {esModerador ? (
                <FilaAjuste icono={<IconGavel size={20} color={colors.accent} />} titulo="Moderación" onPress={() => irA('Comunidad', { screen: 'Moderacion' })} />
              ) : null}
            </GrupoAjustes>
            <View style={{ height: spacing.md }} />
            <GrupoAjustes>
              <FilaAjuste icono={<IconLogout size={20} color={colors.dangerAction} />} titulo="Cerrar sesión" onPress={handleLogout} peligro sinFlecha />
            </GrupoAjustes>
          </ScrollView>
        </View>
      </Modal>

      {/* Editar perfil */}
      <EditorPerfil
        visible={editorAbierto}
        perfil={perfil}
        nombreUsuario={nombreUsuario}
        uid={session!.user.id}
        onCerrar={() => setEditorAbierto(false)}
        onGuardado={(p, u) => { setPerfil(p); setNombreUsuario(u); setEditorAbierto(false); }}
      />
    </View>
  );
}

/* ─── Piezas ─── */

function Stat({ valor, etiqueta, onPress, estrella }: { valor: string; etiqueta: string; onPress?: () => void; estrella?: boolean }) {
  return (
    <Pressable style={s.stat} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${valor} ${etiqueta}`}>
      <View style={s.statValorFila}>
        {estrella && <IconStarFilled size={15} color="#f5a623" />}
        <Text style={s.statValor}>{valor}</Text>
      </View>
      <Text style={s.statEtiqueta}>{etiqueta}</Text>
    </Pressable>
  );
}

function Segmento({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[s.seg, activo && s.segOn]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: activo }}
    >
      <Text style={[s.segTexto, activo && s.segTextoOn]}>{texto}</Text>
    </Pressable>
  );
}

function Tab({ texto, activa, onPress, punto }: { texto: string; activa: boolean; onPress: () => void; punto?: boolean }) {
  return (
    <Pressable style={s.tab} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: activa }}>
      <View style={s.tabFila}>
        <Text style={[s.tabTexto, activa && s.tabTextoOn]}>{texto}</Text>
        {punto && <View style={s.puntoNuevo} />}
      </View>
      <View style={[s.tabLinea, activa && s.tabLineaOn]} />
    </Pressable>
  );
}

function Vacio({ icono, titulo, texto, accion, onPress }: { icono: React.ReactNode; titulo: string; texto: string; accion: string; onPress: () => void }) {
  return (
    <View style={s.vacio}>
      {icono}
      <Text style={s.vacioTitulo}>{titulo}</Text>
      <Text style={s.vacioTexto}>{texto}</Text>
      <Pressable style={({ pressed }) => [s.botonPri, pressed && { opacity: 0.85 }]} onPress={onPress} accessibilityRole="button">
        <Text style={s.botonPriTexto}>{accion}</Text>
      </Pressable>
    </View>
  );
}

/* ─── Editor ─── */

function EditorPerfil({ visible, perfil, nombreUsuario, uid, onCerrar, onGuardado }: {
  visible: boolean; perfil: Perfil; nombreUsuario: string; uid: string;
  onCerrar: () => void; onGuardado: (p: Perfil, usuario: string) => void;
}) {
  const [f, setF] = useState<Perfil>(perfil);
  const [usuario, setUsuario] = useState(nombreUsuario);
  const [edadTxt, setEdadTxt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Al abrir se parte siempre de lo guardado.
  const [abierto, setAbierto] = useState(false);
  if (visible && !abierto) {
    setAbierto(true); setF(perfil); setUsuario(nombreUsuario); setEdadTxt(perfil.edad ? String(perfil.edad) : ''); setError(null);
  }
  if (!visible && abierto) setAbierto(false);

  const set = (k: keyof Perfil) => (v: string) => setF(p => ({ ...p, [k]: v }));

  async function guardar() {
    const usuarioNuevo = usuario.trim();
    const edad = edadTxt.trim() ? Number(edadTxt) : null;
    if (f.nombre.trim().length < 2) { setError('Escribe tu nombre'); return; }
    if (edad !== null && (!Number.isInteger(edad) || edad < 10 || edad > 100)) { setError('Escribe una edad válida'); return; }
    setGuardando(true);
    setError(null);

    if (usuarioNuevo !== nombreUsuario) {
      if (!FORMATO_USUARIO.test(usuarioNuevo)) { setGuardando(false); setError('El usuario lleva de 3 a 20 letras minúsculas, números o guion bajo'); return; }
      const libre = await usuarioDisponible(usuarioNuevo);
      if (libre === false) { setGuardando(false); setError('Ese usuario ya está en uso'); return; }
      if (libre === null) { setGuardando(false); setError('No se pudo verificar el usuario. Intenta de nuevo'); return; }
    }

    const nuevo: Perfil = {
      ...f,
      nombre: f.nombre.trim(), bio: f.bio.trim(), telefono: f.telefono.trim(), ciudad: f.ciudad.trim(), edad,
      contacto_emergencia_nombre: f.contacto_emergencia_nombre.trim(),
      contacto_emergencia_telefono: f.contacto_emergencia_telefono.trim(),
    };
    const { error: e } = await supabase.from('usuarios').update({
      nombre: nuevo.nombre, bio: nuevo.bio || null, telefono: nuevo.telefono, ciudad: nuevo.ciudad, edad,
      contacto_emergencia_nombre: nuevo.contacto_emergencia_nombre,
      contacto_emergencia_telefono: nuevo.contacto_emergencia_telefono,
      ...(usuarioNuevo !== nombreUsuario ? { nombre_usuario: usuarioNuevo } : {}),
    }).eq('id', uid);
    setGuardando(false);
    if (e) {
      setError(e.code === '23505' ? 'Ese usuario ya está en uso' : 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.');
      return;
    }
    onGuardado(nuevo, usuarioNuevo);
  }

  function cancelar() {
    const cambio = JSON.stringify({ ...f, edad: edadTxt }) !== JSON.stringify({ ...perfil, edad: perfil.edad ? String(perfil.edad) : '' }) || usuario !== nombreUsuario;
    if (!cambio) { onCerrar(); return; }
    Alert.alert('¿Descartar cambios?', 'Perderás lo que editaste.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: onCerrar },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cancelar}>
      <KeyboardAvoidingView style={e.raiz} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={e.cabecera}>
          <Pressable onPress={cancelar} hitSlop={10} style={e.cabBtn} accessibilityRole="button"><Text style={e.cancelar}>Cancelar</Text></Pressable>
          <Text style={e.titulo}>Editar perfil</Text>
          <Pressable onPress={guardar} disabled={guardando} hitSlop={10} style={e.cabBtn} accessibilityRole="button">
            {guardando ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={e.guardar}>Guardar</Text>}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={e.contenido} keyboardShouldPersistTaps="handled">
          {!!error && <Text style={e.error} accessibilityLiveRegion="polite">{error}</Text>}

          <Entrada etiqueta="Nombre" value={f.nombre} onChangeText={set('nombre')} placeholder="Tu nombre completo" autoCapitalize="words" />
          <Entrada
            etiqueta="Usuario"
            value={usuario}
            onChangeText={v => setUsuario(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="tu_usuario"
            autoCapitalize="none"
            ayuda="Así te encuentran los talleres, con @"
          />
          <Entrada
            etiqueta="Bio"
            value={f.bio}
            onChangeText={v => set('bio')(v.slice(0, BIO_MAX))}
            placeholder="Qué manejas, por dónde ruedas"
            multiline
            ayuda={`${f.bio.length}/${BIO_MAX}`}
          />

          <Entrada etiqueta="Ciudad" value={f.ciudad} onChangeText={set('ciudad')} placeholder="Bucaramanga" autoCapitalize="words" />
          <View style={e.chips}>
            {CIUDADES_RAPIDAS.map(c => (
              <Pressable key={c} onPress={() => set('ciudad')(c)} style={[e.chip, f.ciudad === c && e.chipOn]} accessibilityRole="button">
                <Text style={[e.chipTexto, f.ciudad === c && e.chipTextoOn]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={e.seccion}>Datos privados</Text>
          <Text style={e.seccionSub}>Solo tú los ves.</Text>
          <Entrada etiqueta="Celular" value={f.telefono} onChangeText={set('telefono')} placeholder="3001234567" keyboardType="phone-pad" />
          <Entrada etiqueta="Edad" value={edadTxt} onChangeText={v => setEdadTxt(v.replace(/\D/g, '').slice(0, 3))} placeholder="Ej. 28" keyboardType="number-pad" />

          <Text style={e.seccion}>Contacto de emergencia</Text>
          <Text style={e.seccionSub}>Opcional. A quién avisar si tienes un accidente.</Text>
          <Entrada etiqueta="Nombre" value={f.contacto_emergencia_nombre} onChangeText={set('contacto_emergencia_nombre')} placeholder="Ej. María Gómez" autoCapitalize="words" />
          <Entrada etiqueta="Celular" value={f.contacto_emergencia_telefono} onChangeText={set('contacto_emergencia_telefono')} placeholder="3001234567" keyboardType="phone-pad" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Entrada({ etiqueta, ayuda, multiline, ...rest }: { etiqueta: string; ayuda?: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={e.campo}>
      <Text style={e.etiqueta}>{etiqueta}</Text>
      <TextInput
        style={[e.input, multiline && { minHeight: 84, textAlignVertical: 'top' }]}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        {...rest}
      />
      {!!ayuda && <Text style={e.ayuda}>{ayuda}</Text>}
    </View>
  );
}

/* ─── Estilos ─── */

const AVATAR = 96;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },

  portadaWrap: { height: 150, backgroundColor: colors.bgCard },
  ajustesBtn: {
    position: 'absolute', top: 52, right: spacing.xl, width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(2,2,2,0.55)', justifyContent: 'center', alignItems: 'center',
  },

  filaAvatar: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, marginTop: -AVATAR / 2,
  },
  avatarWrap: { width: AVATAR + 8, height: AVATAR + 8, borderRadius: (AVATAR + 8) / 2, backgroundColor: colors.bgPrimary, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarVacio: { backgroundColor: colors.bgSurface, justifyContent: 'center', alignItems: 'center' },
  iniciales: { fontFamily: fonts.display, fontSize: 32, color: colors.accent },
  camara: {
    position: 'absolute', right: 2, bottom: 2, width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.accent, borderWidth: 2.5, borderColor: colors.bgPrimary, justifyContent: 'center', alignItems: 'center',
  },
  editarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: spacing.lg,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.bgSurface, backgroundColor: colors.bgCard, marginBottom: 4,
  },
  editarTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.textPrimary },

  identidad: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: 6 },
  nombre: { fontFamily: fonts.display, fontSize: 24, color: colors.textPrimary, letterSpacing: -0.4 },
  metaFila: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  usuario: { fontFamily: fonts.heading, fontSize: 14, color: colors.accent },
  ciudadFila: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ciudad: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  bio: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textPrimary, marginTop: 2 },
  bioVacia: { fontFamily: fonts.body, fontSize: 14, color: colors.textTertiary, marginTop: 2, minHeight: 32, textAlignVertical: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.accentDark, borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)', maxWidth: '100%' },
  chipTexto: { fontFamily: fonts.heading, fontSize: 12, color: colors.textPrimary },

  stats: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginTop: spacing.lg,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface, paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2, minHeight: 44, justifyContent: 'center' },
  statValorFila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValor: { fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary },
  statEtiqueta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  statDivisor: { width: 1, height: 28, backgroundColor: colors.bgSurface },

  aviso: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60,
    marginHorizontal: spacing.xl, marginTop: spacing.md, padding: spacing.md,
    backgroundColor: colors.accentDark, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(72,151,90,0.35)',
  },
  avisoTitulo: { fontFamily: fonts.heading, fontSize: 14, color: colors.textPrimary },
  avisoSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  modos: { gap: spacing.sm, marginBottom: spacing.lg },
  modosTitulo: { fontFamily: fonts.heading, fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  segmento: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.bgSurface },
  seg: { flex: 1, minHeight: 40, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  segOn: { backgroundColor: colors.accent },
  segTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.textSecondary },
  segTextoOn: { fontFamily: fonts.bold, color: colors.onAccent },
  salirBtn: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  salirTexto: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, textDecorationLine: 'underline' },

  tabs: { flexDirection: 'row', marginTop: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.bgSurface },
  tab: { flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'flex-end' },
  tabFila: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 12 },
  tabTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.textSecondary },
  tabTextoOn: { color: colors.textPrimary },
  tabLinea: { height: 3, alignSelf: 'stretch', backgroundColor: 'transparent', borderRadius: 2 },
  tabLineaOn: { backgroundColor: colors.accent },
  puntoNuevo: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent },

  lista: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.md },

  post: {
    flexDirection: 'row', gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
  },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  postCategoria: { fontFamily: fonts.bold, fontSize: 11, color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.6 },
  postFecha: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  postTexto: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  postVideo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  postVideoTexto: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  postRevision: { fontFamily: fonts.body, fontSize: 12, color: colors.dangerAction },
  postFoto: { width: 72, height: 72, borderRadius: radius.md },

  fila: {
    gap: 6, padding: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface,
  },
  filaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filaFecha: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  filaTitulo: { fontFamily: fonts.heading, fontSize: 15, color: colors.textPrimary },
  filaPie: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filaSub: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  filaPrecio: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  estadoPunto: { width: 6, height: 6, borderRadius: 3 },
  estadoTexto: { fontFamily: fonts.bold, fontSize: 12 },

  chat: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 68,
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
  },
  chatIcono: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(72,151,90,0.12)', justifyContent: 'center', alignItems: 'center' },
  chatTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  chatNombre: { flex: 1, fontFamily: fonts.heading, fontSize: 15, color: colors.textSecondary },
  chatUltimo: { fontFamily: fonts.body, fontSize: 13, color: colors.textTertiary },
  chatUltimoNuevo: { color: colors.textPrimary, fontFamily: fonts.heading },

  vacio: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  vacioTitulo: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary, marginTop: spacing.xs },
  vacioTexto: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
  botonPri: { marginTop: spacing.md, minHeight: 48, paddingHorizontal: spacing.xl, borderRadius: radius.md, backgroundColor: colors.accent, justifyContent: 'center' },
  botonPriTexto: { fontFamily: fonts.bold, fontSize: 15, color: colors.onAccent },
  botonSec: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface, backgroundColor: colors.bgCard,
  },
  botonSecTexto: { fontFamily: fonts.heading, fontSize: 14, color: colors.textPrimary },

  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  hoja: {
    backgroundColor: colors.bgPrimary, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderTopWidth: 1, borderColor: colors.bgSurface, padding: spacing.xl, paddingBottom: 40,
  },
  hojaCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  hojaTitulo: { fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary },
});

const e = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.bgPrimary },
  cabecera: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.bgSurface,
  },
  cabBtn: { minWidth: 72, minHeight: 44, justifyContent: 'center' },
  cancelar: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary },
  titulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  guardar: { fontFamily: fonts.bold, fontSize: 15, color: colors.accent, textAlign: 'right' },
  contenido: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 60 },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.dangerAction, lineHeight: 20 },
  campo: { gap: 6 },
  etiqueta: { fontFamily: fonts.heading, fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary, minHeight: 50, paddingHorizontal: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.bgSurface,
  },
  ayuda: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: -spacing.sm },
  chip: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary },
  chipTextoOn: { fontFamily: fonts.bold, color: colors.onAccent },
  seccion: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary, marginTop: spacing.md },
  seccionSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: -spacing.sm },
});
