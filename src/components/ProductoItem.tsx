import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Producto } from '../types';

interface Props {
  producto: Producto;
  onEditar: (producto: Producto) => void;
}

export default function ProductoItem({ producto, onEditar }: Props) {
  // Verde si stock ok, rojo si stock bajo
  const colorStock = producto.existencia >= producto.alerta_minima ? '#38a169' : '#e53e3e';
  const etiquetaStock = producto.existencia < producto.alerta_minima ? '⚠️ Stock bajo' : '✅ Stock ok';

  return (
    <TouchableOpacity style={estilos.tarjeta} onPress={() => onEditar(producto)}>
      <View style={estilos.fila}>
        <Text style={estilos.nombre} numberOfLines={1}>{producto.nombre}</Text>
        <Text style={estilos.precio}>{producto.precio.toFixed(2)} CUP</Text>
      </View>
      <View style={estilos.fila}>
        <Text style={[estilos.stock, { color: colorStock }]}>
          {etiquetaStock} — {producto.existencia} unid.
        </Text>
        <Text style={estilos.alerta}>Alerta: &lt;{producto.alerta_minima}</Text>
      </View>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nombre: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  precio: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2b6cb0',
  },
  stock: {
    fontSize: 14,
    fontWeight: '500',
  },
  alerta: {
    fontSize: 12,
    color: '#a0aec0',
  },
});