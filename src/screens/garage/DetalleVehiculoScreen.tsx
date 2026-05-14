import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { verificarRecordatoriosKm } from '../../lib/notificaciones';

type Vehiculo = {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  tipo: string;
  kilometraje: number;
  fotos: string[];
};

function extraerPathFotos(url: string): string {
  if (!url.startsWith('http')) return url;
  const marker = '/object/public/fotos/';
  const idx = url.indexOf(marker);
  return idx !== -1 ? url.slice(idx + marker.length) : url;
}

export default function DetalleVehiculoScreen({ route, navigation }: any) {
  const { vehiculo: inicial } = route.params;
  const { session } = useAuth();
  const [vehiculo, setVehiculo] = useState<Vehiculo>({
    ...inicial,
    fotos: inicial.fotos ?? [],
  });
  const [subiendo, setSubiendo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refrescar();
    }, [])
  );

  async function refrescar() {
    const { data } = await supabase
      .from('vehiculos')
      .select('id, marca, modelo, anio, placa, tipo, kilometraje, fotos')
      .eq('id', inicial.id)
      .single();
    if (data) setVehiculo({ ...data, fotos: data.fotos ?? [] });
  }

  function tipoEmoji(tipo: string) {
    if (tipo === 'moto') return '🏍️';
    if (tipo === 'carro') return '🚗';
    if (tipo === 'camioneta') return '🚙';
    return '🚘';
  }

  async function handleAgregarFoto() {
    if (vehiculo.fotos.length >= 5) {
      Alert.alert('Limite', 'Maximo 5 fotos por vehiculo');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.85,
    });
    if (result.canceled) return;

    setSubiendo(true);
    try {
      const asset = result.assets[0];
      const rawExt = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const ext = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(rawExt) ? rawExt : 'jpg';
      const path = `${session?.user.id}/${vehiculo.id}/${Date.now()}.${ext}`;

      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) throw new Error('No se pudo leer la imagen');

      const { error: uploadError } = await supabase.storage
        .from('fotos')
        .upload(path, arrayBuffer, { contentType: `image/${ext}` });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path);

      const nuevasFotos = [...vehiculo.fotos, publicUrl];
      const { error: updateError } = await supabase
        .from('vehiculos')
        .update({ fotos: nuevasFotos })
        .eq('id', vehiculo.id);
      if (updateError) throw updateError;

      setVehiculo(v => ({ ...v, fotos: nuevasFotos }));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubiendo(false);
    }
  }

  function handleLongPressFoto(url: string) {
    Alert.alert('Eliminar foto', '¿Quieres eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarFoto(url) },
    ]);
  }

  async function eliminarFoto(url: string) {
    try {
      const path = extraerPathFotos(url);
      await supabase.storage.from('fotos').remove([path]);
      const nuevasFotos = vehiculo.fotos.filter(f => f !== url);
      await supabase.from('vehiculos').update({ fotos: nuevasFotos }).eq('id', vehiculo.id);
      setVehiculo(v => ({ ...v, fotos: nuevasFotos }));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleActualizarKm() {
    Alert.prompt(
      'Actualizar kilometraje',
      `Actual: ${vehiculo.kilometraje.toLocaleString()} km`,
      async (valor) => {
        const nuevoKm = parseInt(valor);
        if (isNaN(nuevoKm) || nuevoKm < vehiculo.kilometraje) {
          Alert.alert('Error', `El nuevo valor debe ser mayor o igual a ${vehiculo.kilometraje.toLocaleString()} km`);
          return;
        }
        const { error } = await supabase
          .from('vehiculos')
          .update({ kilometraje: nuevoKm })
          .eq('id', vehiculo.id);
        if (error) { Alert.alert('Error', error.message); return; }
        setVehiculo(v => ({ ...v, kilometraje: nuevoKm }));
        await verificarRecordatoriosKm(
          vehiculo.id,
          `${vehiculo.marca} ${vehiculo.modelo}`,
          nuevoKm
        );
      },
      'plain-text',
      String(vehiculo.kilometraje)
    );
  }

  const filas = [
    { label: 'Marca', valor: vehiculo.marca, onPress: undefined },
    { label: 'Modelo', valor: vehiculo.modelo, onPress: undefined },
    { label: 'Año', valor: String(vehiculo.anio), onPress: undefined },
    { label: 'Placa', valor: vehiculo.placa.toUpperCase(), onPress: undefined },
    { label: 'Tipo', valor: vehiculo.tipo, onPress: undefined },
    { label: 'Kilometraje', valor: `${vehiculo.kilometraje.toLocaleString()} km`, onPress: handleActualizarKm },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.galeriaWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.galeria}
        >
          {vehiculo.fotos.map((url, idx) => (
            <TouchableOpacity
              key={idx}
              onLongPress={() => handleLongPressFoto(url)}
              activeOpacity={0.85}
              style={styles.fotoItem}
            >
              <Image source={url} style={styles.foto} contentFit="cover" />
              {idx === 0 && (
                <View style={styles.portadaBadge}>
                  <Text style={styles.portadaText}>portada</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {vehiculo.fotos.length < 5 && (
            <TouchableOpacity
              style={styles.addFotoBtn}
              onPress={handleAgregarFoto}
              disabled={subiendo}
            >
              {subiendo
                ? <ActivityIndicator color="#ff6b00" />
                : <>
                    <Text style={styles.addFotoIcon}>+</Text>
                    <Text style={styles.addFotoTexto}>
                      {vehiculo.fotos.length === 0 ? 'Agregar foto' : `${vehiculo.fotos.length}/5`}
                    </Text>
                  </>
              }
            </TouchableOpacity>
          )}
        </ScrollView>

        {vehiculo.fotos.length > 0 && (
          <Text style={styles.galeriaHint}>Manten presionado para eliminar</Text>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Text style={styles.nombre}>{vehiculo.marca} {vehiculo.modelo}</Text>
          <TouchableOpacity
            style={styles.editarBtn}
            onPress={() => navigation.navigate('EditarVehiculo', { vehiculo })}
          >
            <Text style={styles.editarText}>Editar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.placa}>{vehiculo.placa.toUpperCase()}</Text>
      </View>

      <View style={styles.card}>
        {filas.map((fila, i) => (
          <TouchableOpacity
            key={fila.label}
            style={[styles.fila, i === filas.length - 1 && styles.filaUltima]}
            onPress={fila.onPress}
            disabled={!fila.onPress}
            activeOpacity={fila.onPress ? 0.6 : 1}
          >
            <Text style={styles.filaLabel}>{fila.label}</Text>
            <View style={styles.filaDerechaRow}>
              <Text style={[styles.filaValor, fila.onPress && styles.filaValorEditable]}>
                {fila.valor}
              </Text>
              {fila.onPress && <Text style={styles.filaEditIcon}>✎</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.acciones}>
        <TouchableOpacity style={styles.accion}>
          <Text style={styles.accionEmoji}>📋</Text>
          <Text style={styles.accionTexto}>Historial</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.accion}
          onPress={() => navigation.navigate('Recordatorios', { vehiculo })}
        >
          <Text style={styles.accionEmoji}>🔔</Text>
          <Text style={styles.accionTexto}>Recordatorios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.accion}>
          <Text style={styles.accionEmoji}>🔧</Text>
          <Text style={styles.accionTexto}>Servicio</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.accion}
          onPress={() => navigation.navigate('Documentos', { vehiculo })}
        >
          <Text style={styles.accionEmoji}>📄</Text>
          <Text style={styles.accionTexto}>Documentos</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { paddingBottom: 40 },

  galeriaWrapper: { paddingTop: 56, paddingBottom: 8 },
  galeria: { paddingHorizontal: 16, gap: 10, alignItems: 'center' },
  fotoItem: { borderRadius: 14, overflow: 'hidden', position: 'relative' },
  foto: { width: 200, height: 200 },
  portadaBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255,107,0,0.85)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  portadaText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  addFotoBtn: {
    width: 200,
    height: 200,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    gap: 8,
  },
  addFotoIcon: { fontSize: 32, color: '#ff6b00' },
  addFotoTexto: { fontSize: 13, color: '#666' },
  galeriaHint: { textAlign: 'center', color: '#444', fontSize: 11, marginTop: 8 },

  info: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nombre: { fontSize: 26, fontWeight: 'bold', color: '#fff', flex: 1 },
  editarBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  editarText: { color: '#ff6b00', fontSize: 13, fontWeight: 'bold' },
  placa: { fontSize: 15, color: '#ff6b00', marginTop: 4, fontWeight: 'bold', letterSpacing: 2 },

  card: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 24,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  filaUltima: { borderBottomWidth: 0 },
  filaLabel: { color: '#666', fontSize: 14 },
  filaDerechaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filaValor: { color: '#fff', fontSize: 14, fontWeight: '600' },
  filaValorEditable: { color: '#ff6b00' },
  filaEditIcon: { color: '#ff6b00', fontSize: 13 },

  acciones: { flexDirection: 'row', marginHorizontal: 24, gap: 10 },
  accion: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  accionEmoji: { fontSize: 24, marginBottom: 6 },
  accionTexto: { color: '#888', fontSize: 10, textAlign: 'center' },
});
