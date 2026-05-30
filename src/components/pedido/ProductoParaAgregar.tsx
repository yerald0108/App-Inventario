import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Producto } from '../../types';
import { formatCUP } from '../../utils';

interface Props {
  producto: Producto;
  onAgregar: (producto: Producto, cantidad: number) => void;
}

export default function ProductoParaAgregar({ producto, onAgregar }: Props) {
  const [cantidad, setCantidad] = useState(1);
  const agotado = producto.existencia <= 0;
  const stockBajo = !agotado && producto.existencia < producto.alerta_minima;
  const colorStock = agotado ? '#e53e3e' : stockBajo ? '#d69e2e' : '#38a169';

  return (
    <View style={[estilos.tarjeta, agotado && estilos.tarjetaAgotada]}>
      <View style={estilos.info}>
        <Text style={estilos.nombre} numberOfLines={1}>{producto.nombre}</Text>
        <View style={estilos.fila}>
          <Text style={estilos.precio}>{formatCUP(producto.precio)} CUP</Text>
          <Text style={[estilos.stock, { color: colorStock }]}>
            {agotado ? '· Agotado' : `· Stock: ${producto.existencia}`}
          </Text>
        </View>
      </View>
      <View style={estilos.lado}>
        {!agotado && (
          <>
            <View style={estilos.controles}>
              <TouchableOpacity
                style={[estilos.botonCant, cantidad <= 1 && estilos.botonCantDeshabilitado]}
                onPress={() => setCantidad(Math.max(1, cantidad - 1))}
                disabled={cantidad <= 1}
              >
                <Text style={estilos.textoBotonCant}>−</Text>
              </TouchableOpacity>
              <Text style={estilos.textoCantidad}>{cantidad}</Text>
              <TouchableOpacity
                style={estilos.botonCant}
                onPress={() => setCantidad(Math.min(producto.existencia, cantidad + 1))}
              >
                <Text style={estilos.textoBotonCant}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={estilos.botonAgregar}
              onPress={() => { onAgregar(producto, cantidad); setCantidad(1); }}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
            </TouchableOpacity>
          </>
        )}
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
  tarjetaAgotada: { opacity: 0.5, backgroundColor: '#f8fafc' },
  info: { flex: 1, marginRight: 8 },
  nombre: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 3 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  precio: { fontSize: 13, color: '#2b6cb0', fontWeight: '700' },
  stock: { fontSize: 12, fontWeight: '600' },
  lado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  botonCant: {
    width: 28, height: 28, borderRadius: 7, backgroundColor: '#2b6cb0',
    alignItems: 'center', justifyContent: 'center',
  },
  botonCantDeshabilitado: { backgroundColor: '#cbd5e0' },
  textoBotonCant: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', lineHeight: 22 },
  textoCantidad: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', minWidth: 22, textAlign: 'center' },
  botonAgregar: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#38a169',
    alignItems: 'center', justifyContent: 'center',
  },
});