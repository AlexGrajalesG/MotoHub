import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';

const Tab = createBottomTabNavigator();

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' }}>
    <Text style={{ color: '#ff6b00', fontSize: 24, fontWeight: 'bold' }}>{name}</Text>
    <Text style={{ color: '#888', marginTop: 8 }}>Próximamente</Text>
  </View>
);

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#333' }, tabBarActiveTintColor: '#ff6b00', tabBarInactiveTintColor: '#888' }}>
        <Tab.Screen name="Garage" children={() => <PlaceholderScreen name="Mi Garage" />} />
        <Tab.Screen name="Historial" children={() => <PlaceholderScreen name="Historial" />} />
        <Tab.Screen name="Recordatorios" children={() => <PlaceholderScreen name="Recordatorios" />} />
        <Tab.Screen name="Comunidad" children={() => <PlaceholderScreen name="Comunidad" />} />
        <Tab.Screen name="Perfil" children={() => <PlaceholderScreen name="Perfil" />} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
