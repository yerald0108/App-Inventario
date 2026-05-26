import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, ScrollView,
  Animated, Pressable, PanResponder, Platform,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../../App';
import {
  PedidoConItems, PedidoItem,
  obtenerPedidoConItems,
  agregarItemPedido,
  actualizarCantidadItem,
  eliminarItemPedido,
  cerrarPedidoComoVenta,
  renombrarPedido,
} from '../database/pedidos';
import { obtenerProductos } from '../database/productos';
import { obtenerTurnoAbierto } from '../database/turnos';
import { Producto } from '../types';
import { formatCUP } from '../utils/formatters';
import EstadoVacio from '../components/EstadoVacio';

type Props = {
  route: RouteProp<RootStackParamList, 'DetallePedido'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'DetallePedido'>;
};

type ModalActivo = 'ninguno' | 'agregarProducto' | 'cobro';

type ItemListaModal = Producto | { __separador: true; id: number };

export default function PantallaDetallePedido({ route, navigation }: Props) {
  const { pedidoId } = route.params;

  const [pedido, setPedido] = useState<PedidoConItems | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const procesandoRef = useRef(false);

  const [modalActivo, setModalActivo] = useState<ModalActivo>('ninguno');

  // ── Estado del modal "Agregar Producto" ───────────────────────────────────
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Filtrado derivado con separador de agotados
  const productosFiltrados = useMemo((): ItemListaModal[] => {
    const base = busqueda.trim()
      ? productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      : productos;
    const disponibles = base.filter(p => p.existencia > 0);
    const agotados = base.filter(p => p.existencia <= 0);
    if (agotados.length === 0) return disponibles;
    return [...disponibles, { __separador: true as const, id: -1 }, ...agotados];
  }, [busqueda, productos]);

  // Estado del modal "Cobro"
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cambio, setCambio] = useState(0);

  // Renombrar pedido
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreTemp, setNombreTemp] = useState('');

  const slideAnim = useRef(new Animated.Value(600)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => { if (g.dy > 0) slideAnim.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 150 || g.vy > 0.5) {
          Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }).start(() => setModalActivo('ninguno'));
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (pedido) {
      navigation.setOptions({ title: pedido.nombre });
    }
  }, [pedido?.nombre]);

  useEffect(() => {
    if (metodoPago === 'efectivo' && pedido) {
      const recibido = parseFloat(montoRecibido);
      setCambio(!isNaN(recibido) && recibido >= pedido.total ? recibido - pedido.total : 0);
    } else {
      setCambio(0);
    }
  }, [montoRecibido, metodoPago, pedido?.total]);

  useFocusEffect(
    useCallback(() => {
      cargarPedido();
    }, [pedidoId])
  );

  async function cargarPedido() {
    setCargando(true);
    try {
      const datos = await obtenerPedidoConItems(pedidoId);
      setPedido(datos);
    } finally {
      setCargando(false);
    }
  }

  // ── Abrir modal de agregar productos ──────────────────────────────────────
  async function abrirModalAgregar() {
    // 1. Limpiar búsqueda y mostrar spinner
    setBusqueda('');
    setProductos([]);
    setCargandoProductos(true);

    // 2. Abrir el modal con animación
    setModalActivo('agregarProducto');
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();

    // 3. Cargar productos en segundo plano
    try {
      const lista = await obtenerProductos();
      setProductos(lista);
    } catch (e) {
      console.error('Error cargando productos:', e);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los productos.',
        position: 'top',
      });
      setProductos([]);
    } finally {
      setCargandoProductos(false);
    }
  }

  function abrirModalCobro() {
    setMontoRecibido('');
    setMetodoPago('efectivo');
    setModalActivo('cobro');
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
  }

  function cerrarModal() {
    Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => setModalActivo('ninguno'));
  }

  async function handleAgregarProducto(producto: Producto, cantidad: number) {
    if (cantidad <= 0) return;
    try {
      await agregarItemPedido(pedidoId, producto, cantidad);
      await cargarPedido();
      Toast.show({
        type: 'success',
        text1: `${cantidad}× ${producto.nombre} añadido`,
        text2: `Subtotal: ${formatCUP(producto.precio * cantidad)} CUP`,
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo añadir el producto.', position: 'top' });
      console.error(e);
    }
  }

  async function handleCambiarCantidad(item: PedidoItem, delta: number) {
    const nueva = item.cantidad + delta;
    if (nueva < 0) return;
    try {
      await actualizarCantidadItem(item.id, pedidoId, nueva, item.precio_aplicado);
      await cargarPedido();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleEliminarItem(item: PedidoItem) {
    Alert.alert(
      '¿Quitar producto?',
      `Eliminar "${item.nombre_producto}" del pedido.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            await eliminarItemPedido(item.id, pedidoId);
            await cargarPedido();
          },
        },
      ]
    );
  }

  async function handleGuardarNombre() {
    if (!nombreTemp.trim()) return;
    try {
      await renombrarPedido(pedidoId, nombreTemp);
      await cargarPedido();
      setEditandoNombre(false);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCerrarCuenta() {
    if (!pedido || pedido.items.length === 0) {
      Alert.alert('Pedido vacío', 'Agrega al menos un producto antes de cobrar.');
      return;
    }
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setProcesando(true);

    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        Alert.alert('Error', 'No hay turno abierto.');
        return;
      }

      await cerrarPedidoComoVenta(pedidoId, metodoPago, turno.id);

      cerrarModal();

      const textoCambio =
        metodoPago === 'efectivo' && cambio > 0
          ? ` · Vuelto: ${formatCUP(cambio)} CUP`
          : '';

      Toast.show({
        type: 'success',
        text1: `✅ Cuenta cerrada — ${pedido.nombre}`,
        text2: `${formatCUP(pedido.total)} CUP · ${metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia'}${textoCambio}`,
        position: 'top',
        visibilityTime: 4000,
      });

      navigation.goBack();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cerrar la cuenta.', position: 'top' });
      console.error(e);
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  }

  const botonCobroDeshabilitado =
    procesando ||
    !pedido ||
    pedido.items.length === 0 ||
    (metodoPago === 'efectivo' && (montoRecibido === '' || parseFloat(montoRecibido) < (pedido?.total ?? 0)));

  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#2b6cb0" />
        </View>
      </SafeAreaView>
    );
  }

  if (!pedido) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <EstadoVacio icono="alert-circle-outline" titulo="Pedido no encontrado" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>

      {/* ── Nombre del pedido (editable) ── */}
      <View style={estilos.headerPedido}>
        {editandoNombre ? (
          <View style={estilos.filaEditarNombre}>
            <TextInput
              style={estilos.inputNombrePedido}
              value={nombreTemp}
              onChangeText={setNombreTemp}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleGuardarNombre}
              onBlur={handleGuardarNombre}
            />
            <TouchableOpacity onPress={handleGuardarNombre} style={estilos.botonGuardarNombre}>
              <Ionicons name="checkmark" size={20} color="#38a169" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={estilos.filaEditarNombre}
            onPress={() => {
              setNombreTemp(pedido.nombre);
              setEditandoNombre(true);
            }}
          >
            <Ionicons name="restaurant" size={18} color="#2b6cb0" />
            <Text style={estilos.nombrePedidoHeader}>{pedido.nombre}</Text>
            <Ionicons name="pencil-outline" size={15} color="#a0aec0" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Lista de items del pedido ── */}
      <FlatList
        data={pedido.items}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={estilos.listaItems}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={estilos.emptyItems}>
            <Ionicons name="cart-outline" size={48} color="#cbd5e0" />
            <Text style={estilos.textoEmptyItems}>
              El pedido está vacío.{'\n'}Toca "Agregar" para añadir productos.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={estilos.tarjetaItem}>
            <View style={estilos.infoItem}>
              <Text style={estilos.nombreItem} numberOfLines={1}>{item.nombre_producto}</Text>
              <Text style={estilos.precioUnitItem}>{formatCUP(item.precio_aplicado)} CUP/u</Text>
            </View>
            <View style={estilos.controlesItem}>
              <TouchableOpacity
                style={[estilos.botonCantidad, item.cantidad <= 1 && estilos.botonCantidadRojo]}
                onPress={() => {
                  if (item.cantidad <= 1) {
                    handleEliminarItem(item);
                  } else {
                    handleCambiarCantidad(item, -1);
                  }
                }}
              >
                <Ionicons
                  name={item.cantidad <= 1 ? 'trash-outline' : 'remove'}
                  size={16}
                  color="#ffffff"
                />
              </TouchableOpacity>
              <Text style={estilos.cantidadItem}>{item.cantidad}</Text>
              <TouchableOpacity
                style={estilos.botonCantidad}
                onPress={() => handleCambiarCantidad(item, 1)}
              >
                <Ionicons name="add" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Text style={estilos.subtotalItem}>{formatCUP(item.subtotal)} CUP</Text>
          </View>
        )}
      />

      {/* ── Barra inferior fija ── */}
      <View style={estilos.barraInferior}>
        <View style={estilos.seccionTotal}>
          <Text style={estilos.etiquetaTotalBar}>Total</Text>
          <Text style={estilos.valorTotalBar}>{formatCUP(pedido.total)} CUP</Text>
        </View>
        <View style={estilos.botonesBar}>
          <TouchableOpacity
            style={estilos.botonAgregar}
            onPress={abrirModalAgregar}
          >
            <Ionicons name="add-circle-outline" size={20} color="#2b6cb0" />
            <Text style={estilos.textoBotonAgregar}>Agregar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              estilos.botonCerrarCuenta,
              pedido.items.length === 0 && estilos.botonDeshabilitado,
            ]}
            onPress={abrirModalCobro}
            disabled={pedido.items.length === 0}
          >
            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            <Text style={estilos.textoBotonCerrarCuenta}>Cobrar cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ════════════════════════════════════════
          MODAL: AGREGAR PRODUCTOS
      ════════════════════════════════════════ */}
      <Modal
        visible={modalActivo === 'agregarProducto'}
        transparent
        animationType="fade"
      >
        <KeyboardAvoidingView
          style={estilos.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={cerrarModal} />
          <Animated.View
            style={[estilos.modalGrande, { transform: [{ translateY: slideAnim }] }]}
          >
            <View style={estilos.barraArrastre} {...panResponder.panHandlers} />

            <View style={estilos.cabeceraModal}>
              <Text style={estilos.tituloModal}>Agregar productos</Text>
              <Text style={estilos.subtituloModal}>{pedido.nombre}</Text>
            </View>

            <View style={estilos.contenedorBusqueda}>
              <Ionicons name="search" size={18} color="#718096" />
              <TextInput
                style={estilos.inputBusqueda}
                placeholder="Buscar en inventario..."
                placeholderTextColor="#a0aec0"
                value={busqueda}
                onChangeText={setBusqueda}
                clearButtonMode="while-editing"
              />
            </View>

            {cargandoProductos ? (
              <View style={estilos.centradoModal}>
                <ActivityIndicator size="large" color="#2b6cb0" />
                <Text style={estilos.textoCargando}>Cargando inventario...</Text>
              </View>
            ) : (
              <FlatList
                data={productosFiltrados}
                keyExtractor={(item) =>
                  '__separador' in item ? 'sep' : item.id.toString()
                }
                style={estilos.listaProductosModal}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={estilos.centradoModal}>
                    <Text style={estilos.textoSinResultados}>
                      {busqueda
                        ? `Sin resultados para "${busqueda}"`
                        : 'Sin productos en inventario'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  if ('__separador' in item) {
                    return (
                      <View style={estilos.separadorAgotadosModal}>
                        <View style={estilos.lineaSep} />
                        <Text style={estilos.textoSep}>Sin existencia</Text>
                        <View style={estilos.lineaSep} />
                      </View>
                    );
                  }
                  return (
                    <ProductoParaAgregar
                      producto={item as Producto}
                      onAgregar={handleAgregarProducto}
                    />
                  );
                }}
              />
            )}

            <TouchableOpacity style={estilos.botonCerrarModal} onPress={cerrarModal}>
              <Text style={estilos.textoBotonCerrarModal}>Cerrar</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════════════════════════════
          MODAL: COBRO / CERRAR CUENTA
      ════════════════════════════════════════ */}
      <Modal visible={modalActivo === 'cobro'} transparent animationType="fade">
        <KeyboardAvoidingView
          style={estilos.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={cerrarModal} />
          <Animated.View
            style={[estilos.modalCobro, { transform: [{ translateY: slideAnim }] }]}
          >
            <View style={estilos.barraArrastre} {...panResponder.panHandlers} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={estilos.seccionTotalCobro}>
                <Text style={estilos.etiquetaTotalCobro}>TOTAL A COBRAR</Text>
                <Text style={estilos.valorTotalCobro}>{formatCUP(pedido.total)} CUP</Text>
                <Text style={estilos.nombreEnCobro}>{pedido.nombre}</Text>
              </View>

              <Text style={estilos.subtituloCobro}>Método de Pago</Text>
              <View style={estilos.gridMetodos}>
                {(['efectivo', 'transferencia'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[estilos.botonMetodo, metodoPago === m && estilos.botonMetodoActivo]}
                    onPress={() => setMetodoPago(m)}
                  >
                    <Ionicons
                      name={m === 'efectivo' ? 'cash' : 'card'}
                      size={30}
                      color={metodoPago === m ? '#ffffff' : '#718096'}
                    />
                    <Text style={[estilos.textoMetodo, metodoPago === m && { color: '#ffffff' }]}>
                      {m === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {metodoPago === 'efectivo' && (
                <View style={estilos.seccionEfectivo}>
                  <Text style={estilos.etiquetaInput}>Monto recibido</Text>
                  <View style={estilos.contenedorInputMonto}>
                    <TextInput
                      style={estilos.inputMonto}
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={montoRecibido}
                      onChangeText={setMontoRecibido}
                      autoFocus
                    />
                    <Text style={estilos.sufijoMonto}>CUP</Text>
                  </View>
                  {cambio > 0 && (
                    <View style={estilos.contenedorCambio}>
                      <Text style={estilos.etiquetaCambio}>VUELTO</Text>
                      <Text style={estilos.valorCambio}>{formatCUP(cambio)} CUP</Text>
                    </View>
                  )}
                  {montoRecibido !== '' && parseFloat(montoRecibido) < pedido.total && (
                    <Text style={estilos.textoError}>Monto insuficiente para cubrir el total</Text>
                  )}
                </View>
              )}

              <Text style={estilos.subtituloCobro}>Resumen ({pedido.items.length} productos)</Text>
              {pedido.items.map((item) => (
                <View key={item.id} style={estilos.filaResumenItem}>
                  <Text style={estilos.nombreResumenItem}>
                    {item.cantidad}× {item.nombre_producto}
                  </Text>
                  <Text style={estilos.subtotalResumenItem}>{formatCUP(item.subtotal)} CUP</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[estilos.botonConfirmarCobro, botonCobroDeshabilitado && estilos.botonDeshabilitado]}
              onPress={handleCerrarCuenta}
              disabled={botonCobroDeshabilitado}
            >
              <View style={estilos.filaBotonCobro}>
                {procesando && <ActivityIndicator size="small" color="#ffffff" />}
                <Text style={estilos.textoBotonConfirmarCobro}>
                  {procesando ? 'PROCESANDO...' : 'CONFIRMAR COBRO'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Subcomponente: Producto para agregar al pedido ────────────────────────────

interface ProductoParaAgregarProps {
  producto: Producto;
  onAgregar: (producto: Producto, cantidad: number) => void;
}

function ProductoParaAgregar({ producto, onAgregar }: ProductoParaAgregarProps) {
  const [cantidad, setCantidad] = useState(1);
  const agotado = producto.existencia <= 0;
  const stockBajo = !agotado && producto.existencia < producto.alerta_minima;
  const colorStock = agotado ? '#e53e3e' : stockBajo ? '#d69e2e' : '#38a169';

  return (
    <View style={[estilosPA.tarjeta, agotado && estilosPA.tarjetaAgotada]}>
      <View style={estilosPA.info}>
        <Text style={estilosPA.nombre} numberOfLines={1}>{producto.nombre}</Text>
        <View style={estilosPA.fila}>
          <Text style={estilosPA.precio}>{formatCUP(producto.precio)} CUP</Text>
          <Text style={[estilosPA.stock, { color: colorStock }]}>
            {agotado ? '· Agotado' : `· Stock: ${producto.existencia}`}
          </Text>
        </View>
        {agotado && (
          <Text style={estilosPA.textoAgotadoExplicacion}>
            Sin stock — registra una entrada en Inventario para reponer.
          </Text>
        )}
      </View>

      <View style={estilosPA.lado}>
        {!agotado && (
          <View style={estilosPA.controles}>
            <TouchableOpacity
              style={[estilosPA.botonCant, cantidad <= 1 && estilosPA.botonCantDeshabilitado]}
              onPress={() => setCantidad(Math.max(1, cantidad - 1))}
              disabled={cantidad <= 1}
            >
              <Text style={estilosPA.textoBotonCant}>−</Text>
            </TouchableOpacity>
            <Text style={estilosPA.textoCantidad}>{cantidad}</Text>
            <TouchableOpacity
              style={estilosPA.botonCant}
              onPress={() => setCantidad(Math.min(producto.existencia, cantidad + 1))}
            >
              <Text style={estilosPA.textoBotonCant}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        {!agotado && (
          <TouchableOpacity
            style={estilosPA.botonAgregar}
            onPress={() => {
              onAgregar(producto, cantidad);
              setCantidad(1);
            }}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f0f4f8' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerPedido: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#edf2f7',
  },
  filaEditarNombre: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombrePedidoHeader: {
    flex: 1, fontSize: 18, fontWeight: 'bold', color: '#1a1a2e',
  },
  inputNombrePedido: {
    flex: 1, fontSize: 18, fontWeight: 'bold', color: '#1a1a2e',
    borderBottomWidth: 2, borderBottomColor: '#2b6cb0', padding: 4,
  },
  botonGuardarNombre: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f0fff4', alignItems: 'center', justifyContent: 'center',
  },

  listaItems: { padding: 12, paddingBottom: 8 },
  emptyItems: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 16 },
  textoEmptyItems: {
    fontSize: 15, color: '#a0aec0', textAlign: 'center', lineHeight: 22,
  },

  tarjetaItem: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center',
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    borderWidth: 1, borderColor: '#edf2f7',
  },
  infoItem: { flex: 1, marginRight: 10 },
  nombreItem: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 2 },
  precioUnitItem: { fontSize: 12, color: '#718096' },
  controlesItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 10 },
  botonCantidad: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#2b6cb0',
    alignItems: 'center', justifyContent: 'center',
  },
  botonCantidadRojo: { backgroundColor: '#e53e3e' },
  cantidadItem: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', minWidth: 24, textAlign: 'center' },
  subtotalItem: { fontSize: 14, fontWeight: '800', color: '#2b6cb0', minWidth: 80, textAlign: 'right' },

  barraInferior: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 28,
    gap: 12,
  },
  seccionTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 10,
  },
  etiquetaTotalBar: { fontSize: 13, color: '#a0aec0', fontWeight: '600' },
  valorTotalBar: { fontSize: 28, fontWeight: '900', color: '#ffffff' },
  botonesBar: { flexDirection: 'row', gap: 10 },
  botonAgregar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)', borderRadius: 14, paddingVertical: 14,
  },
  textoBotonAgregar: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  botonCerrarCuenta: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#38a169', borderRadius: 14, paddingVertical: 14,
  },
  textoBotonCerrarCuenta: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  botonDeshabilitado: { backgroundColor: '#4a5568', opacity: 0.5 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  barraArrastre: {
    width: 40, height: 5, backgroundColor: '#e2e8f0',
    borderRadius: 3, alignSelf: 'center', marginBottom: 16,
  },
  cabeceraModal: { marginBottom: 16 },
  tituloModal: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', textAlign: 'center' },
  subtituloModal: { fontSize: 14, color: '#2b6cb0', textAlign: 'center', fontWeight: '600', marginTop: 4 },

  modalGrande: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    height: '88%', elevation: 20,
  },
  contenedorBusqueda: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f7fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 12, height: 46, marginBottom: 12,
  },
  inputBusqueda: { flex: 1, fontSize: 15, color: '#2d3748' },
  listaProductosModal: { flex: 1 },
  centradoModal: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  textoCargando: { fontSize: 14, color: '#718096' },
  textoSinResultados: { fontSize: 15, color: '#a0aec0', textAlign: 'center' },
  botonCerrarModal: {
    alignItems: 'center', padding: 14,
    borderTopWidth: 1, borderTopColor: '#f0f4f8', marginTop: 4,
  },
  textoBotonCerrarModal: { fontSize: 15, color: '#718096', fontWeight: '600' },

  // Estilos del separador de agotados en el modal
  separadorAgotadosModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 8,
    gap: 8,
  },
  lineaSep: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  textoSep: {
    fontSize: 11,
    color: '#a0aec0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  modalCobro: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12, maxHeight: '90%', elevation: 20,
  },
  seccionTotalCobro: {
    backgroundColor: '#f8fafc', padding: 20, borderRadius: 16, alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0',
  },
  etiquetaTotalCobro: {
    fontSize: 11, color: '#64748b', fontWeight: 'bold', letterSpacing: 1, marginBottom: 4,
  },
  valorTotalCobro: { fontSize: 36, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
  nombreEnCobro: { fontSize: 14, color: '#2b6cb0', fontWeight: '600' },
  subtituloCobro: { fontSize: 15, fontWeight: 'bold', color: '#475569', marginBottom: 12 },
  gridMetodos: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  botonMetodo: {
    flex: 1, height: 96, borderRadius: 16, borderWidth: 2, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff',
  },
  botonMetodoActivo: { borderColor: '#1e293b', backgroundColor: '#1e293b' },
  textoMetodo: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginTop: 8 },
  seccionEfectivo: { marginBottom: 20 },
  etiquetaInput: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  contenedorInputMonto: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2,
    borderColor: '#cbd5e0', borderRadius: 12, backgroundColor: '#f7fafc', paddingRight: 14,
  },
  inputMonto: { flex: 1, padding: 14, fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' },
  sufijoMonto: { fontSize: 15, fontWeight: 'bold', color: '#a0aec0' },
  contenedorCambio: {
    marginTop: 12, backgroundColor: '#f0fff4', padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#c6f6d5', alignItems: 'center',
  },
  etiquetaCambio: { fontSize: 11, color: '#2f855a', fontWeight: 'bold', marginBottom: 2 },
  valorCambio: { fontSize: 22, fontWeight: '900', color: '#22543d' },
  textoError: { color: '#e53e3e', fontSize: 12, marginTop: 6 },
  filaResumenItem: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#f0f4f8',
  },
  nombreResumenItem: { fontSize: 13, color: '#64748b', flex: 1 },
  subtotalResumenItem: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  botonConfirmarCobro: {
    backgroundColor: '#38a169', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20,
  },
  filaBotonCobro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textoBotonConfirmarCobro: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
});

const estilosPA = StyleSheet.create({
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
  textoAgotadoExplicacion: {
    fontSize: 11,
    color: '#e53e3e',
    marginTop: 4,
    fontStyle: 'italic',
  },
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
  botonAgregarDeshabilitado: { backgroundColor: '#cbd5e0' },
});