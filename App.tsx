import { View } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { AuthProvider } from './src/context/AuthContext';
import { ModoProvider } from './src/context/ModoContext';
import { NotificacionesProvider } from './src/context/NotificacionesContext';
import AppNavigator from './src/navigation/AppNavigator';
import { configurarHandler } from './src/lib/notificaciones';

configurarHandler();

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#020202' }} />;
  }

  return (
    <AuthProvider>
      <ModoProvider>
        <NotificacionesProvider>
          <AppNavigator />
        </NotificacionesProvider>
      </ModoProvider>
    </AuthProvider>
  );
}
