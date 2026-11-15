import { StyleSheet } from 'react-native';
import { obtenerTemaActual } from './tokens';
import type { NombreTema } from './paletas';

type Hoja = Record<string, any>;
type Estilos<T> = StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>;

/**
 * Reemplazo de `StyleSheet.create` que se recalcula al cambiar de tema.
 * `fabrica` lee `tokens.colors` al ejecutarse; se guarda un resultado por tema.
 * Se usa igual que antes (`s.clave`), solo que el acceso resuelve el tema vigente.
 */
export function estilosTema<T extends Estilos<T>>(fabrica: () => T): T {
  const cache = new Map<NombreTema, T>();

  const actual = (): T => {
    const tema = obtenerTemaActual();
    let hoja = cache.get(tema);
    if (!hoja) {
      hoja = StyleSheet.create(fabrica()) as T;
      cache.set(tema, hoja);
    }
    return hoja;
  };

  return new Proxy({} as T, {
    get: (_destino, clave) => (actual() as Hoja)[clave as string],
    has: (_destino, clave) => clave in actual(),
    ownKeys: () => Reflect.ownKeys(actual()),
    getOwnPropertyDescriptor: (_destino, clave) => {
      const descriptor = Object.getOwnPropertyDescriptor(actual(), clave);
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
  });
}
