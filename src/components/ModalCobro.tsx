import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
  Animated, Pressable, PanResponder, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemCesta } from '../types';

interface Props {
  visible: boolean;
  items: ItemCesta[];
  onConfirmar: (
    metodoPago: 'efectivo' | 'transferencia',
    montoRecibido: number,
    cambio: number
  ) => void;
  onCancelar: () => void;
  procesando?: boolean;
  metodoPagoInicial?: 'efectivo' | 'transferencia'; // ← nueva prop, opcional
}

export default function ModalCobro({ 
  visible, 
  items, 
  onConfirmar, 
  onCancelar,
  procesando = false,
  metodoPagoInicial = 'efectivo', // ← añade con default
}: Props) {
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cambio, setCambio] = useState(0);
  const [errorMonto, setErrorMonto] = useState('');
  const slideAnim = useRef(new Animated.Value(600)).current;

  const total = items.reduce(
    (acc, item) => acc + item.producto.precio * item.cantidad,
    0
  );

  useEffect(() => {
    if (metodoPago === 'efectivo') {
      const recibido = parseFloat(montoRecibido);
      if (!isNaN(recibido)) {
        if (recibido < total) {
          setErrorMonto('Monto insuficiente para cubrir el total');
          setCambio(0);
        } else {
          setErrorMonto('');
          setCambio(recibido - total);
        }
      } else {
        setErrorMonto('');
        setCambio(0);
      }
    } else {
      setErrorMonto('');
    }
  }, [montoRecibido, metodoPago, total]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Solo responder si el movimiento es hacia abajo y es significativo
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          // Si se deslizó lo suficiente, cerrar
          Animated.timing(slideAnim, {
            toValue: 600,
            duration: 200,
            useNativeDriver: true,
          }).start(onCancelar);
        } else {
          // Si no, volver a la posición original
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
      setMontoRecibido('');
      setMetodoPago(metodoPagoInicial); // ← usa la prop
    } else {
      slideAnim.setValue(600);
    }
  }, [visible, metodoPagoInicial]);

  function handleTextChange(text: string) {
    // Solo permitir números y un punto decimal
    const filtered = text.replace(/[^0-9.]/g, '');
    // Evitar múltiples puntos decimales
    const parts = filtered.split('.');
    if (parts.length > 2) return;
    setMontoRecibido(filtered);
  }

  function formatMonto() {
    const num = parseFloat(montoRecibido);
    if (!isNaN(num)) {
      setMontoRecibido(num.toFixed(2));
    }
  }

  const botonDeshabilitado = procesando || (metodoPago === 'efectivo' && (montoRecibido === '' || parseFloat(montoRecibido) < total));

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView
        style={estilos.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={estilos.dismissArea} onPress={onCancelar} />
        
        <Animated.View 
          style={[
            estilos.contenedor,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={estilos.barraArrastre} {...panResponder.panHandlers} />
          
          <View style={estilos.cabecera}>
            <Text style={estilos.titulo}>Finalizar Venta</Text>
            <TouchableOpacity onPress={onCancelar} style={estilos.botonCerrar} disabled={procesando}>
              <Ionicons name="close" size={24} color="#a0aec0" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={estilos.scroll}>
            <View style={estilos.seccionTotal}>
              <Text style={estilos.etiquetaTotal}>TOTAL A PAGAR</Text>
              <Text style={estilos.valorTotal}>${total.toFixed(2)} CUP</Text>
            </View>

            <Text style={estilos.subtitulo}>Método de Pago</Text>
            <View style={estilos.gridMetodos}>
              <TouchableOpacity
                style={[
                  estilos.botonMetodo,
                  metodoPago === 'efectivo' && estilos.botonMetodoActivo
                ]}
                onPress={() => setMetodoPago('efectivo')}
                disabled={procesando}
              >
                <Ionicons 
                  name="cash" 
                  size={32} 
                  color={metodoPago === 'efectivo' ? '#ffffff' : '#38a169'} 
                />
                <Text style={[
                  estilos.textoMetodo,
                  metodoPago === 'efectivo' && estilos.textoMetodoActivo
                ]}>Efectivo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  estilos.botonMetodo,
                  metodoPago === 'transferencia' && estilos.botonMetodoActivo
                ]}
                onPress={() => setMetodoPago('transferencia')}
                disabled={procesando}
              >
                <Ionicons 
                  name="card" 
                  size={32} 
                  color={metodoPago === 'transferencia' ? '#ffffff' : '#2b6cb0'} 
                />
                <Text style={[
                  estilos.textoMetodo,
                  metodoPago === 'transferencia' && estilos.textoMetodoActivo
                ]}>Transferencia</Text>
              </TouchableOpacity>
            </View>

            {metodoPago === 'efectivo' && (
              <View style={estilos.seccionEfectivo}>
                <Text style={estilos.etiquetaInput}>Monto recibido</Text>
                <View style={estilos.contenedorInput}>
                  <TextInput
                    style={[estilos.inputEfectivo, errorMonto !== '' && estilos.inputError]}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={montoRecibido}
                    onChangeText={handleTextChange}
                    onBlur={formatMonto}
                    autoFocus
                    editable={!procesando}
                  />
                  <Text style={estilos.sufijoInput}>CUP</Text>
                </View>
                
                {errorMonto !== '' && (
                  <Text style={estilos.textoError}>{errorMonto}</Text>
                )}

                {cambio > 0 && (
                  <View style={estilos.contenedorCambio}>
                    <Text style={estilos.etiquetaCambio}>CAMBIO (VUELTO)</Text>
                    <Text style={estilos.valorCambio}>${cambio.toFixed(2)} CUP</Text>
                  </View>
                )}
              </View>
            )}

            <View style={estilos.resumenProductos}>
              <Text style={estilos.subtitulo}>Resumen ({items.length} productos)</Text>
              {items.map((item, index) => (
                <View key={index} style={estilos.filaProducto}>
                  <Text style={estilos.nombreProducto}>{item.cantidad}x {item.producto.nombre}</Text>
                  <Text style={estilos.precioProducto}>${(item.producto.precio * item.cantidad).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity 
            style={[estilos.botonConfirmar, botonDeshabilitado && estilos.botonDeshabilitado]}
            onPress={() => {
              const montoNum = metodoPago === 'efectivo' ? parseFloat(montoRecibido) : total;
              onConfirmar(metodoPago, montoNum, cambio);
            }}
            disabled={botonDeshabilitado}
          >
            <View style={estilos.filaBotonConfirmar}>
              {procesando && <ActivityIndicator size="small" color="#ffffff" />}
              <Text style={estilos.textoConfirmar}>
                {procesando ? 'PROCESANDO...' : 'CONFIRMAR COBRO'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  contenedor: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    maxHeight: '90%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  barraArrastre: {
    width: 40,
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  botonCerrar: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 20,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  scroll: {
    marginBottom: 20,
  },
  seccionTotal: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  etiquetaTotal: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  valorTotal: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1e293b',
  },
  subtitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 12,
  },
  gridMetodos: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  botonMetodo: {
    flex: 1,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  botonMetodoActivo: {
    borderColor: '#1e293b',
    backgroundColor: '#1e293b',
  },
  textoMetodo: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
  },
  textoMetodoActivo: {
    color: '#ffffff',
  },
  seccionEfectivo: {
    marginBottom: 24,
  },
  etiquetaInput: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  contenedorInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#cbd5e0',
    borderRadius: 12,
    backgroundColor: '#f7fafc',
    paddingRight: 16,
  },
  inputEfectivo: {
    flex: 1,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  sufijoInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a0aec0',
  },
  textoError: {
    color: '#e53e3e',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  contenedorCambio: {
    marginTop: 16,
    backgroundColor: '#f0fff4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c6f6d5',
    alignItems: 'center',
  },
  etiquetaCambio: {
    fontSize: 11,
    color: '#2f855a',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  valorCambio: {
    fontSize: 24,
    fontWeight: '900',
    color: '#22543d',
  },
  resumenProductos: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  filaProducto: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nombreProducto: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  precioProducto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  botonConfirmar: {
    backgroundColor: '#38a169',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#38a169',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  botonDeshabilitado: {
    backgroundColor: '#a0aec0',
    shadowOpacity: 0,
    elevation: 0,
  },
  filaBotonConfirmar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textoConfirmar: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});