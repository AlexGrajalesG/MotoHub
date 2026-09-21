import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import {
  IconBuildingStore, IconPencil, IconTools,
  IconEye, IconEyeOff, IconCalendar, IconBell, IconUsers, IconPackage, IconUserPlus,
} from '@tabler/icons-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { useModo } from '../../context/ModoContext';
import { tokens } from '../../lib/tokens';

const { colors, spacing, radius, fonts } = tokens;

type Negocio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  ciudad: string | null;
  tipo: 'taller' | 'tienda' | 'concesionario' | 'mixto';
  atiende: string[];
  horario: Record<string, { abre: string; cierra: string } | null> | null;
  foto_url: string | null;
  telefono: string | null;
  activo: boolean;
};

type CitaProxima = {
  id: string;
  fecha: string;
  hora: string | null;
  estado: string;
  vehiculo: { placa: string; marca: string; modelo: string } | null;
  cliente: { nombre: string | null } | null;
};

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function estaAbierto(horario: Negocio['horario']): boolean {
  if (!horario) return false;
  const now = new Date();
  const turno = horario[DIAS[now.getDay()]];
  if (!turno) return false;
  const [ah, am] = turno.abre.split(':').map(Number);
  const [ch, cm] = turno.cierra.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= ah * 60 + am && mins < ch * 60 + cm;
}

function formatHora(hora: string | null): { time: string; meridiem: string } {
  if (!hora) return { time: '--:--', meridiem: '' };
  const [h, m] = hora.split(':').map(Number);
  return {
    time: `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    meridiem: h >= 12 ? 'PM' : 'AM',
  };
}

function getInitials(nombre: string | null | undefined): string {
  if (!nombre) return '?';
  return nombre.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export default function MiTallerScreen({ navigation }: any) {
  const { session } = useAuth();
  const { unreadCount } = useNotificaciones();
  const { citasPendientes, refreshCitasPendientes } = useModo();
  const [negocio,         setNegocio]         = useState<Negocio | null>(null);
  const [serviciosCount,  setServiciosCount]  = useState(0);
  const [citasProximas,   setCitasProximas]   = useState<CitaProxima[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [actualizando,    setActualizando]    = useState(false);

  useFocusEffect(useCallback(() => { fetchNegocio(); refreshCitasPendientes(); }, []));

  async function fetchNegocio() {
    setLoading(true);
    const { data, error } = await supabase
      .from('negocios')
      .select('id, nombre, descripcion, direccion, ciudad, tipo, atiende, horario, foto_url, telefono, activo')
      .eq('propietario_id', session!.user.id)
      .maybeSingle();

    if (error) console.error(error.message);
    setNegocio((data as Negocio) ?? null);

    if (data) {
      const [{ count }, { data: proximasRaw }] = await Promise.all([
        supabase
          .from('servicios')
          .select('*', { count: 'exact', head: true })
          .eq('negocio_id', data.id),
        supabase
          .from('citas')
          .select('id, usuario_id, fecha_solicitada, hora_solicitada, estado, vehiculo:vehiculos(placa, marca, modelo)')
          .eq('negocio_id', data.id)
          .in('estado', ['pendiente', 'confirmada'])
          .gte('fecha_solicitada', new Date().toISOString().split('T')[0])
          .order('fecha_solicitada', { ascending: true })
          .order('hora_solicitada', { ascending: true })
          .limit(3),
      ]);
      setServiciosCount(count ?? 0);

      const filas = (proximasRaw as any[]) ?? [];
      const usuarioIds = [...new Set(filas.map(c => c.usuario_id))];
      let usuariosMap: Record<string, { nombre: string | null }> = {};
      if (usuarioIds.length > 0) {
        const { data: usuarios } = await supabase.from('usuarios').select('id, nombre').in('id', usuarioIds);
        (usuarios ?? []).forEach((u: any) => { usuariosMap[u.id] = { nombre: u.nombre }; });
      }
      setCitasProximas(filas.map(c => ({
        id: c.id,
        fecha: c.fecha_solicitada,
        hora: c.hora_solicitada,
        estado: c.estado,
        vehiculo: c.vehiculo ?? null,
        cliente: usuariosMap[c.usuario_id] ?? null,
      })));
    }
    setLoading(false);
  }

  async function toggleActivo() {
    if (!negocio) return;
    setActualizando(true);
    const nuevo = !negocio.activo;
    const { error } = await supabase.from('negocios').update({ activo: nuevo }).eq('id', negocio.id);
    setActualizando(false);
    if (error) return;
    setNegocio(n => (n ? { ...n, activo: nuevo } : n));
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  const abierto = negocio ? estaAbierto(negocio.horario) : false;

  const topBar = (
    <View style={s.topBar}>
      <Text style={s.brand}>RODIX</Text>
      <View style={s.topBarRight}>
        {negocio && (
          <Pressable
            style={({ pressed }) => [s.topBarBtn, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('EditarNegocio', { negocio })}
            hitSlop={8}
            accessibilityLabel="Editar negocio"
          >
            <IconPencil size={16} color={colors.accent} />
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [s.bellBtn, pressed && { opacity: 0.8 }]}
          onPress={() => navigation.navigate('Notificaciones')}
          hitSlop={8}
          accessibilityLabel="Notificaciones"
        >
          <IconBell size={18} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={s.bellBadge}>
              <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );

  // ── Sin negocio ──────────────────────────────────────────────────────────────
  if (!negocio) {
    return (
      <View style={s.container}>
        {topBar}
        <View style={s.empty}>
          <View style={s.emptyIconWrap}>
            <IconBuildingStore size={44} color={colors.bgSurface} />
          </View>
          <Text style={s.emptyTitle}>Registra tu taller</Text>
          <Text style={s.emptySubtitle}>
            Crea el perfil de tu negocio para aparecer en Servicios y recibir solicitudes de cita.
          </Text>
          <Pressable
            style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate('RegistrarNegocio')}
          >
            <Text style={s.ctaBtnText}>Registrar mi taller</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Con negocio ──────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      {topBar}
      <ScrollView style={s.scrollView} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Encabezado del taller */}
        <View style={s.workshopHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.workshopLabel}>Mi Taller</Text>
            <Text style={s.workshopName} numberOfLines={1}>{negocio.nombre}</Text>
          </View>
          <View style={s.statusRow}>
            <View style={[s.statusDot, abierto && s.statusDotOpen]} />
            <Text style={[s.statusText, abierto && s.statusTextOpen]}>
              {abierto ? 'Abierto' : 'Cerrado'}
            </Text>
          </View>
        </View>

        {/* Bento stats (2 columnas con borde de acento) */}
        <View style={s.bento}>
          <View style={[s.bentoCard, s.bentoAccent]}>
            <Text style={s.bentoLabel}>Citas pendientes</Text>
            <Text style={[s.bentoValue, citasPendientes > 0 && s.bentoValueAlert]}>
              {citasPendientes}
            </Text>
          </View>
          <View style={s.bentoCard}>
            <Text style={s.bentoLabel}>Servicios activos</Text>
            <Text style={s.bentoValue}>{serviciosCount}</Text>
          </View>
        </View>

        {/* Próximas Citas */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Próximas Citas</Text>
          <IconCalendar size={20} color={colors.textTertiary} />
        </View>

        {citasProximas.length === 0 ? (
          <View style={s.citasEmpty}>
            <Text style={s.citasEmptyText}>Sin citas próximas</Text>
          </View>
        ) : (
          <View style={s.citasList}>
            {citasProximas.map((cita, idx) => {
              const { time, meridiem } = formatHora(cita.hora);
              const nombre = cita.cliente?.nombre ?? null;
              return (
                <View key={cita.id} style={s.citaCard}>
                  <View style={s.citaAvatar}>
                    <Text style={s.citaAvatarText}>{getInitials(nombre)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.citaNombre} numberOfLines={1}>
                      {nombre ?? 'Cliente'}
                    </Text>
                    <View style={s.citaMeta}>
                      {cita.vehiculo && (
                        <View style={s.citaPlaca}>
                          <Text style={s.citaPlacaText}>{cita.vehiculo.placa.toUpperCase()}</Text>
                        </View>
                      )}
                      {cita.vehiculo && (
                        <Text style={s.citaVehiculo} numberOfLines={1}>
                          · {cita.vehiculo.marca} {cita.vehiculo.modelo}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={s.citaHoraWrap}>
                    <Text style={[s.citaHora, idx === 0 && s.citaHoraAccent]}>{time}</Text>
                    <Text style={s.citaMeridiem}>{meridiem}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* CTA: Ver agenda completa */}
        <Pressable
          style={({ pressed }) => [s.agendaBtn, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('CitasNegocio', { negocioId: negocio.id })}
        >
          <Text style={s.agendaBtnText}>Ver agenda completa</Text>
        </Pressable>

        {/* Nueva orden sin cita previa (walk-in) — secundaria, no compite con las citas reales */}
        <Pressable
          style={({ pressed }) => [s.walkinBtn, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('NuevaOrdenWalkin', { negocioId: negocio.id })}
        >
          <IconUserPlus size={18} color={colors.textSecondary} />
          <Text style={s.walkinBtnText}>Nueva orden (sin cita)</Text>
        </Pressable>

        {/* Quick actions (2 columnas) */}
        <View style={s.quickGrid}>
          <Pressable
            style={({ pressed }) => [s.quickCard, pressed && { opacity: 0.8 }]}
            onPress={() => navigation.navigate('ServiciosNegocio', { negocioId: negocio.id })}
          >
            <IconTools size={24} color={colors.accent} />
            <Text style={s.quickLabel}>Mis Servicios</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.quickCard, pressed && { opacity: 0.8 }]}
            onPress={() => navigation.navigate('EditarNegocio', { negocio })}
          >
            <IconPencil size={24} color={colors.textSecondary} />
            <Text style={s.quickLabel}>Editar Taller</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.quickCard, pressed && { opacity: 0.8 }]}
            onPress={() => navigation.navigate('MiEquipo', { negocioId: negocio.id })}
          >
            <IconUsers size={24} color={colors.textSecondary} />
            <Text style={s.quickLabel}>Mi Equipo</Text>
          </Pressable>
          {negocio.tipo !== 'taller' && (
            <Pressable
              style={({ pressed }) => [s.quickCard, pressed && { opacity: 0.8 }]}
              onPress={() => navigation.navigate('MisProductos', { negocioId: negocio.id })}
            >
              <IconPackage size={24} color={colors.textSecondary} />
              <Text style={s.quickLabel}>Mis Productos</Text>
            </Pressable>
          )}
        </View>

        {/* Visibilidad */}
        <Pressable
          style={({ pressed }) => [s.visCard, pressed && { opacity: 0.85 }]}
          onPress={toggleActivo}
          disabled={actualizando}
        >
          {negocio.activo
            ? <IconEye size={18} color={colors.success} />
            : <IconEyeOff size={18} color={colors.textTertiary} />
          }
          <View style={{ flex: 1 }}>
            <Text style={s.visTitle}>{negocio.activo ? 'Visible para clientes' : 'Oculto'}</Text>
            <Text style={s.visSub}>
              {negocio.activo
                ? 'Tu taller aparece en la pestaña Servicios'
                : 'No aparece en Servicios — toca para activar'}
            </Text>
          </View>
          {actualizando
            ? <ActivityIndicator size="small" color={colors.textSecondary} />
            : <View style={[s.toggle, negocio.activo && s.toggleOn]}>
                <View style={[s.toggleDot, negocio.activo && s.toggleDotOn]} />
              </View>
          }
        </Pressable>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bgPrimary },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  scrollView: { flex: 1 },
  scroll:     { paddingHorizontal: spacing.xl, paddingBottom: 48 },

  /* ── Barra superior ── */
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.sm,
  },
  brand: {
    fontFamily: fonts.display, fontSize: 20, color: colors.accent,
    textTransform: 'uppercase', letterSpacing: -0.5,
  },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topBarBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  bellBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: colors.bgPrimary,
  },
  bellBadgeText: { fontFamily: fonts.bold, color: colors.onAccent, fontSize: 10 },

  /* ── Encabezado del taller ── */
  workshopHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingTop: spacing.sm, paddingBottom: spacing.lg,
  },
  workshopLabel: {
    fontFamily: fonts.bold, fontSize: 12, color: colors.accent,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2,
  },
  workshopName: {
    fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary,
    letterSpacing: -0.5, lineHeight: 34,
  },
  statusRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  statusDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textTertiary },
  statusDotOpen: { backgroundColor: colors.success },
  statusText:     { fontFamily: fonts.bold, fontSize: 13, color: colors.textTertiary },
  statusTextOpen: { color: colors.success },

  /* ── Bento stats ── */
  bento: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  bentoCard: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface,
    borderLeftWidth: 4, borderLeftColor: colors.bgSurface,
    padding: spacing.md,
  },
  bentoAccent:     { borderLeftColor: colors.accent },
  bentoLabel: {
    fontFamily: fonts.bold, fontSize: 11, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs,
  },
  bentoValue:      { fontFamily: fonts.bold, fontSize: 32, color: colors.textPrimary, lineHeight: 38 },
  bentoValueAlert: { color: colors.accent },

  /* ── Sección header ── */
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.heading, fontSize: 20, lineHeight: 26, color: colors.textPrimary,
  },

  /* ── Lista de citas próximas ── */
  citasList: { gap: spacing.md, marginBottom: spacing.lg },
  citasEmpty: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface,
    paddingVertical: spacing.xl, alignItems: 'center', marginBottom: spacing.lg,
  },
  citasEmptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  citaCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.md,
  },
  citaAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.bgSurface,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  citaAvatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.accent },
  citaNombre:     { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  citaMeta:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  citaPlaca: {
    backgroundColor: colors.bgSurface, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(72,151,90,0.2)',
  },
  citaPlacaText: {
    fontFamily: fonts.display, fontSize: 11, color: colors.textPrimary,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  citaVehiculo: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, flex: 1 },
  citaHoraWrap: { alignItems: 'flex-end', flexShrink: 0 },
  citaHora:       { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, color: colors.textSecondary },
  citaHoraAccent: { color: colors.accent },
  citaMeridiem: {
    fontFamily: fonts.bold, fontSize: 11, color: colors.textTertiary,
    textTransform: 'uppercase',
  },

  /* ── CTA: Ver agenda completa ── */
  agendaBtn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: spacing.lg, alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  agendaBtnText: {
    fontFamily: fonts.bold, fontSize: 13, color: colors.onAccent,
    textTransform: 'uppercase', letterSpacing: 1.5,
  },

  walkinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.bgSurface,
    minHeight: 48, marginBottom: spacing.lg,
  },
  walkinBtnText: { fontFamily: fonts.heading, fontSize: 13, color: colors.textSecondary },

  /* ── Quick actions ── */
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  quickCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: spacing.md, alignItems: 'center', gap: spacing.sm,
  },
  quickLabel: {
    fontFamily: fonts.bold, fontSize: 12, color: colors.textPrimary,
    textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center',
  },

  /* ── Visibilidad ── */
  visCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.bgSurface,
    padding: spacing.md, marginBottom: spacing.md,
  },
  visTitle: { fontFamily: fonts.heading, fontSize: 14, color: colors.textPrimary },
  visSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: colors.bgSurface, padding: 3, justifyContent: 'center',
  },
  toggleOn:    { backgroundColor: 'rgba(47,168,155,0.35)' },
  toggleDot:   { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.textTertiary },
  toggleDotOn: { backgroundColor: colors.success, alignSelf: 'flex-end' },

  /* ── Empty state ── */
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl,
  },
  emptyIconWrap: {
    width: 90, height: 90, backgroundColor: colors.bgCard,
    borderRadius: radius.xl, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.bgSurface,
  },
  emptyTitle: {
    fontFamily: fonts.display, fontSize: 22, color: colors.textPrimary,
    marginBottom: spacing.sm, letterSpacing: -0.3, textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl,
  },
  ctaBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl,
    minHeight: 52, justifyContent: 'center',
  },
  ctaBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onAccent },
});
