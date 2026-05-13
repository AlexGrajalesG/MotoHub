import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function DetalleVehiculoScreen({ route, navigation }: any) {
  const { vehiculo } = route.params;

  function tipoEmoji(tipo: string) {
    if (tipo === 'moto') return '🏍️';
    if (tipo === 'carro') return '🚗';
    if (tipo === 'camioneta') return '🚙';
    return '🚘';
  }

  const filas = [
    { label: 'Marca', valor: vehiculo.marca },
    { label: 'Modelo', valor: vehiculo.modelo },
    { label: 'Año', valor: String(vehiculo.anio) },
    { label: 'Placa', valor: vehiculo.placa },
    { label: 'Tipo', valor: vehiculo.tipo },
    { label: 'Kilometraje', valor: `${vehiculo.kilometraje.toLocaleString()} km` },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Garage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <Text style={styles.emoji}>{tipoEmoji(vehiculo.tipo)}</Text>
        <Text style={styles.nombre}>{vehiculo.marca} {vehiculo.modelo}</Text>
        <Text style={styles.placa}>{vehiculo.placa}</Text>
      </View>

      <View style={styles.card}>
        {filas.map((fila) => (
          <View key={fila.label} style={styles.fila}>
            <Text style={styles.filaLabel}>{fila.label}</Text>
            <Text style={styles.filaValor}>{fila.valor}</Text>
          </View>
        ))}
      </View>

      <View style={styles.acciones}>
        <TouchableOpacity style={styles.accion}>
          <Text style={styles.accionEmoji}>📋</Text>
          <Text style={styles.accionTexto}>Historial</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.accion}>
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
  content: { padding: 24, paddingTop: 56 },
  header: { marginBottom: 24 },
  back: { color: '#ff6b00', fontSize: 16 },
  hero: { alignItems: 'center', marginBottom: 32 },
  emoji: { fontSize: 80, marginBottom: 12 },
  nombre: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  placa: { fontSize: 16, color: '#ff6b00', marginTop: 4, fontWeight: 'bold', letterSpacing: 2 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 24,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  filaLabel: { color: '#666', fontSize: 14 },
  filaValor: { color: '#fff', fontSize: 14, fontWeight: '600' },
  acciones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  accion: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  accionEmoji: { fontSize: 28, marginBottom: 6 },
  accionTexto: { color: '#888', fontSize: 11, textAlign: 'center' },
});
