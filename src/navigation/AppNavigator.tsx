import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import CheckEmailScreen from '../screens/auth/CheckEmailScreen';
import GarageScreen from '../screens/garage/GarageScreen';
import AgregarVehiculoScreen from '../screens/garage/AgregarVehiculoScreen';
import DetalleVehiculoScreen from '../screens/garage/DetalleVehiculoScreen';
import DocumentosScreen from '../screens/garage/DocumentosScreen';
import EditarVehiculoScreen from '../screens/garage/EditarVehiculoScreen';
import RecordatoriosScreen from '../screens/garage/RecordatoriosScreen';
import CrearRecordatorioScreen from '../screens/garage/CrearRecordatorioScreen';
import PerfilScreen from '../screens/PerfilScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' }}>
    <Text style={{ color: '#ff6b00', fontSize: 24, fontWeight: 'bold' }}>{name}</Text>
    <Text style={{ color: '#888', marginTop: 8 }}>Proximamente</Text>
  </View>
);

function GarageStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GarageHome" component={GarageScreen} />
      <Stack.Screen name="AgregarVehiculo" component={AgregarVehiculoScreen} />
      <Stack.Screen name="DetalleVehiculo" component={DetalleVehiculoScreen} />
      <Stack.Screen name="Documentos" component={DocumentosScreen} />
      <Stack.Screen name="EditarVehiculo" component={EditarVehiculoScreen} />
      <Stack.Screen name="Recordatorios" component={RecordatoriosScreen} />
      <Stack.Screen name="CrearRecordatorio" component={CrearRecordatorioScreen} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#2a2a2a' },
        tabBarActiveTintColor: '#ff6b00',
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tab.Screen name="Garage" component={GarageStack} />
      <Tab.Screen name="Historial" children={() => <PlaceholderScreen name="Historial" />} />
      <Tab.Screen name="Servicios" children={() => <PlaceholderScreen name="Servicios" />} />
      <Tab.Screen name="Comunidad" children={() => <PlaceholderScreen name="Comunidad" />} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="CheckEmail" component={CheckEmailScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' }}>
        <ActivityIndicator color="#ff6b00" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
