import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type OrigenImagen = 'camara' | 'galeria';

export type ImagenElegida = { uri: string; ext: string; mimeType: string };

export type OpcionesImagen = {
  calidad?: number;
  recortarCuadrada?: boolean;
};

const EXTENSIONES_VALIDAS = ['jpg', 'jpeg', 'png', 'heic', 'webp'];
const EXTENSION_POR_DEFECTO = 'jpg';
const CALIDAD_POR_DEFECTO = 0.85;
const RELACION_CUADRADA: [number, number] = [1, 1];

export const TEXTOS_IMAGEN = {
  tituloOrigen: 'Agregar foto',
  mensajeOrigen: '¿De dónde quieres tomarla?',
  camara: 'Tomar foto',
  galeria: 'Elegir de la galería',
  cancelar: 'Cancelar',
  permisoTitulo: 'Permiso de cámara',
  permisoMensaje: 'Para tomar la foto, permite el acceso a la cámara en los ajustes del teléfono.',
  abrirAjustes: 'Abrir ajustes',
};

export function extensionDeUri(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() ?? EXTENSION_POR_DEFECTO;
  return EXTENSIONES_VALIDAS.includes(ext) ? ext : EXTENSION_POR_DEFECTO;
}

function mimeDeExtension(ext: string): string {
  return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
}

function avisarPermisoDenegado(): void {
  Alert.alert(TEXTOS_IMAGEN.permisoTitulo, TEXTOS_IMAGEN.permisoMensaje, [
    { text: TEXTOS_IMAGEN.cancelar, style: 'cancel' },
    { text: TEXTOS_IMAGEN.abrirAjustes, onPress: () => Linking.openSettings() },
  ]);
}

// Abre la cámara o la galería y devuelve la imagen lista para subir, o null si se cancela.
export async function capturarImagen(
  origen: OrigenImagen,
  { calidad = CALIDAD_POR_DEFECTO, recortarCuadrada = false }: OpcionesImagen = {},
): Promise<ImagenElegida | null> {
  const opciones: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    quality: calidad,
    ...(recortarCuadrada ? { allowsEditing: true, aspect: RELACION_CUADRADA } : {}),
  };

  if (origen === 'camara') {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      avisarPermisoDenegado();
      return null;
    }
  }

  const resultado = origen === 'camara'
    ? await ImagePicker.launchCameraAsync(opciones)
    : await ImagePicker.launchImageLibraryAsync(opciones);

  const asset = resultado.canceled ? null : resultado.assets[0];
  if (!asset) return null;

  const ext = extensionDeUri(asset.uri);
  return { uri: asset.uri, ext, mimeType: mimeDeExtension(ext) };
}

// Pregunta si usar cámara o galería y devuelve la imagen elegida, o null si se cancela.
export function elegirImagen(opciones?: OpcionesImagen): Promise<ImagenElegida | null> {
  return new Promise(resolve => {
    const abrir = (origen: OrigenImagen) => capturarImagen(origen, opciones).then(resolve, () => resolve(null));
    Alert.alert(TEXTOS_IMAGEN.tituloOrigen, TEXTOS_IMAGEN.mensajeOrigen, [
      { text: TEXTOS_IMAGEN.camara, onPress: () => abrir('camara') },
      { text: TEXTOS_IMAGEN.galeria, onPress: () => abrir('galeria') },
      { text: TEXTOS_IMAGEN.cancelar, style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}
