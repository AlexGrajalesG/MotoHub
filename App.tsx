import { useEffect } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { configurarHandler, solicitarPermisos } from './src/lib/notificaciones';

configurarHandler();

export default function App() {
  useEffect(() => {
    solicitarPermisos();
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
