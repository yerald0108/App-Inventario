import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Producto } from '../types';

interface Props {
  producto: Producto;
  cantidadEnCesta: number;
  onCambiarCantidad: (cantidad: number) => void;
}

export default function ProductoVenta({ producto, cantidadEnCesta, onCambiarCantidad }: Props) {
  const [editando, setEditando] = useState(false);
  const [valorInput, setValorInput] = useState('');

  const colorStock = producto.existencia < producto.alerta_minima ? '#e53e3e' : '#38a169';
  const enCesta = cantidadEnCesta > 0;

  function incrementar() {
    if (cantidadEnCesta < producto.existencia) {
      onCambiarCantidad(cantidadEnCesta + 1);
    }
  }

  function decrementar() {
    if (cantidadEnCesta > 0) {
      onCambiarCantidad(cantidadEnCesta - 1);
    }
  }

  function abrirInput() {
    setValorInput(cantidadEnCesta > 0 ? cantidadEnCesta.toString() : '');
    setEditando(true);
  }

  function confirmarInput() {
    const num = parseInt(valorInput, 10);
    if (!isNaN(num) && num >= 0 && num <= producto.existencia) {
      onCambiarCantidad(num);
    }
    setEditando(false);
  }

  return (
    <View style={[estilos.tarjeta, enCesta && estilos.tarjetaActiva]}>
      {/* Info del producto */}
      <View style={estilos.infoProducto}>
        <Text style={estilos.nombre} numberOfLines={1}>{producto.nombre}</Text>
        <View style={estilos.filaInferior}>
          <Text style={estilos.precio}>{producto.precio.toFixed(2)} CUP</Text>
          <Text style={[estilos.stock, { color: colorStock }]}>
            Stock: {producto.existencia}
          </Text>
        </View>
      </View>

      {/* Controles de cantidad */}
      <View style={estilos.controles}>
        <TouchableOpacity
          style={[estilos.botonControl, cantidadEnCesta === 0 && estilos.botonDeshabilitado]}
          onPress={decrementar}
          disabled={cantidadEnCesta === 0}
        >
          <Text style={estilos.textoControl}>−</Text>
        </TouchableOpacity>

        {/* Toca el número para editar directamente */}
        <TouchableOpacity onPress={abrirInput} style={estilos.cantidadTouchable}>
          {editando ? (
            <TextInput
              style={estilos.inputCantidad}
              value={valorInput}
              onChangeText={setValorInput}
              keyboardType="number-pad"
              autoFocus
              onBlur={confirmarInput}
              onSubmitEditing={confirmarInput}
              maxLength={3}
            />
          ) : (
            <Text style={[estilos.cantidad, enCesta && estilos.cantidadActiva]}>
              {cantidadEnCesta}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[estilos.botonControl, cantidadEnCesta >= producto.existencia && estilos.botonDeshabilitado]}
          onPress={incrementar}
          disabled={cantidadEnCesta >= producto.existencia}
        >
          <Text style={estilos.textoControl}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tarjetaActiva: {
    borderColor: '#2b6cb0',
    backgroundColor: '#ebf8ff',
  },
  infoProducto: {
    flex: 1,
    marginRight: 12,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  filaInferior: {
    flexDirection: 'row',
    gap: 12,
  },
  precio: {
    fontSize: 14,
    color: '#2b6cb0',
    fontWeight: '500',
  },
  stock: {
    fontSize: 14,
    fontWeight: '500',
  },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botonControl: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2b6cb0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDeshabilitado: {
    backgroundColor: '#cbd5e0',
  },
  textoControl: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  cantidadTouchable: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantidad: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#a0aec0',
    textAlign: 'center',
  },
  cantidadActiva: {
    color: '#1a1a2e',
  },
  inputCantidad: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textAlign: 'center',
    width: 40,
    borderBottomWidth: 2,
    borderBottomColor: '#2b6cb0',
    padding: 0,
  },
});