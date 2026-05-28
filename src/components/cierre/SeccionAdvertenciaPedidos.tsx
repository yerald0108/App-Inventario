import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCUP } from '../../utils';

interface Pedido {
  id: number;
  nombre: string;
  total: number;
}

interface Props {
  pedidos: Pedido[];
}

export default function SeccionAdvertenciaPedidos({ pedidos }: Props) {
  if (pedidos.length === 0) return null;

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.cabecera}>
        <Ionicons name="warning" size={20} color="#c05621" />
        <Text style={estilos.titulo}>
          {pedidos.length} pedido{pedidos.length > 1 ? 's' : ''} sin cobrar
        </Text>
      </View>
      <Text style={estilos.texto}>
        Estos pedidos se cancelarán si cierras el turno ahora:
      </Text>
      {pedidos.map(p => (
        <View key={p.id} style={estilos.filaPedido}>
          <Ionicons name="restaurant-outline" size={14} color="#c05621" />
          <Text style={estilos.nombrePedido}>{p.nombre}</Text>
          <Text style={estilos.totalPedido}>{formatCUP(p.total)} CUP</Text>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: '#fffaf0', borderWidth: 1.5,
    borderColor: '#f6ad55', borderRadius: 14,
    padding: 16, marginHorizontal: 16, marginTop: 16,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  titulo: { fontSize: 15, fontWeight: 'bold', color: '#c05621' },
  texto: { fontSize: 13, color: '#7b341e', marginBottom: 10 },
  filaPedido: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#feebc8',
  },
  nombrePedido: { flex: 1, fontSize: 14, color: '#c05621', fontWeight: '600' },
  totalPedido: { fontSize: 14, fontWeight: 'bold', color: '#c05621' },
});