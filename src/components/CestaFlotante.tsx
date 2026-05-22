import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ItemCesta } from '../types';

interface Props {
  items: ItemCesta[];
  onCobrar: () => void;
  label?: string;
  showTotal?: boolean;
  procesando?: boolean;
}

export default function CestaFlotante({ 
  items, 
  onCobrar, 
  label = 'COBRAR', 
  showTotal = true,
  procesando = false
}: Props) {
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
        {showTotal && <Text style={estilos.textoTotal}>{total.toFixed(2)} CUP</Text>}
      </View>
      <TouchableOpacity 
        style={[estilos.botonCobrar, procesando && estilos.botonDeshabilitado]} 
        onPress={onCobrar}
        disabled={procesando}
      >
        <View style={estilos.filaBoton}>
          {procesando && <ActivityIndicator size="small" color="#ffffff" style={estilos.spinner} />}
          <Text style={estilos.textoBotonCobrar}>
            {procesando ? 'PROCESANDO...' : label}
          </Text>
        </View>
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
  botonDeshabilitado: {
    backgroundColor: '#2f855a',
    opacity: 0.7,
  },
  filaBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spinner: {
    marginRight: 4,
  },
  textoBotonCobrar: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});