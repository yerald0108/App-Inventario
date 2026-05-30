import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductoDespacho } from '../../database/despachos';
import { formatCUP } from '../../utils';

interface Props {
  producto: ProductoDespacho;
  despachoId: number;
  color: string;
  onAgregar: (producto: ProductoDespacho, despachoId: number, cantidad: number) => void;
}

export default function ProductoDespachoParaAgregar({ producto, despachoId, color, onAgregar }: Props) {
  const [cantidad, setCantidad] = useState(1);

  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.info}>
        <Text style={estilos.nombre} numberOfLines={1}>{producto.nombre}</Text>
        <Text style={[estilos.precio, { color }]}>{formatCUP(producto.precio)} CUP</Text>
      </View>
      <View style={estilos.lado}>
        <View style={estilos.controles}>
          <TouchableOpacity
            style={[estilos.botonCant, { backgroundColor: cantidad <= 1 ? '#cbd5e0' : color }]}
            onPress={() => setCantidad(Math.max(1, cantidad - 1))}
            disabled={cantidad <= 1}
          >
            <Text style={estilos.textoBotonCant}>−</Text>
          </TouchableOpacity>
          <Text style={estilos.textoCantidad}>{cantidad}</Text>
          <TouchableOpacity
            style={[estilos.botonCant, { backgroundColor: color }]}
            onPress={() => setCantidad(cantidad + 1)}
          >
            <Text style={estilos.textoBotonCant}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[estilos.botonAgregar, { backgroundColor: color }]}
          onPress={() => { onAgregar(producto, despachoId, cantidad); setCantidad(1); }}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#edf2f7',
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2,
  },
  info: { flex: 1, marginRight: 8 },
  nombre: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 3 },
  precio: { fontSize: 13, fontWeight: '700' },
  lado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  botonCant: {
    width: 28, height: 28, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  textoBotonCant: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', lineHeight: 22 },
  textoCantidad: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', minWidth: 22, textAlign: 'center' },
  botonAgregar: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});