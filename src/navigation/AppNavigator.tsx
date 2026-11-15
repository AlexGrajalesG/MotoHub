import { useState, useEffect, useRef, useCallback } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  View, Text, StyleSheet, ActivityIndicator, Animated, AccessibilityInfo,
} from 'react-native';
import {
  IconBike, IconClipboardText, IconBuildingStore, IconUsers, IconUser, IconTools, IconTool, IconMessageCircle,
} from '@tabler/icons-react-native';
import { useAuth } from '../context/AuthContext';
import { useModo } from '../context/ModoContext';
import { tokens } from '../lib/tokens';
import { supabase } from '../lib/supabase';
import { getDocStatus } from '../lib/documentos';
import { fetchBandeja } from '../lib/bandeja';
import { comoSegunModo, contarNoLeidas } from '../lib/bandejaTexto';
import { fetchBandejaChats } from '../lib/conversaciones';
import { contarNoLeidasChats } from '../lib/conversacionesTexto';
import ChatConversacionScreen from '../screens/mensajes/ChatConversacionScreen';
import BuscarCuentaScreen from '../screens/mensajes/BuscarCuentaScreen';
import SumarMecanicoScreen from '../screens/mensajes/SumarMecanicoScreen';
import { useRealtimeRefresh } from '../lib/useRealtimeRefresh';

import LoginScreen            from '../screens/auth/LoginScreen';
import RegisterScreen         from '../screens/auth/RegisterScreen';
import RegistrarNegocioCuentaScreen from '../screens/auth/RegistrarNegocioCuentaScreen';
import LegalScreen from '../screens/legal/LegalScreen';
import SeguridadScreen from '../screens/cuenta/SeguridadScreen';
import EliminarCuentaScreen from '../screens/cuenta/EliminarCuentaScreen';
import PrivacidadScreen from '../screens/cuenta/PrivacidadScreen';
import AyudaScreen from '../screens/cuenta/AyudaScreen';
import AparienciaScreen from '../screens/cuenta/AparienciaScreen';
import TutorialModal from '../components/TutorialModal';
import { useTutorial } from '../lib/tutorial';
import { modoEfectivo } from '../lib/modoEfectivo';
import CuentaGate from '../components/CuentaGate';
import CheckEmailScreen       from '../screens/auth/CheckEmailScreen';
import RecuperarClaveScreen   from '../screens/auth/RecuperarClaveScreen';

import GarageScreen           from '../screens/garage/GarageScreen';
import AgregarVehiculoScreen  from '../screens/garage/AgregarVehiculoScreen';
import DetalleVehiculoScreen  from '../screens/garage/DetalleVehiculoScreen';
import DocumentosScreen       from '../screens/garage/DocumentosScreen';
import EditarVehiculoScreen   from '../screens/garage/EditarVehiculoScreen';
import FichaSeguridadScreen   from '../screens/garage/FichaSeguridadScreen';
import RecordatoriosScreen    from '../screens/garage/RecordatoriosScreen';
import CrearRecordatorioScreen from '../screens/garage/CrearRecordatorioScreen';

import HistorialVehiculoScreen from '../screens/historial/HistorialVehiculoScreen';
import AgregarHistorialScreen  from '../screens/historial/AgregarHistorialScreen';
import DetalleHistorialScreen  from '../screens/historial/DetalleHistorialScreen';

import ServiciosScreen        from '../screens/servicios/ServiciosScreen';
import NegocioDetalleScreen   from '../screens/servicios/NegocioDetalleScreen';
import SolicitarCitaScreen    from '../screens/servicios/SolicitarCitaScreen';
import MisCitasScreen         from '../screens/servicios/MisCitasScreen';
import DetalleProductoScreen  from '../screens/servicios/DetalleProductoScreen';

import MiTallerScreen          from '../screens/negocio/MiTallerScreen';
import RegistrarNegocioScreen  from '../screens/negocio/RegistrarNegocioScreen';
import EditarNegocioScreen     from '../screens/negocio/EditarNegocioScreen';
import ServiciosNegocioScreen  from '../screens/negocio/ServiciosNegocioScreen';
import EditarServicioScreen    from '../screens/negocio/EditarServicioScreen';
import CitasNegocioScreen      from '../screens/negocio/CitasNegocioScreen';
import DetalleCitaNegocioScreen from '../screens/negocio/DetalleCitaNegocioScreen';
import MiEquipoScreen          from '../screens/negocio/MiEquipoScreen';
import MisProductosScreen      from '../screens/negocio/MisProductosScreen';
import EditarProductoScreen    from '../screens/negocio/EditarProductoScreen';
import NuevaOrdenWalkinScreen  from '../screens/negocio/NuevaOrdenWalkinScreen';

import CitasMecanicoScreen     from '../screens/mecanico/CitasMecanicoScreen';

import PerfilScreen           from '../screens/PerfilScreen';
import NotificacionesScreen   from '../screens/NotificacionesScreen';
import InvitacionesEquipoScreen from '../screens/InvitacionesEquipoScreen';

import ChatCitaScreen          from '../screens/chat/ChatCitaScreen';
import RegistrarServicioScreen from '../screens/chat/RegistrarServicioScreen';

import CalificarCitaScreen     from '../screens/calificaciones/CalificarCitaScreen';

import BandejaMensajesScreen   from '../screens/mensajes/BandejaMensajesScreen';

import ComunidadScreen    from '../screens/comunidad/ComunidadScreen';
import CrearPostScreen    from '../screens/comunidad/CrearPostScreen';
import ModeracionScreen   from '../screens/comunidad/ModeracionScreen';
import ComentariosScreen  from '../screens/comunidad/ComentariosScreen';
import { estilosTema } from '../lib/estilosTema';

const Tab          = createBottomTabNavigator();
const GarageNav    = createNativeStackNavigator();
const ServiciosNav = createNativeStackNavigator();
const NegocioNav   = createNativeStackNavigator();
const CitasTabNav   = createNativeStackNavigator();
const ServiciosTabNav = createNativeStackNavigator();
const MecanicoNav  = createNativeStackNavigator();
const PerfilNav    = createNativeStackNavigator();
const AuthNav      = createNativeStackNavigator();
const ComunidadNav = createNativeStackNavigator();
const MensajesNav  = createNativeStackNavigator();
const { colors, spacing, radius, fonts } = tokens;

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary }}>
    <Text style={{ color: colors.accent, fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold' }}>{name}</Text>
    <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Próximamente</Text>
  </View>
);

/** Bandeja de mensajes; `como` llega desde la pestaña según el modo de uso (cliente o negocio). */
function MensajesStack({ route }: any) {
  return (
    <MensajesNav.Navigator screenOptions={{ headerShown: false }}>
      <MensajesNav.Screen name="MensajesHome" component={BandejaMensajesScreen} initialParams={route.params} />
      <MensajesNav.Screen name="ChatCita"          component={ChatCitaScreen} />
      <MensajesNav.Screen name="RegistrarServicio" component={RegistrarServicioScreen} />
      <MensajesNav.Screen name="CalificarCita"     component={CalificarCitaScreen} />
      <MensajesNav.Screen name="ChatConversacion"  component={ChatConversacionScreen} />
      <MensajesNav.Screen name="BuscarCuenta"      component={BuscarCuentaScreen} />
      <MensajesNav.Screen name="SumarMecanico"     component={SumarMecanicoScreen} />
    </MensajesNav.Navigator>
  );
}

function GarageStack() {
  return (
    <GarageNav.Navigator screenOptions={{ headerShown: false }}>
      <GarageNav.Screen name="GarageHome"        component={GarageScreen} />
      <GarageNav.Screen name="AgregarVehiculo"   component={AgregarVehiculoScreen} />
      <GarageNav.Screen name="DetalleVehiculo"   component={DetalleVehiculoScreen} />
      <GarageNav.Screen name="Documentos"        component={DocumentosScreen} />
      <GarageNav.Screen name="EditarVehiculo"    component={EditarVehiculoScreen} />
      <GarageNav.Screen name="FichaSeguridad"   component={FichaSeguridadScreen} />
      <GarageNav.Screen name="Recordatorios"     component={RecordatoriosScreen} />
      <GarageNav.Screen name="CrearRecordatorio" component={CrearRecordatorioScreen} />
      <GarageNav.Screen name="Notificaciones"    component={NotificacionesScreen} />
      <GarageNav.Screen name="HistorialVehiculo" component={HistorialVehiculoScreen} />
      <GarageNav.Screen name="AgregarHistorial"  component={AgregarHistorialScreen} />
      <GarageNav.Screen name="DetalleHistorial"  component={DetalleHistorialScreen} />
    </GarageNav.Navigator>
  );
}

function ServiciosStack() {
  return (
    <ServiciosNav.Navigator screenOptions={{ headerShown: false }}>
      <ServiciosNav.Screen name="ServiciosHome"  component={ServiciosScreen} />
      <ServiciosNav.Screen name="NegocioDetalle" component={NegocioDetalleScreen} />
      <ServiciosNav.Screen name="DetalleProducto" component={DetalleProductoScreen} />
      <ServiciosNav.Screen name="SolicitarCita"  component={SolicitarCitaScreen} />
      <ServiciosNav.Screen name="MisCitas"       component={MisCitasScreen} />
      <ServiciosNav.Screen name="ChatCita"          component={ChatCitaScreen} />
      <ServiciosNav.Screen name="RegistrarServicio" component={RegistrarServicioScreen} />
      <ServiciosNav.Screen name="CalificarCita"     component={CalificarCitaScreen} />
      <ServiciosNav.Screen name="Notificaciones"    component={NotificacionesScreen} />
    </ServiciosNav.Navigator>
  );
}

function ComunidadStack() {
  return (
    <ComunidadNav.Navigator screenOptions={{ headerShown: false }}>
      <ComunidadNav.Screen name="ComunidadHome" component={ComunidadScreen} />
      <ComunidadNav.Screen name="CrearPost"     component={CrearPostScreen} />
      <ComunidadNav.Screen name="Moderacion"    component={ModeracionScreen} />
      <ComunidadNav.Screen name="Comentarios"   component={ComentariosScreen} />
      <ComunidadNav.Screen name="Notificaciones" component={NotificacionesScreen} />
    </ComunidadNav.Navigator>
  );
}

function NegocioStack() {
  return (
    <NegocioNav.Navigator screenOptions={{ headerShown: false }}>
      <NegocioNav.Screen name="MiTallerHome"    component={MiTallerScreen} />
      <NegocioNav.Screen name="RegistrarNegocio" component={RegistrarNegocioScreen} />
      <NegocioNav.Screen name="EditarNegocio"   component={EditarNegocioScreen} />
      <NegocioNav.Screen name="ServiciosNegocio" component={ServiciosNegocioScreen} />
      <NegocioNav.Screen name="EditarServicio"  component={EditarServicioScreen} />
      <NegocioNav.Screen name="CitasNegocio"        component={CitasNegocioScreen} />
      <NegocioNav.Screen name="DetalleCitaNegocio"  component={DetalleCitaNegocioScreen} />
      <NegocioNav.Screen name="MiEquipo"        component={MiEquipoScreen} />
      <NegocioNav.Screen name="NuevaOrdenWalkin" component={NuevaOrdenWalkinScreen} />
      <NegocioNav.Screen name="MisProductos"    component={MisProductosScreen} />
      <NegocioNav.Screen name="EditarProducto"  component={EditarProductoScreen} />
      <NegocioNav.Screen name="Notificaciones"  component={NotificacionesScreen} />
      <NegocioNav.Screen name="ChatCita"          component={ChatCitaScreen} />
      <NegocioNav.Screen name="RegistrarServicio" component={RegistrarServicioScreen} />
      <NegocioNav.Screen name="CalificarCita"     component={CalificarCitaScreen} />
    </NegocioNav.Navigator>
  );
}

function CitasTabStack() {
  return (
    <CitasTabNav.Navigator screenOptions={{ headerShown: false }}>
      <CitasTabNav.Screen name="CitasNegocioTabHome" component={CitasNegocioScreen} />
      <CitasTabNav.Screen name="DetalleCitaNegocio"  component={DetalleCitaNegocioScreen} />
      <CitasTabNav.Screen name="ChatCita"          component={ChatCitaScreen} />
      <CitasTabNav.Screen name="RegistrarServicio" component={RegistrarServicioScreen} />
      <CitasTabNav.Screen name="CalificarCita"     component={CalificarCitaScreen} />
    </CitasTabNav.Navigator>
  );
}

function ServiciosTabStack() {
  return (
    <ServiciosTabNav.Navigator screenOptions={{ headerShown: false }}>
      <ServiciosTabNav.Screen name="ServiciosNegocioTabHome" component={ServiciosNegocioScreen} />
      <ServiciosTabNav.Screen name="EditarServicio"          component={EditarServicioScreen} />
    </ServiciosTabNav.Navigator>
  );
}

function MecanicoStack() {
  return (
    <MecanicoNav.Navigator screenOptions={{ headerShown: false }}>
      <MecanicoNav.Screen name="CitasMecanicoHome" component={CitasMecanicoScreen} />
      <MecanicoNav.Screen name="Notificaciones"    component={NotificacionesScreen} />
      <MecanicoNav.Screen name="ChatCita"          component={ChatCitaScreen} />
      <MecanicoNav.Screen name="RegistrarServicio" component={RegistrarServicioScreen} />
      <MecanicoNav.Screen name="CalificarCita"     component={CalificarCitaScreen} />
    </MecanicoNav.Navigator>
  );
}

function PerfilStack() {
  return (
    <PerfilNav.Navigator screenOptions={{ headerShown: false }}>
      <PerfilNav.Screen name="PerfilHome"       component={PerfilScreen} />
      <PerfilNav.Screen name="RegistrarNegocio" component={RegistrarNegocioScreen} />
      <PerfilNav.Screen name="InvitacionesEquipo" component={InvitacionesEquipoScreen} />
      <PerfilNav.Screen name="Seguridad"       component={SeguridadScreen} />
      <PerfilNav.Screen name="EliminarCuenta"  component={EliminarCuentaScreen} />
      <PerfilNav.Screen name="Privacidad"      component={PrivacidadScreen} />
      <PerfilNav.Screen name="Ayuda"           component={AyudaScreen} />
      <PerfilNav.Screen name="Apariencia"      component={AparienciaScreen} />
      <PerfilNav.Screen name="Legal"           component={LegalScreen} />
    </PerfilNav.Navigator>
  );
}

const tabBarOptions = () => ({
  headerShown: false,
  tabBarStyle: {
    backgroundColor: colors.bgCard,
    borderTopColor: colors.bgSurface,
  },
  tabBarActiveTintColor:   colors.accent,
  tabBarInactiveTintColor: colors.iconInactive,
}) as const;

function AppTabs({ modo }: { modo: 'cliente' | 'taller' | 'mecanico' }) {
  const { session } = useAuth();
  const { citasPendientes, refreshCitasPendientes } = useModo();
  const [recordBadge, setRecordBadge] = useState<number | undefined>(undefined);
  const [docBadge, setDocBadge]       = useState<number>(0);
  const citasBadge = citasPendientes > 0 ? citasPendientes : undefined;

  // Conversaciones con mensajes sin leer, según el lado en que se usa la app
  const como = comoSegunModo(modo);
  const [noLeidos, setNoLeidos] = useState(0);
  const ultimaRevision = useRef(0);
  const refreshMensajes = useCallback(async () => {
    if (!session?.user.id) return;
    ultimaRevision.current = Date.now();
    const [citas, chats] = await Promise.all([fetchBandeja(como), fetchBandejaChats(como)]);
    setNoLeidos(contarNoLeidas(citas) + contarNoLeidasChats(chats));
  }, [session?.user.id, como]);
  useEffect(() => { refreshMensajes(); }, [refreshMensajes]);
  useRealtimeRefresh('mensajes_cita', session?.user.id ? '' : null, refreshMensajes);
  useRealtimeRefresh('mensajes_conversacion', session?.user.id ? '' : null, refreshMensajes);
  const mensajesBadge = noLeidos > 0 ? noLeidos : undefined;
  // Al navegar (p. ej. al volver de un chat ya leído) se actualiza el contador, como máximo cada 2 s
  const screenListeners = {
    state: () => { if (Date.now() - ultimaRevision.current > 2000) refreshMensajes(); },
  };

  useEffect(() => {
    if (!session?.user.id) return;
    fetchBadge();
    fetchDocBadge();
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || modo !== 'taller') return;
    refreshCitasPendientes();
  }, [session?.user.id, modo]);

  async function fetchBadge() {
    const hoy = new Date().toISOString().split('T')[0];
    const { data: vehiculos } = await supabase
      .from('vehiculos')
      .select('id')
      .eq('propietario_id', session!.user.id)
      .eq('activo', true);
    if (!vehiculos || vehiculos.length === 0) return;

    const { count } = await supabase
      .from('recordatorios')
      .select('*', { count: 'exact', head: true })
      .in('vehiculo_id', vehiculos.map((v: any) => v.id))
      .eq('estado', 'pendiente')
      .lte('fecha_limite', hoy);

    setRecordBadge(count && count > 0 ? count : undefined);
  }

  /** Vehiculos con SOAT/tecnomecanica vencidos o por vencer — alerta critica visible en la tab bar. */
  async function fetchDocBadge() {
    const { data: vehiculos } = await supabase
      .from('vehiculos')
      .select('id, documentos(tipo, fecha_vencimiento)')
      .eq('propietario_id', session!.user.id)
      .eq('activo', true);
    if (!vehiculos) return;

    const conAlerta = (vehiculos as any[]).filter(v =>
      (v.documentos ?? []).some((d: any) => {
        const status = getDocStatus(d.fecha_vencimiento);
        return status && status.estado !== 'al_dia';
      })
    ).length;
    setDocBadge(conAlerta);
  }

  const pestanaMensajes = (
    <Tab.Screen
      name="Mensajes"
      component={MensajesStack}
      initialParams={{ como }}
      options={{
        tabBarIcon: ({ color, size }) => <IconMessageCircle size={size} color={color} />,
        tabBarBadge: mensajesBadge,
        tabBarBadgeStyle: { backgroundColor: colors.accent, fontSize: 10 },
      }}
    />
  );

  if (modo === 'taller') {
    return (
      <Tab.Navigator screenOptions={tabBarOptions} screenListeners={screenListeners}>
        <Tab.Screen
          name="MiTaller"
          component={NegocioStack}
          options={{
            tabBarLabel: 'Mi Taller',
            tabBarIcon: ({ color, size }) => <IconTools size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="CitasTaller"
          component={CitasTabStack}
          options={{
            tabBarLabel: 'Citas',
            tabBarIcon: ({ color, size }) => <IconClipboardText size={size} color={color} />,
            tabBarBadge: citasBadge,
            tabBarBadgeStyle: { backgroundColor: colors.accent, fontSize: 10 },
          }}
        />
        {pestanaMensajes}
        <Tab.Screen
          name="ServiciosTaller"
          component={ServiciosTabStack}
          options={{
            tabBarLabel: 'Servicios',
            tabBarIcon: ({ color, size }) => <IconBuildingStore size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Perfil"
          component={PerfilStack}
          options={{ tabBarIcon: ({ color, size }) => <IconUser size={size} color={color} /> }}
        />
      </Tab.Navigator>
    );
  }

  if (modo === 'mecanico') {
    return (
      <Tab.Navigator screenOptions={tabBarOptions} screenListeners={screenListeners}>
        <Tab.Screen
          name="CitasMecanico"
          component={MecanicoStack}
          options={{
            tabBarLabel: 'Mis Citas',
            tabBarIcon: ({ color, size }) => <IconTool size={size} color={color} />,
          }}
        />
        {pestanaMensajes}
        <Tab.Screen
          name="Perfil"
          component={PerfilStack}
          options={{ tabBarIcon: ({ color, size }) => <IconUser size={size} color={color} /> }}
        />
      </Tab.Navigator>
    );
  }

  return (
    <Tab.Navigator screenOptions={tabBarOptions} screenListeners={screenListeners}>
      <Tab.Screen
        name="Garage"
        component={GarageStack}
        options={{
          tabBarIcon: ({ color, size }) => <IconBike size={size} color={color} />,
          tabBarBadge: (recordBadge ?? 0) + docBadge > 0 ? (recordBadge ?? 0) + docBadge : undefined,
          tabBarBadgeStyle: { backgroundColor: docBadge > 0 ? colors.danger : colors.accent, fontSize: 10 },
        }}
      />
      <Tab.Screen
        name="Servicios"
        component={ServiciosStack}
        options={{ tabBarIcon: ({ color, size }) => <IconBuildingStore size={size} color={color} /> }}
      />
      {pestanaMensajes}
      <Tab.Screen
        name="Comunidad"
        component={ComunidadStack}
        options={{ tabBarIcon: ({ color, size }) => <IconUsers size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilStack}
        options={{ tabBarIcon: ({ color, size }) => <IconUser size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

/** Tutorial que se abre solo la primera vez que el usuario entra a cada modo. */
function TutorialPrimerIngreso() {
  const { session } = useAuth();
  const { tieneNegocio, modoTaller, esMecanico, modoMecanico, esNegocioPuro } = useModo();
  const modo = modoEfectivo({ tieneNegocio, modoTaller, esMecanico, modoMecanico, esNegocioPuro });
  const { visible, cerrar } = useTutorial(session?.user.id, modo);
  return <TutorialModal visible={visible} modo={modo} onClose={cerrar} />;
}

function ModeAwareTabs() {
  const { tieneNegocio, modoTaller, esMecanico, modoMecanico, esNegocioPuro } = useModo();
  const efectivo = modoEfectivo({ tieneNegocio, modoTaller, esMecanico, modoMecanico, esNegocioPuro });

  const [displayModo, setDisplayModo] = useState(efectivo);
  const [reduceMotion, setReduceMotion] = useState(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const badgeOpacity   = useRef(new Animated.Value(efectivo !== 'cliente' ? 1 : 0)).current;
  const badgeScale     = useRef(new Animated.Value(efectivo !== 'cliente' ? 1 : 0.85)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (efectivo === displayModo) return;

    const outDur = reduceMotion ? 100 : 180;
    const inDur  = reduceMotion ? 100 : 260;

    Animated.timing(overlayOpacity, {
      toValue: 1, duration: outDur, useNativeDriver: true,
    }).start(() => {
      setDisplayModo(efectivo);
      Animated.timing(overlayOpacity, {
        toValue: 0, duration: inDur, useNativeDriver: true,
      }).start();
    });

    if (efectivo !== 'cliente') {
      badgeScale.setValue(0.85);
      Animated.parallel([
        Animated.timing(badgeOpacity, { toValue: 1, duration: 220, delay: outDur, useNativeDriver: true }),
        Animated.spring(badgeScale,   { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6, delay: outDur }),
      ]).start();
    } else {
      Animated.timing(badgeOpacity, { toValue: 0, duration: 140, useNativeDriver: true }).start();
    }
  }, [efectivo]);

  return (
    <View style={{ flex: 1 }}>
      <AppTabs modo={displayModo} />

      {displayModo !== 'cliente' && !esNegocioPuro && (
        <Animated.View
          pointerEvents="none"
          style={[s.badge, { opacity: badgeOpacity, transform: [{ scale: badgeScale }] }]}
        >
          {displayModo === 'taller' ? <IconTools size={12} color={colors.accent} /> : <IconTool size={12} color={colors.accent} />}
          <Text style={s.badgeText}>{displayModo === 'taller' ? 'Modo Taller' : 'Modo Mecánico'}</Text>
        </Animated.View>
      )}

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, s.overlay, { opacity: overlayOpacity }]}
      />
    </View>
  );
}

function AuthStack() {
  return (
    <AuthNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthNav.Screen name="Login"      component={LoginScreen} />
      <AuthNav.Screen name="Register"   component={RegisterScreen} />
      <AuthNav.Screen name="RegistrarNegocioCuenta" component={RegistrarNegocioCuentaScreen} />
      <AuthNav.Screen name="CheckEmail" component={CheckEmailScreen} />
      <AuthNav.Screen name="RecuperarClave" component={RecuperarClaveScreen} />
      <AuthNav.Screen name="Legal"      component={LegalScreen} />
    </AuthNav.Navigator>
  );
}

/** Colores del contenedor de navegación según el tema vigente (evita destellos blancos entre pantallas). */
function temaNavegacion() {
  return {
    ...DefaultTheme,
    dark: colors.barraEstado === 'light',
    colors: {
      ...DefaultTheme.colors,
      primary: colors.accent,
      background: colors.bgPrimary,
      card: colors.bgCard,
      text: colors.textPrimary,
      border: colors.bgSurface,
      notification: colors.accent,
    },
  };
}

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const { loadingModo } = useModo();

  if (loading || (session && loadingModo)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={temaNavegacion()}>
      {session ? <CuentaGate><ModeAwareTabs /><TutorialPrimerIngreso /></CuentaGate> : <AuthStack />}
    </NavigationContainer>
  );
}

const s = estilosTema(() => ({
  overlay: { backgroundColor: colors.bgPrimary },
  badge: {
    position: 'absolute',
    top: 8, right: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.accentBorde,
    paddingHorizontal: 10, paddingVertical: 5,
    zIndex: 50,
  },
  badgeText: { fontFamily: fonts.heading, fontSize: 11, color: colors.accent, letterSpacing: 0.2 },
}));
