import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, TextInput, Modal,
  Animated, Pressable, PanResponder, KeyboardAvoidingView, Platform,
  LayoutAnimation, ActivityIndicator,
  ScrollView
} from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Producto } from '../types';
import { crearProducto } from '../database/productos';
import { registrarEntrada } from '../database/entradas';
import { obtenerTurnoAbierto, obtenerDiaActivo } from '../database/turnos';
import { Ionicons } from '@expo/vector-icons';
import { SkeletonProducto } from '../components/Skeleton';
import EstadoVacio from '../components/EstadoVacio';
import { useProductos } from '../context/ProductosContext';

// ── Tipos de modal ────────────────────────────────────────────────────────────
type TipoModal = 'ninguno' | 'entrada' | 'nuevo_producto';

export default function PantallaEntrada() {
  const { productos, cargandoProductos, cargarProductos } = useProductos();
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');

  // Modal de entrada normal (producto existente)
  const [modalActivo, setModalActivo] = useState<TipoModal>('ninguno');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState('');

  // Modal de producto nuevo
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [precioNuevo, setPrecioNuevo] = useState('');
  const [cantidadNueva, setCantidadNueva] = useState('');

  const [procesando, setProcesando] = useState(false);
  const [ultimoProductoActualizado, setUltimoProductoActualizado] = useState<number | null>(null);
  const procesandoRef = useRef(false);
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

  // Animar modal al abrir
  useEffect(() => {
    if (modalActivo !== 'ninguno') {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();
    } else {
      slideAnim.setValue(600);
    }
  }, [modalActivo]);

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

  // ── Abrir / cerrar modales ────────────────────────────────────────────────

  function abrirModalEntrada(producto: Producto) {
    setProductoSeleccionado(producto);
    setCantidad('');
    setModalActivo('entrada');
  }

  function abrirModalNuevoProducto() {
    // Pre-rellenar el nombre si el usuario estaba buscando algo que no existe
    setNombreNuevo(busqueda.trim());
    setPrecioNuevo('');
    setCantidadNueva('');
    setModalActivo('nuevo_producto');
  }

  function cerrarModal() {
    setModalActivo('ninguno');
    setProductoSeleccionado(null);
    setCantidad('');
    setNombreNuevo('');
    setPrecioNuevo('');
    setCantidadNueva('');
  }

  // ── Confirmar entrada de producto existente ───────────────────────────────

  async function confirmarEntrada() {
    if (!productoSeleccionado) return;

    const cantidadNum = Number(cantidad);
    if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      Alert.alert('Error', 'La cantidad debe ser un número entero positivo.');
      return;
    }

    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setProcesando(true);

    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        Alert.alert('Error', 'No hay un turno abierto. Debes abrir uno antes de operar.');
        return;
      }

      const diaActivo = await obtenerDiaActivo(turno.id);
      await registrarEntrada(productoSeleccionado.id, cantidadNum, turno.id, diaActivo?.id ?? null);

      const idActualizado = productoSeleccionado.id;
      await cargarProductos();
      cerrarModal();

      setUltimoProductoActualizado(idActualizado);
      setTimeout(() => setUltimoProductoActualizado(null), 2000);

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
      procesandoRef.current = false;
      setProcesando(false);
    }
  }

  // ── Confirmar creación de producto nuevo + entrada ────────────────────────

  async function confirmarNuevoProducto() {
    const nombreTrimmed = nombreNuevo.trim();
    if (!nombreTrimmed) {
      Alert.alert('Error', 'El nombre del producto es obligatorio.');
      return;
    }

    const precioNum = parseFloat(precioNuevo);
    if (isNaN(precioNum) || precioNum <= 0) {
      Alert.alert('Error', 'El precio debe ser mayor que 0.');
      return;
    }

    const cantidadNum = parseInt(cantidadNueva, 10);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      Alert.alert('Error', 'La cantidad debe ser un número entero positivo.');
      return;
    }

    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setProcesando(true);

    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        Alert.alert('Error', 'No hay un turno abierto. Debes abrir uno antes de operar.');
        return;
      }

      // Creamos el producto con existencia=0 intencionalmente.
      // El stock real se aplica en registrarEntrada() para que
      // quede registrado en el historial de movimientos del turno.
      const nuevoId = await crearProducto(nombreTrimmed, precioNum, 0, 5);

      // 2. Registrar la entrada usando el id real, sin búsqueda por nombre
      const diaActivo = await obtenerDiaActivo(turno.id);
      await registrarEntrada(nuevoId, cantidadNum, turno.id, diaActivo?.id ?? null);
      
      setUltimoProductoActualizado(nuevoId);
      setTimeout(() => setUltimoProductoActualizado(null), 2000);

      await cargarProductos();
      cerrarModal();
      // Limpiar búsqueda para que el nuevo producto aparezca en la lista
      setBusqueda('');

      Toast.show({
        type: 'success',
        text1: '¡Producto creado!',
        text2: `"${nombreTrimmed}" agregado al inventario con ${cantidadNum} unidades.`,
        position: 'top',
        visibilityTime: 4000,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo crear el producto.',
        position: 'top',
      });
      console.error(error);
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────

  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonProducto key={i} />
      ))}
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>

      {/* Barra de búsqueda + botón nuevo producto */}
      <View style={estilos.filaBusqueda}>
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
        <TouchableOpacity style={estilos.botonNuevo} onPress={abrirModalNuevoProducto}>
          <Ionicons name="add" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Sugerencia cuando no hay resultados */}
      {!cargandoProductos && busqueda.trim() !== '' && productosFiltrados.length === 0 && (
        <TouchableOpacity style={estilos.sugerenciaNuevo} onPress={abrirModalNuevoProducto}>
          <Ionicons name="add-circle-outline" size={18} color="#d69e2e" />
          <Text style={estilos.textoSugerencia}>
            "{busqueda.trim()}" no existe · <Text style={estilos.textoSugerenciaEnlace}>Crear y agregar al inventario</Text>
          </Text>
        </TouchableOpacity>
      )}

      {cargandoProductos ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item) => item.id.toString()}
          windowSize={11}
          renderItem={({ item }) => {
            const colorStock = item.existencia < item.alerta_minima ? '#e53e3e' : '#38a169';
            const esReciente = item.id === ultimoProductoActualizado;
            return (
              <TouchableOpacity
                style={[estilos.tarjeta, esReciente && estilos.tarjetaReciente]}
                onPress={() => abrirModalEntrada(item)}
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
            busqueda !== '' ? null : ( // cuando hay búsqueda, la sugerencia ya aparece arriba
              <EstadoVacio
                icono="download-outline"
                titulo="Sin productos"
                descripcion="Agrega productos en Inventario o usa el botón + para crear uno nuevo aquí."
              />
            )
          }
        />
      )}

      {/* ══════════════════════════════════════════
          MODAL: Entrada de producto EXISTENTE
      ══════════════════════════════════════════ */}
      <Modal visible={modalActivo === 'entrada'} transparent animationType="fade">
        <KeyboardAvoidingView
          style={estilos.overlayModal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={estilos.dismissArea} onPress={cerrarModal} />

          <Animated.View style={[estilos.modal, { transform: [{ translateY: slideAnim }] }]}>
            <View style={estilos.barraArrastre} {...panResponder.panHandlers} />

            <Text style={estilos.tituloModal}>Entrada de mercancía</Text>
            <Text style={estilos.nombreModal}>{productoSeleccionado?.nombre}</Text>
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

            {cantidad !== '' && !isNaN(parseInt(cantidad, 10)) && (
              <Text style={estilos.previa}>
                Nuevo stock: {(productoSeleccionado?.existencia ?? 0) + parseInt(cantidad, 10)} unidades
              </Text>
            )}

            <TouchableOpacity
              style={[estilos.botonConfirmar, (procesando || cantidad === '') && estilos.botonDeshabilitado]}
              onPress={confirmarEntrada}
              disabled={procesando || cantidad === ''}
            >
              <View style={estilos.filaBoton}>
                {procesando && <ActivityIndicator size="small" color="#ffffff" />}
                <Text style={estilos.textoBotonConfirmar}>
                  {procesando ? 'REGISTRANDO...' : 'CONFIRMAR ENTRADA'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={estilos.botonCancelar} onPress={cerrarModal}>
              <Text style={estilos.textoBotonCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════
          MODAL: Crear producto NUEVO
      ══════════════════════════════════════════ */}
      <Modal visible={modalActivo === 'nuevo_producto'} transparent animationType="fade">
        <KeyboardAvoidingView
          style={estilos.overlayModal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={estilos.dismissArea} onPress={cerrarModal} />

          <Animated.View style={[estilos.modal, { transform: [{ translateY: slideAnim }] }]}>
            <View style={estilos.barraArrastre} {...panResponder.panHandlers} />

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Cabecera del modal nuevo */}
            <View style={estilos.cabeceraModalNuevo}>
              <View style={estilos.badgeNuevo}>
                <Text style={estilos.textoBadgeNuevo}>NUEVO</Text>
              </View>
              <Text style={estilos.tituloModal}>Agregar producto al inventario</Text>
              <Text style={estilos.subtituloModalNuevo}>
                Se creará en el inventario y se registrará la entrada
              </Text>
            </View>

            <Text style={estilos.etiqueta}>Nombre del producto</Text>
            <TextInput
              style={estilos.input}
              value={nombreNuevo}
              onChangeText={setNombreNuevo}
              placeholder="Ej: Cerveza Cristal"
              placeholderTextColor="#a0aec0"
              autoCapitalize="words"
              autoFocus
            />

            <Text style={estilos.etiqueta}>Precio de venta</Text>
            <View style={estilos.inputConSufijo}>
              <TextInput
                style={estilos.inputSufijo}
                value={precioNuevo}
                onChangeText={setPrecioNuevo}
                placeholder="0.00"
                placeholderTextColor="#a0aec0"
                keyboardType="numeric"
              />
              <Text style={estilos.sufijo}>CUP</Text>
            </View>

            <Text style={estilos.etiqueta}>Cantidad inicial</Text>
            <View style={estilos.inputConSufijo}>
              <TextInput
                style={estilos.inputSufijo}
                value={cantidadNueva}
                onChangeText={setCantidadNueva}
                placeholder="Ej: 24"
                placeholderTextColor="#a0aec0"
                keyboardType="number-pad"
                maxLength={5}
              />
              <Text style={estilos.sufijo}>unid.</Text>
            </View>

            <TouchableOpacity
              style={[estilos.botonConfirmarNuevo, procesando && estilos.botonDeshabilitado]}
              onPress={confirmarNuevoProducto}
              disabled={procesando}
            >
              <View style={estilos.filaBoton}>
                {procesando
                  ? <ActivityIndicator size="small" color="#ffffff" />
                  : <Ionicons name="add-circle" size={20} color="#ffffff" />
                }
                <Text style={estilos.textoBotonConfirmar}>
                  {procesando ? 'CREANDO...' : 'CREAR Y AGREGAR'}
                </Text>
              </View>
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
  contenedor: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },

  // ── Barra de búsqueda ──
  filaBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    gap: 10,
  },
  contenedorBusqueda: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
  botonNuevo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#d69e2e',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#d69e2e',
    shadowOffset: { 
      width: 0, 
      height: 2 
    },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },

  // ── Sugerencia de producto nuevo ──
  sugerenciaNuevo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#f6ad55',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textoSugerencia: {
    flex: 1,
    fontSize: 14,
    color: '#744210',
  },
  textoSugerenciaEnlace: {
    color: '#c05621',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // ── Tarjetas de productos ──
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
    shadowOffset: { 
      width: 0, 
      height: 1 
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tarjetaReciente: {
    borderColor: '#38a169',
    backgroundColor: '#f0fff4',
    borderLeftWidth: 5,
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

  // ── Modal base ──
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
    shadowColor: '#000',
    shadowOffset: { 
      width: 0, 
      height: -4 
    },
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

  // ── Modal entrada existente ──
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
    marginTop: 12,
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

  // ── Modal nuevo producto ──
  cabeceraModalNuevo: {
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeNuevo: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f6ad55',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  textoBadgeNuevo: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c05621',
    letterSpacing: 1,
  },
  subtituloModalNuevo: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  inputConSufijo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingRight: 14,
    marginBottom: 12,
  },
  inputSufijo: {
    flex: 1,
    padding: 14,
    fontSize: 18,
    color: '#2d3748',
  },
  sufijo: {
    fontSize: 14,
    color: '#a0aec0',
    fontWeight: 'bold',
  },

  // ── Botones ──
  filaBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  botonConfirmar: {
    backgroundColor: '#2b6cb0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  botonConfirmarNuevo: {
    backgroundColor: '#d69e2e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
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
});