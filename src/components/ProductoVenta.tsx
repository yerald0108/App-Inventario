import { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, Animated
} from 'react-native';
import { Producto } from '../types';

interface Props {
  producto: Producto;
  cantidadEnCesta: number;
  precioFinal: number;
  precioModificado: boolean;
  onCambiarCantidad: (cantidad: number) => void;
  onCambiarPrecio: (precio: number) => void;
}

export default function ProductoVenta({ 
  producto, 
  cantidadEnCesta, 
  precioFinal,
  precioModificado,
  onCambiarCantidad, 
  onCambiarPrecio 
}: Props) {
  const [editandoCantidad, setEditandoCantidad] = useState(false);
  const [valorCantidadInput, setValorCantidadInput] = useState('');
  const [editandoPrecio, setEditandoPrecio] = useState(false);
  const [valorPrecioInput, setValorPrecioInput] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const agotado = producto.existencia <= 0;
  const colorStock = agotado ? '#e53e3e' : (producto.existencia < producto.alerta_minima ? '#e53e3e' : '#38a169');
  const enCesta = cantidadEnCesta > 0;

  useEffect(() => {
    if (enCesta && !editandoPrecio) {
      setValorPrecioInput(precioFinal.toFixed(2));
    }
  }, [precioFinal, enCesta, editandoPrecio]);

  function ejecutarShake() {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 40, useNativeDriver: true }),
    ]).start();
  }

  function incrementar() {
    if (cantidadEnCesta < producto.existencia) {
      onCambiarCantidad(cantidadEnCesta + 1);
    } else {
      ejecutarShake();
    }
  }

  function decrementar() {
    if (cantidadEnCesta > 0) {
      onCambiarCantidad(cantidadEnCesta - 1);
    }
  }

  function abrirInputCantidad() {
    if (agotado) return;
    setValorCantidadInput(cantidadEnCesta > 0 ? cantidadEnCesta.toString() : '');
    setEditandoCantidad(true);
  }

  function confirmarInputCantidad() {
    const num = parseInt(valorCantidadInput, 10);
    if (!isNaN(num) && num >= 0 && num <= producto.existencia) {
      onCambiarCantidad(num);
    }
    setEditandoCantidad(false);
  }

  function abrirInputPrecio() {
    if (!enCesta) return; // Solo editar si ya está en la cesta
    setValorPrecioInput(precioFinal.toFixed(2));
    setEditandoPrecio(true);
  }

  function confirmarInputPrecio() {
    const num = parseFloat(valorPrecioInput.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      onCambiarPrecio(num);
    } else {
      // Si el valor no es válido, revertir al precio original del producto
      onCambiarPrecio(producto.precio);
    }
    setEditandoPrecio(false);
  }

  return (
    <View style={[
      estilos.tarjeta, 
      enCesta && estilos.tarjetaActiva,
      agotado && estilos.tarjetaAgotada
    ]}>
      <View style={estilos.infoProducto}>
        <Text style={[estilos.nombre, agotado && estilos.textoGris]} numberOfLines={1}>
          {producto.nombre}
        </Text>
        <View style={estilos.filaInferior}>
          {editandoPrecio ? (
            <TextInput
              style={[estilos.precio, estilos.inputPrecio]}
              value={valorPrecioInput}
              onChangeText={setValorPrecioInput}
              keyboardType="numeric"
              autoFocus
              onBlur={confirmarInputPrecio}
              onSubmitEditing={confirmarInputPrecio}
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity onPress={abrirInputPrecio} disabled={!enCesta}>
              <Text style={[
                estilos.precio, 
                agotado && estilos.textoGris,
                precioModificado && estilos.precioModificado
              ]}>
                {precioFinal.toFixed(2)} CUP
              </Text>
            </TouchableOpacity>
          )}
          <Text style={[estilos.stock, { color: colorStock }]}>
            {agotado ? 'Agotado' : `Stock: ${producto.existencia}`}
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          estilos.controles,
          { transform: [{ translateX: shakeAnim }] }
        ]}
      >
        <TouchableOpacity
          style={[estilos.botonControl, cantidadEnCesta === 0 && estilos.botonDeshabilitado]}
          onPress={decrementar}
          disabled={cantidadEnCesta === 0}
          activeOpacity={0.7}
        >
          <Text style={estilos.textoControl}>−</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={abrirInputCantidad} 
          style={estilos.cantidadTouchable}
          disabled={agotado}
        >
          {editandoCantidad ? (
            <TextInput
              style={estilos.inputCantidad}
              value={valorCantidadInput}
              onChangeText={setValorCantidadInput}
              keyboardType="number-pad"
              autoFocus
              onBlur={confirmarInputCantidad}
              onSubmitEditing={confirmarInputCantidad}
              maxLength={3}
            />
          ) : (
            <Text style={[
              estilos.cantidad, 
              enCesta && estilos.cantidadActiva,
              agotado && estilos.textoGris
            ]}>
              {cantidadEnCesta}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            estilos.botonControl,
            agotado && estilos.botonDeshabilitado,
            (!agotado && cantidadEnCesta >= producto.existencia) && estilos.botonLimite
          ]}
          onPress={incrementar}
          disabled={agotado}
          activeOpacity={0.7}
        >
          <Text style={estilos.textoControl}>+</Text>
        </TouchableOpacity>
      </Animated.View>
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
  tarjetaAgotada: {
    backgroundColor: '#f8fafc',
    opacity: 0.8,
  },
  textoGris: {
    color: '#a0aec0',
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
    alignItems: 'center',
    gap: 12,
  },
  precio: {
    fontSize: 14,
    color: '#2b6cb0',
    fontWeight: '500',
  },
  inputPrecio: {
    borderBottomWidth: 1,
    borderBottomColor: '#2b6cb0',
    paddingVertical: 0, 
    minWidth: 60, 
  },
  precioModificado: {
    color: '#dd6b20', // Naranja para indicar que fue modificado
    fontWeight: 'bold',
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
  botonLimite: {
    backgroundColor: '#dd6b20',
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
