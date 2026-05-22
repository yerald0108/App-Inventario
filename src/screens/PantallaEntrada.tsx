import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, TextInput, Modal,
  Animated, Pressable, PanResponder, KeyboardAvoidingView, Platform,
  LayoutAnimation
} from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Producto } from '../types';
import { obtenerProductos } from '../database/productos';
import { registrarEntrada } from '../database/entradas';
import { obtenerOCrearTurno } from '../database/turnos';
import { Ionicons } from '@expo/vector-icons';
import Skeleton from '../components/Skeleton';
import EstadoVacio from '../components/EstadoVacio';

export default function PantallaEntrada() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) slideAnim.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          Animated.timing(slideAnim, {
            toValue: 600,
            duration: 200,
            useNativeDriver: true,
          }).start(cerrarModal);
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
    if (modalVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();
    } else {
      slideAnim.setValue(600);
    }
  }, [modalVisible]);

  useFocusEffect(
    useCallback(() => {
      cargarProductos();
    }, [])
  );

  async function cargarProductos() {
    if (productos.length === 0) setCargando(true);
    const lista = await obtenerProductos();
    setProductos(lista);
    setProductosFiltrados(lista);
    setCargando(false);
  }

  // Filtrar productos
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (busqueda.trim() === '') {
      setProductosFiltrados(productos);
    } else {
      const termino = busqueda.toLowerCase();
      setProductosFiltrados(productos.filter(p => p.nombre.toLowerCase().includes(termino)));
    }
  }, [busqueda, productos]);

  function abrirModal(producto: Producto) {
    setProductoSeleccionado(producto);
    setCantidad('');
    setModalVisible(true);
  }

  function cerrarModal() {
    setModalVisible(false);
    setProductoSeleccionado(null);
    setCantidad('');
  }

  async function confirmarEntrada() {
    if (!productoSeleccionado) return;

    const cantidadNum = parseInt(cantidad, 10);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor que 0.');
      return;
    }

    if (procesando) return;
    setProcesando(true);

    try {
      const turnoId = await obtenerOCrearTurno();
      await registrarEntrada(productoSeleccionado.id, cantidadNum, turnoId);
      await cargarProductos();
      cerrarModal();
      
      Toast.show({
        type: 'success',
        text1: 'Entrada registrada',
        text2: `Se agregaron ${cantidadNum} unidades de ${productoSeleccionado.nombre}.`,
        position: 'top',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo registrar la entrada.',
        position: 'top',
      });
      console.error(error);
    } finally {
      setProcesando(false);
    }
  }

  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={estilos.skeletonCard}>
          <Skeleton width="60%" height={20} style={{ marginBottom: 10 }} />
          <Skeleton width="40%" height={16} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      <View style={estilos.contenedorBusqueda}>
        <Ionicons name="search" size={20} color="#718096" style={estilos.iconoBusqueda} />
        <TextInput
          style={estilos.inputBusqueda}
          placeholder="Buscar producto para entrada..."
          placeholderTextColor="#a0aec0"
          value={busqueda}
          onChangeText={setBusqueda}
          clearButtonMode="while-editing"
        />
      </View>

      {cargando ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const colorStock = item.existencia < item.alerta_minima ? '#e53e3e' : '#38a169';
            return (
              <TouchableOpacity
                style={estilos.tarjeta}
                onPress={() => abrirModal(item)}
              >
                <View style={estilos.filaProducto}>
                  <Text style={estilos.nombre} numberOfLines={1}>{item.nombre}</Text>
                  <Text style={[estilos.stock, { color: colorStock }]}>
                    {item.existencia} unid.
                  </Text>
                </View>
                <Text style={estilos.precio}>{item.precio.toFixed(2)} CUP</Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            busqueda !== '' ? (
              <EstadoVacio 
                icono="search-outline" 
                titulo="Sin resultados" 
                descripcion={`No encontramos nada que coincida con "${busqueda}"`} 
              />
            ) : (
              <EstadoVacio 
                icono="download-outline" 
                titulo="Sin productos" 
                descripcion="Agrega productos en Inventario para registrar entradas." 
              />
            )
          }
        />
      )}

      {/* Modal mejorado con deslizamiento */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={estilos.overlayModal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={estilos.dismissArea} onPress={cerrarModal} />
          
          <Animated.View 
            style={[
              estilos.modal,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={estilos.barraArrastre} {...panResponder.panHandlers} />
            
            <Text style={estilos.tituloModal}>Entrada de mercancía</Text>
            <Text style={estilos.nombreModal}>
              {productoSeleccionado?.nombre}
            </Text>
            <Text style={estilos.stockActual}>
              Stock actual: {productoSeleccionado?.existencia} unidades
            </Text>

            <Text style={estilos.etiqueta}>Cantidad a agregar</Text>
            <TextInput
              style={estilos.input}
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="number-pad"
              placeholder="Ej: 24"
              placeholderTextColor="#a0aec0"
              autoFocus
              maxLength={5}
            />

            {/* Vista previa del nuevo stock */}
            {cantidad !== '' && !isNaN(parseInt(cantidad, 10)) && (
              <Text style={estilos.previa}>
                Nuevo stock: {(productoSeleccionado?.existencia ?? 0) + parseInt(cantidad, 10)} unidades
              </Text>
            )}

            <TouchableOpacity
              style={[estilos.botonConfirmar, procesando && estilos.botonDeshabilitado]}
              onPress={confirmarEntrada}
              disabled={procesando}
            >
              <Text style={estilos.textoBotonConfirmar}>
                {procesando ? 'Registrando...' : 'CONFIRMAR ENTRADA'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={estilos.botonCancelar} onPress={cerrarModal}>
              <Text style={estilos.textoBotonCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  contenedorBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconoBusqueda: {
    marginRight: 8,
  },
  inputBusqueda: {
    flex: 1,
    fontSize: 16,
    color: '#2d3748',
  },
  tarjeta: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filaProducto: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
  },
  stock: {
    fontSize: 14,
    fontWeight: '700',
  },
  precio: {
    fontSize: 14,
    color: '#718096',
  },
  overlayModal: {
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
  tituloModal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 8,
  },
  nombreModal: {
    fontSize: 18,
    color: '#2b6cb0',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  stockActual: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 20,
  },
  etiqueta: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#cbd5e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: '#2d3748',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  previa: {
    fontSize: 14,
    color: '#38a169',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  botonConfirmar: {
    backgroundColor: '#2b6cb0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  botonDeshabilitado: {
    backgroundColor: '#a0aec0',
  },
  textoBotonConfirmar: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botonCancelar: {
    padding: 12,
    alignItems: 'center',
  },
  textoBotonCancelar: {
    color: '#718096',
    fontSize: 15,
    fontWeight: '600',
  },
  textoVacio: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  skeletonCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
});