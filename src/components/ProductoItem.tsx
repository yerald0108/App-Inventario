import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Producto } from '../types';

interface Props {
  producto: Producto;
  onEditar: (producto: Producto) => void;
}

export default function ProductoItem({ producto, onEditar }: Props) {
  const esStockBajo = producto.existencia < producto.alerta_minima;
  const colorStock = esStockBajo ? '#e53e3e' : '#38a169';
  const bgColorStock = esStockBajo ? '#fff5f5' : '#f0fff4';

  const tieneCosto = producto.precio_costo > 0;
  const margenPct = tieneCosto
    ? (((producto.precio - producto.precio_costo) / producto.precio) * 100).toFixed(1)
    : null;

  return (
    <TouchableOpacity style={estilos.tarjeta} onPress={() => onEditar(producto)}>
      <View style={estilos.fila}>
        <View style={estilos.infoProducto}>
          <Text style={estilos.nombre} numberOfLines={1}>{producto.nombre}</Text>
          <View style={estilos.filaInferior}>
            <View style={[estilos.badge, { backgroundColor: bgColorStock }]}>
              <Ionicons
                name={esStockBajo ? 'warning' : 'checkmark-circle'}
                size={12}
                color={colorStock}
              />
              <Text style={[estilos.textoBadge, { color: colorStock }]}>
                {producto.existencia} unidades
              </Text>
            </View>
            {margenPct !== null && (
              <View style={estilos.badgeMargen}>
                <Text style={estilos.textoMargen}>Mrg {margenPct}%</Text>
              </View>
            )}
          </View>
        </View>
        <View style={estilos.derecha}>
          <Text style={estilos.precio}>{producto.precio.toFixed(2)}</Text>
          <Text style={estilos.moneda}>CUP</Text>
          {tieneCosto && (
            <Text style={estilos.costo}>
              costo {producto.precio_costo.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoProducto: { flex: 1, marginRight: 12 },
  nombre: {
    fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 6,
  },
  filaInferior: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, alignSelf: 'flex-start', gap: 4,
  },
  textoBadge: { fontSize: 12, fontWeight: 'bold' },
  badgeMargen: {
    backgroundColor: '#ebf8ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  textoMargen: {
    fontSize: 12, fontWeight: 'bold', color: '#2b6cb0',
  },
  derecha: { alignItems: 'flex-end' },
  precio: { fontSize: 20, fontWeight: '800', color: '#2b6cb0' },
  moneda: { fontSize: 11, color: '#718096', fontWeight: 'bold', marginTop: -2 },
  costo: { fontSize: 11, color: '#a0aec0', marginTop: 2 },
});