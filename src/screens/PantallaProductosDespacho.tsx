import { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, ScrollView,
  Animated, Pressable, PanResponder, Platform, KeyboardAvoidingView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import {
  ProductoDespacho,
  obtenerProductosDespacho,
  crearProductoDespacho,
  actualizarProductoDespacho,
  eliminarProductoDespacho,
} from '../database/despachos';
import EstadoVacio from '../components/EstadoVacio';

type Props = {
  route: RouteProp<RootStackParamList, 'ProductosDespacho'>;
};

export default function PantallaProductosDespacho({ route }: Props) {
  const { despachoId, despachoNombre } = route.params;
  const [productos, setProductos] = useState<ProductoDespacho[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [productoEditando, setProductoEditando] = useState<ProductoDespacho | null>(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => { if (g.dy > 0) slideAnim.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 150 || g.vy > 0.5) {
          Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }).start(cerrarModal);
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
        }
      },
    })
  ).current;

  useFocusEffect(
    useCallback(() => {
      cargarProductos();
    }, [])
  );

  async function cargarProductos() {
    setCargando(true);
    try {
      const lista = await obtenerProductosDespacho(despachoId);
      setProductos(lista);
    } finally {
      setCargando(false);
    }
  }

  function abrirCrear() {
    setProductoEditando(null);
    setNombre('');
    setPrecio('');
    setModalVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
  }

  function abrirEditar(producto: ProductoDespacho) {
    setProductoEditando(producto);
    setNombre(producto.nombre);
    setPrecio(producto.precio.toString());
    setModalVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
  }

  function cerrarModal() {
    setModalVisible(false);
    setProductoEditando(null);
  }

  async function handleGuardar() {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del producto es obligatorio.');
      return;
    }
    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      Alert.alert('Error', 'El precio debe ser mayor que 0.');
      return;
    }
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);

    try {
      if (productoEditando) {
        await actualizarProductoDespacho(productoEditando.id, nombre.trim(), precioNum);
      } else {
        await crearProductoDespacho(despachoId, nombre.trim(), precioNum);
      }
      cerrarModal();
      await cargarProductos();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el producto.');
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }

  function confirmarEliminar(producto: ProductoDespacho) {
    Alert.alert(
      '¿Eliminar producto?',
      `"${producto.nombre}" será eliminado del catálogo de ${despachoNombre}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await eliminarProductoDespacho(producto.id);
            await cargarProductos();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      <View style={estilos.banner}>
        <Ionicons name="cube-outline" size={15} color="#6b46c1" />
        <Text style={estilos.textoBanner}>
          Catálogo de {despachoNombre} · {productos.length} productos
        </Text>
      </View>

      {cargando ? (
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#805ad5" />
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={estilos.tarjeta}>
              <View style={estilos.infoProducto}>
                <Text style={estilos.nombreProducto}>{item.nombre}</Text>
                <Text style={estilos.precioProducto}>{item.precio.toFixed(2)} CUP</Text>
              </View>
              <View style={estilos.botonesProducto}>
                <TouchableOpacity
                  style={estilos.botonEditar}
                  onPress={() => abrirEditar(item)}
                >
                  <Ionicons name="pencil-outline" size={16} color="#2b6cb0" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={estilos.botonEliminar}
                  onPress={() => confirmarEliminar(item)}
                >
                  <Ionicons name="trash-outline" size={16} color="#e53e3e" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EstadoVacio
              icono="cube-outline"
              titulo="Sin productos"
              descripcion={`Agrega los productos de ${despachoNombre}\npara agilizar las ventas.`}
            />
          }
        />
      )}

      <TouchableOpacity style={estilos.fab} onPress={abrirCrear}>
        <Text style={estilos.textoFab}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={estilos.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={cerrarModal} />
          <Animated.View style={[estilos.modal, { transform: [{ translateY: slideAnim }] }]}>
            <View style={estilos.barraArrastre} {...panResponder.panHandlers} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={estilos.tituloModal}>
                {productoEditando ? 'Editar producto' : 'Nuevo producto'}
              </Text>
              <Text style={estilos.subtituloModal}>{despachoNombre}</Text>

              <Text style={estilos.etiqueta}>Nombre del producto *</Text>
              <TextInput
                style={estilos.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Cerveza Bucanero"
                placeholderTextColor="#a0aec0"
                autoCapitalize="words"
              />

              <Text style={estilos.etiqueta}>Precio</Text>
              <View style={estilos.contenedorInputSufijo}>
                <TextInput
                  style={estilos.inputSufijo}
                  value={precio}
                  onChangeText={setPrecio}
                  placeholder="0.00"
                  placeholderTextColor="#a0aec0"
                  keyboardType="numeric"
                />
                <Text style={estilos.sufijo}>CUP</Text>
              </View>

              <TouchableOpacity
                style={[estilos.botonGuardar, guardando && { opacity: 0.7 }]}
                onPress={handleGuardar}
                disabled={guardando}
              >
                {guardando
                  ? <ActivityIndicator size="small" color="#ffffff" />
                  : <Text style={estilos.textoBotonGuardar}>
                      {productoEditando ? 'GUARDAR CAMBIOS' : 'AGREGAR PRODUCTO'}
                    </Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={estilos.botonCancelar} onPress={cerrarModal}>
                <Text style={estilos.textoBotonCancelar}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f7fafc' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#faf5ff', borderBottomWidth: 1,
    borderBottomColor: '#e9d8fd', paddingHorizontal: 16, paddingVertical: 10,
  },
  textoBanner: { fontSize: 13, color: '#6b46c1', fontWeight: '600' },
  tarjeta: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
    borderWidth: 1, borderColor: '#edf2f7',
  },
  infoProducto: { flex: 1 },
  nombreProducto: { fontSize: 17, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 2 },
  precioProducto: { fontSize: 14, color: '#805ad5', fontWeight: '600' },
  botonesProducto: { flexDirection: 'row', gap: 8 },
  botonEditar: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#ebf8ff', alignItems: 'center', justifyContent: 'center',
  },
  botonEliminar: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#fff5f5', alignItems: 'center', justifyContent: 'center',
  },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#805ad5', alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#805ad5',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6,
  },
  textoFab: { color: '#ffffff', fontSize: 32, fontWeight: 'bold', lineHeight: 36 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12, maxHeight: '90%', elevation: 20,
  },
  barraArrastre: {
    width: 40, height: 5, backgroundColor: '#e2e8f0',
    borderRadius: 3, alignSelf: 'center', marginBottom: 16,
  },
  tituloModal: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', textAlign: 'center', marginBottom: 4 },
  subtituloModal: { fontSize: 14, color: '#805ad5', textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  etiqueta: { fontSize: 15, fontWeight: '600', color: '#4a5568', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#cbd5e0', borderRadius: 10,
    padding: 14, fontSize: 16, color: '#1a1a2e', backgroundColor: '#f7fafc',
  },
  contenedorInputSufijo: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderColor: '#cbd5e0', borderRadius: 10, backgroundColor: '#f7fafc', paddingRight: 14,
  },
  inputSufijo: { flex: 1, padding: 14, fontSize: 16, color: '#1a1a2e' },
  sufijo: { fontSize: 14, color: '#a0aec0', fontWeight: 'bold' },
  botonGuardar: {
    backgroundColor: '#805ad5', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  textoBotonGuardar: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  botonCancelar: { padding: 16, alignItems: 'center', marginBottom: 8 },
  textoBotonCancelar: { color: '#718096', fontSize: 16 },
});