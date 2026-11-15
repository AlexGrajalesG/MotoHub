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
import { TemaProvider, useTema } from './src/context/TemaContext';
import { NotificacionesProvider } from './src/context/NotificacionesContext';
import AppNavigator from './src/navigation/AppNavigator';
import { configurarHandler } from './src/lib/notificaciones';
import GuardiaOrientacion from './src/components/GuardiaOrientacion';

configurarHandler();

/** Al cambiar de tema se vuelve a montar la navegación para que todo se redibuje con la paleta nueva. */
function NavegacionConTema() {
  const { tema } = useTema();
  return <AppNavigator key={tema} />;
}

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
    <TemaProvider>
    <GuardiaOrientacion>
      <AuthProvider>
        <ModoProvider>
          <NotificacionesProvider>
            <NavegacionConTema />
          </NotificacionesProvider>
        </ModoProvider>
      </AuthProvider>
    </GuardiaOrientacion>
    </TemaProvider>
  );
}
