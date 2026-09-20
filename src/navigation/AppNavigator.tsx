import { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  View, Text, StyleSheet, ActivityIndicator, Animated, AccessibilityInfo,
} from 'react-native';
import {
  IconBike, IconClipboardText, IconBuildingStore, IconUsers, IconUser, IconTools, IconTool,
} from '@tabler/icons-react-native';
import { useAuth } from '../context/AuthContext';
import { useModo } from '../context/ModoContext';
import { tokens } from '../lib/tokens';
import { supabase } from '../lib/supabase';
import { getDocStatus } from '../lib/documentos';

import LoginScreen            from '../screens/auth/LoginScreen';
import RegisterScreen         from '../screens/auth/RegisterScreen';
import CheckEmailScreen       from '../screens/auth/CheckEmailScreen';

import GarageScreen           from '../screens/garage/GarageScreen';
import AgregarVehiculoScreen  from '../screens/garage/AgregarVehiculoScreen';
import DetalleVehiculoScreen  from '../screens/garage/DetalleVehiculoScreen';
import DocumentosScreen       from '../screens/garage/DocumentosScreen';
import EditarVehiculoScreen   from '../screens/garage/EditarVehiculoScreen';
import RecordatoriosScreen    from '../screens/garage/RecordatoriosScreen';
import CrearRecordatorioScreen from '../screens/garage/CrearRecordatorioScreen';

import HistorialScreen        from '../screens/historial/HistorialScreen';
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

const Tab          = createBottomTabNavigator();
const GarageNav    = createNativeStackNavigator();
const HistorialNav = createNativeStackNavigator();
const ServiciosNav = createNativeStackNavigator();
const NegocioNav   = createNativeStackNavigator();
const CitasTabNav   = createNativeStackNavigator();
const ServiciosTabNav = createNativeStackNavigator();
const MecanicoNav  = createNativeStackNavigator();
const PerfilNav    = createNativeStackNavigator();
const AuthNav      = createNativeStackNavigator();
const { colors, spacing, radius, fonts } = tokens;

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary }}>
    <Text style={{ color: colors.accent, fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold' }}>{name}</Text>
    <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Próximamente</Text>
  </View>
);

function GarageStack() {
  return (
    <GarageNav.Navigator screenOptions={{ headerShown: false }}>
      <GarageNav.Screen name="GarageHome"        component={GarageScreen} />
      <GarageNav.Screen name="AgregarVehiculo"   component={AgregarVehiculoScreen} />
      <GarageNav.Screen name="DetalleVehiculo"   component={DetalleVehiculoScreen} />
      <GarageNav.Screen name="Documentos"        component={DocumentosScreen} />
      <GarageNav.Screen name="EditarVehiculo"    component={EditarVehiculoScreen} />
      <GarageNav.Screen name="Recordatorios"     component={RecordatoriosScreen} />
      <GarageNav.Screen name="CrearRecordatorio" component={CrearRecordatorioScreen} />
      <GarageNav.Screen name="Notificaciones"    component={NotificacionesScreen} />
      <GarageNav.Screen name="HistorialVehiculo" component={HistorialVehiculoScreen} />
      <GarageNav.Screen name="AgregarHistorial"  component={AgregarHistorialScreen} />
      <GarageNav.Screen name="DetalleHistorial"  component={DetalleHistorialScreen} />
    </GarageNav.Navigator>
  );
}

function HistorialStack() {
  return (
    <HistorialNav.Navigator screenOptions={{ headerShown: false }}>
      <HistorialNav.Screen name="HistorialHome"      component={HistorialScreen} />
      <HistorialNav.Screen name="HistorialVehiculo" component={HistorialVehiculoScreen} />
      <HistorialNav.Screen name="AgregarHistorial"  component={AgregarHistorialScreen} />
      <HistorialNav.Screen name="DetalleHistorial"  component={DetalleHistorialScreen} />
    </HistorialNav.Navigator>
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
    </ServiciosNav.Navigator>
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
    </PerfilNav.Navigator>
  );
}

const tabBarOptions = {
  headerShown: false,
  tabBarStyle: {
    backgroundColor: '#1c1f27',
    borderTopColor: '#2a2d38',
  },
  tabBarActiveTintColor:   colors.accent,
  tabBarInactiveTintColor: colors.iconInactive,
} as const;

function AppTabs({ modo }: { modo: 'cliente' | 'taller' | 'mecanico' }) {
  const { session } = useAuth();
  const { citasPendientes, refreshCitasPendientes } = useModo();
  const [recordBadge, setRecordBadge] = useState<number | undefined>(undefined);
  const [docBadge, setDocBadge]       = useState<number>(0);
  const citasBadge = citasPendientes > 0 ? citasPendientes : undefined;

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

  if (modo === 'taller') {
    return (
      <Tab.Navigator screenOptions={tabBarOptions}>
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
            tabBarBadgeStyle: { backgroundColor: '#e8522a', fontSize: 10 },
          }}
        />
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
      <Tab.Navigator screenOptions={tabBarOptions}>
        <Tab.Screen
          name="CitasMecanico"
          component={MecanicoStack}
          options={{
            tabBarLabel: 'Mis Citas',
            tabBarIcon: ({ color, size }) => <IconTool size={size} color={color} />,
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

  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="Garage"
        component={GarageStack}
        options={{
          tabBarIcon: ({ color, size }) => <IconBike size={size} color={color} />,
          tabBarBadge: (recordBadge ?? 0) + docBadge > 0 ? (recordBadge ?? 0) + docBadge : undefined,
          tabBarBadgeStyle: { backgroundColor: docBadge > 0 ? colors.danger : '#e8522a', fontSize: 10 },
        }}
      />
      <Tab.Screen
        name="Historial"
        component={HistorialStack}
        options={{ tabBarIcon: ({ color, size }) => <IconClipboardText size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Servicios"
        component={ServiciosStack}
        options={{ tabBarIcon: ({ color, size }) => <IconBuildingStore size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Comunidad"
        children={() => <PlaceholderScreen name="Comunidad" />}
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

function ModeAwareTabs() {
  const { tieneNegocio, modoTaller, esMecanico, modoMecanico } = useModo();
  const efectivo: 'cliente' | 'taller' | 'mecanico' =
    tieneNegocio && modoTaller ? 'taller' : esMecanico && modoMecanico ? 'mecanico' : 'cliente';

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

      {displayModo !== 'cliente' && (
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
      <AuthNav.Screen name="CheckEmail" component={CheckEmailScreen} />
    </AuthNav.Navigator>
  );
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
    <NavigationContainer>
      {session ? <ModeAwareTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  overlay: { backgroundColor: colors.bgPrimary },
  badge: {
    position: 'absolute',
    top: 8, right: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: 'rgba(232,82,42,0.35)',
    paddingHorizontal: 10, paddingVertical: 5,
    zIndex: 50,
  },
  badgeText: { fontFamily: fonts.heading, fontSize: 11, color: colors.accent, letterSpacing: 0.2 },
});
