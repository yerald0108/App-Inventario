import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ItemCesta } from '../types';

interface Props {
  items: ItemCesta[];
  onCobrar: () => void;
}

export default function CestaFlotante({ items, onCobrar }: Props) {
  // No mostrar si la cesta está vacía
  if (items.length === 0) return null;

  // Calcular total general
  const total = items.reduce(
    (acc, item) => acc + item.producto.precio * item.cantidad,
    0
  );

  // Cantidad de productos distintos en la cesta
  const cantidadDistintos = items.length;

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.info}>
        <Text style={estilos.textoCantidad}>
          {cantidadDistintos} {cantidadDistintos === 1 ? 'producto' : 'productos'}
        </Text>
        <Text style={estilos.textoTotal}>{total.toFixed(2)} CUP</Text>
      </View>
      <TouchableOpacity style={estilos.botonCobrar} onPress={onCobrar}>
        <Text style={estilos.textoBotonCobrar}>COBRAR</Text>
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a2e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  info: {
    flex: 1,
  },
  textoCantidad: {
    color: '#a0aec0',
    fontSize: 13,
    marginBottom: 2,
  },
  textoTotal: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  botonCobrar: {
    backgroundColor: '#38a169',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  textoBotonCobrar: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});