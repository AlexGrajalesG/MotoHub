import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { IconArrowLeft, IconStar, IconStarFilled, IconCircleCheck } from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../lib/tokens';
import {
  fetchMisCalificacionesDeCita, enviarCalificacion, type DestinoTipo, type AutorRol,
} from '../../lib/calificaciones';

const { colors, spacing, radius, fonts } = tokens;

type Destino = { tipo: DestinoTipo; id: string; nombre: string; subtitulo?: string };

export default function CalificarCitaScreen({ route, navigation }: any) {
  const { citaId } = route.params as { citaId: string };
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rolPropio, setRolPropio] = useState<AutorRol | null>(null);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [calificados, setCalificados] = useState<Set<string>>(new Set());
  const [estrellas, setEstrellas] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);

  useEffect(() => { cargar(); }, [citaId]);

  async function cargar() {
    setLoading(true);
    const { data, error } = await supabase
      .from('citas')
      .select(`
        id, usuario_id, negocio_id, mecanico_id, estado,
        negocio:negocios ( nombre, propietario_id ),
        mecanico:mecanicos ( id, usuario_id, usuario:usuarios ( nombre ) )
      `)
      .eq('id', citaId)
      .single();

    if (error || !data) { Alert.alert('Error', 'No se pudo cargar la cita'); navigation.goBack(); return; }

    // usuarios.id referencia auth.users, no hay FK directa citas->usuarios
    // para que Postgrest pueda hacer el join embebido, por eso va aparte.
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('nombre')
      .eq('id', (data as any).usuario_id)
      .maybeSingle();

    const c = { ...data, usuario: usuarioData ?? null } as any;
    const esCliente = c.usuario_id === session?.user.id;
    const esNegocio = !esCliente && c.negocio?.propietario_id === session?.user.id;
    const esMecanicoAsignado = !esCliente && !esNegocio && c.mecanico?.usuario_id === session?.user.id;
    // Quien pidio esta cita especifica es el cliente de ESTE chat, incluso
    // si tambien es dueno del negocio (self-servicio en su propio taller).
    const rol: AutorRol = esCliente ? 'propietario' : esNegocio ? 'negocio' : esMecanicoAsignado ? 'mecanico' : 'propietario';
    setRolPropio(rol);

    const lista: Destino[] = rol === 'propietario'
      ? [
          { tipo: 'negocio', id: c.negocio_id, nombre: c.negocio?.nombre ?? 'Negocio' },
          ...(c.mecanico_id ? [{ tipo: 'mecanico' as DestinoTipo, id: c.mecanico_id, nombre: c.mecanico?.usuario?.nombre ?? 'Mecánico' }] : []),
        ]
      : [{ tipo: 'usuario', id: c.usuario_id, nombre: c.usuario?.nombre ?? 'Cliente' }];

    setDestinos(lista);

    const yaCalificados = await fetchMisCalificacionesDeCita(citaId, session!.user.id);
    setCalificados(new Set(yaCalificados));
    setLoading(false);
  }

  async function enviar(destino: Destino) {
    const valor = estrellas[destino.id] ?? 0;
    if (valor === 0) { Alert.alert('Selecciona estrellas', 'Toca las estrellas para calificar.'); return; }
    setEnviando(destino.id);
    const { error } = await enviarCalificacion({
      citaId, autorId: session!.user.id, autorRol: rolPropio!,
      destinoTipo: destino.tipo, destinoId: destino.id,
      estrellas: valor, comentario: comentarios[destino.id],
    });
    setEnviando(null);
    if (error) { Alert.alert('Error', error.message); return; }
    setCalificados(prev => new Set(prev).add(destino.tipo));
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <IconArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Calificar</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {destinos.map(destino => {
          const yaCalificado = calificados.has(destino.tipo);
          const valor = estrellas[destino.id] ?? 0;
          return (
            <View key={destino.tipo + destino.id} style={s.card}>
              <Text style={s.nombre}>{destino.nombre}</Text>
              <Text style={s.subtitulo}>
                {destino.tipo === 'usuario' ? 'Tu cliente' : destino.tipo === 'mecanico' ? 'Mecánico que te atendió' : 'Taller/tienda'}
              </Text>

              {yaCalificado ? (
                <View style={s.doneRow}>
                  <IconCircleCheck size={18} color={colors.success} />
                  <Text style={s.doneText}>Ya calificaste</Text>
                </View>
              ) : (
                <>
                  <View style={s.starsRow}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Pressable
                        key={n}
                        onPress={() => setEstrellas(prev => ({ ...prev, [destino.id]: n }))}
                        hitSlop={6}
                        accessibilityLabel={`${n} estrella${n > 1 ? 's' : ''}`}
                      >
                        {n <= valor
                          ? <IconStarFilled size={32} color="#f5a623" />
                          : <IconStar size={32} color={colors.bgSurface} />
                        }
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={s.comentarioInput}
                    placeholder="Comentario (opcional)"
                    placeholderTextColor={colors.textTertiary}
                    value={comentarios[destino.id] ?? ''}
                    onChangeText={v => setComentarios(prev => ({ ...prev, [destino.id]: v }))}
                    multiline
                  />
                  <Pressable
                    style={({ pressed }) => [s.enviarBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => enviar(destino)}
                    disabled={enviando === destino.id}
                  >
                    {enviando === destino.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.enviarText}>Enviar calificación</Text>
                    }
                  </Pressable>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4 },

  scroll: { padding: spacing.xl, gap: spacing.md, paddingBottom: 48 },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.md,
  },
  nombre: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary },
  subtitulo: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary, marginTop: -4 },

  starsRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginVertical: spacing.sm },

  comentarioInput: {
    backgroundColor: colors.bgSurface, borderRadius: radius.md,
    color: colors.textPrimary, fontFamily: fonts.body, fontSize: 14,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 60, textAlignVertical: 'top',
  },
  enviarBtn: { backgroundColor: colors.accent, borderRadius: radius.md, minHeight: 46, justifyContent: 'center', alignItems: 'center' },
  enviarText: { fontFamily: fonts.bold, fontSize: 14, color: '#fff' },

  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: spacing.sm },
  doneText: { fontFamily: fonts.heading, fontSize: 14, color: colors.success },
});
