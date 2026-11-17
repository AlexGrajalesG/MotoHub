import { createNavigationContainerRef } from '@react-navigation/native';

/** Referencia a la navegación para abrir pantallas desde fuera de ellas, por ejemplo al tocar un push. */
export const navigationRef = createNavigationContainerRef<any>();
