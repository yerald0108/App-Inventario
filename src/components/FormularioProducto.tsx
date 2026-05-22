import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Animated, Pressable, PanResponder
} from 'react-native';
import { Producto } from '../types';

interface Props {
  visible: boolean;
  producto: Producto | null; // null = modo crear, Producto = modo editar
  onGuardar: (datos: {
    nombre: string;
    precio: number;
    existencia: number;
    alerta_minima: number;
  }) => void;
  onCancelar: () => void;
  onEliminar?: () => void;
}

export default function FormularioProducto({
  visible, producto, onGuardar, onCancelar, onEliminar
}: Props) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [existencia, setExistencia] = useState('');
  const [alertaMinima, setAlertaMinima] = useState('5');
  const slideAnim = useRef(new Animated.Value(600)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          Animated.timing(slideAnim, {
            toValue: 600,
            duration: 200,
            useNativeDriver: true,
          }).start(onCancelar);
        } else {
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
        friction: 8
      }).start();
    } else {
      slideAnim.setValue(600);
    }
  }, [visible]);

  // Cargar datos del producto al abrir en modo edición
    useEffect(() => {
        if (producto) {
        setNombre(producto.nombre ?? '');
        setPrecio(producto.precio != null ? producto.precio.toString() : '');
        setExistencia(producto.existencia != null ? producto.existencia.toString() : '');
        setAlertaMinima(producto.alerta_minima != null ? producto.alerta_minima.toString() : '5');
    } else {
        setNombre('');
        setPrecio('');
        setExistencia('');
        setAlertaMinima('5');
    }
    }, [producto, visible]);

  function validarYGuardar() {
    // Validar nombre
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del producto es obligatorio.');
      return;
    }

    // Validar precio
    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      Alert.alert('Error', 'El precio debe ser mayor que 0.');
      return;
    }

    // Validar existencia
    const existenciaNum = parseFloat(existencia);
    if (isNaN(existenciaNum) || existenciaNum < 0) {
      Alert.alert('Error', 'La existencia no puede ser negativa.');
      return;
    }

    // Validar alerta mínima
    const alertaNum = parseFloat(alertaMinima);
    if (isNaN(alertaNum) || alertaNum < 0) {
      Alert.alert('Error', 'La alerta mínima no puede ser negativa.');
      return;
    }

    onGuardar({
      nombre: nombre.trim(),
      precio: precioNum,
      existencia: existenciaNum,
      alerta_minima: alertaNum,
    });
  }

  function confirmarEliminar() {
    Alert.alert(
      '¿Eliminar producto?',
      `Esta acción borrará definitivamente "${nombre}" y no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar ahora', 
          style: 'destructive', 
          onPress: onEliminar 
        },
      ]
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView
        style={estilos.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={estilos.dismissArea} onPress={onCancelar} />
        
        <Animated.View 
          style={[
            estilos.modal,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={estilos.barraArrastre} {...panResponder.panHandlers} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={estilos.titulo}>
              {producto ? 'Editar producto' : 'Nuevo producto'}
            </Text>

            <Text style={estilos.etiqueta}>Nombre</Text>
            <TextInput
              style={estilos.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: Cerveza 260ml"
              placeholderTextColor="#a0aec0"
              autoCapitalize="words"
            />

            <Text style={estilos.etiqueta}>Precio (CUP)</Text>
            <TextInput
              style={estilos.input}
              value={precio}
              onChangeText={setPrecio}
              placeholder="Ej: 45"
              placeholderTextColor="#a0aec0"
              keyboardType="numeric"
            />

            <Text style={estilos.etiqueta}>Existencia actual</Text>
            <TextInput
              style={estilos.input}
              value={existencia}
              onChangeText={setExistencia}
              placeholder="Ej: 24"
              placeholderTextColor="#a0aec0"
              keyboardType="numeric"
            />

            <Text style={estilos.etiqueta}>Alerta mínima de stock</Text>
            <TextInput
              style={estilos.input}
              value={alertaMinima}
              onChangeText={setAlertaMinima}
              placeholder="Ej: 5"
              placeholderTextColor="#a0aec0"
              keyboardType="numeric"
            />

            {/* Botón guardar */}
            <TouchableOpacity style={estilos.botonGuardar} onPress={validarYGuardar}>
              <Text style={estilos.textoBotonGuardar}>
                {producto ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
              </Text>
            </TouchableOpacity>

            {/* Botón eliminar — solo en modo edición */}
            {producto && onEliminar && (
              <TouchableOpacity style={estilos.botonEliminar} onPress={confirmarEliminar}>
                <Text style={estilos.textoBotonEliminar}>ELIMINAR PRODUCTO</Text>
              </TouchableOpacity>
            )}

            {/* Botón cancelar */}
            <TouchableOpacity style={estilos.botonCancelar} onPress={onCancelar}>
              <Text style={estilos.textoBotonCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
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
  modal: {
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
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 20,
    textAlign: 'center',
  },
  etiqueta: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#cbd5e0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1a1a2e',
    backgroundColor: '#f7fafc',
  },
  botonGuardar: {
    backgroundColor: '#2b6cb0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  textoBotonGuardar: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botonEliminar: {
    backgroundColor: '#fff5f5',
    borderWidth: 1.5,
    borderColor: '#e53e3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  textoBotonEliminar: {
    color: '#e53e3e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botonCancelar: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  textoBotonCancelar: {
    color: '#718096',
    fontSize: 16,
  },
});