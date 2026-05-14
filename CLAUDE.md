# MotoHub — Instrucciones para Claude Code

## Vault de Obsidian (segundo cerebro)
La documentacion del proyecto vive en: `C:\Users\Usuario\Desktop\MotoHub\docs`

### Archivos clave
- `04 - Desarrollo/Estado del Proyecto.md` — **ACTUALIZAR SIEMPRE al terminar algo**
- `02 - Base de Datos/Tablas Supabase.md` — schema completo de las 16 tablas
- `01 - Planificacion/Historias de Usuario.md` — todas las historias con checkboxes
- `02 - Base de Datos/Automatizaciones.md` — triggers pendientes
- `03 - Diseno UX-UI/Principios de Diseno.md` — guia de estilos

### Regla de sincronizacion
Cada vez que se completa una tarea:
1. Marcar el item como `[x]` en `Estado del Proyecto.md`
2. Si hay cambio de schema → actualizar `Tablas Supabase.md`
3. Si hay nueva historia resuelta → marcar en `Historias de Usuario.md`

Escribir en Obsidian con sintaxis correcta:
- Links internos: `[[Nombre del archivo]]`
- Callouts: `> [!note]`, `> [!warning]`, `> [!tip]`
- Frontmatter YAML al tope de cada nota nueva
- Checkboxes: `- [x]` completado, `- [ ]` pendiente

## Stack tecnico
- **Frontend:** React Native + Expo SDK 54 (TypeScript)
- **Backend:** Supabase — proyecto `bnntyudtqjevvlunefkr` (Sao Paulo)
- **Codigo:** WSL2 Ubuntu → `/home/motohub/projects/MotoHub/`
- **Device:** iPhone via Expo Go (tunnel)
- **Estilo:** dark mode `#0f0f0f`, acento naranja `#ff6b00`

## Convenciones de codigo
- `try/catch/finally` en todas las funciones async para que el loading no se quede pegado
- `useFocusEffect` + `useCallback` (NO useEffect) para refrescar listas al volver
- Signed URLs para archivos de Supabase Storage (bucket `documentos` es privado)
- Guardar `path` en BD, no la URL completa

## Estructura de pantallas
```
AppTabs
  ├── GarageStack
  │     ├── GarageScreen
  │     ├── AgregarVehiculoScreen
  │     ├── DetalleVehiculoScreen
  │     └── DocumentosScreen
  ├── HistorialScreen (pendiente)
  ├── ServiciosScreen (pendiente)
  ├── ComunidadScreen (pendiente)
  └── PerfilScreen
```

## Supabase
- 16 tablas con RLS completo
- Trigger `on_auth_user_created` → inserta en tabla `usuarios` automaticamente
- Storage bucket `documentos` privado, path: `{user_id}/{vehiculo_id}/{tipo}_{timestamp}.{ext}`
- Politicas de storage necesarias: INSERT + SELECT + DELETE en `storage.objects`
