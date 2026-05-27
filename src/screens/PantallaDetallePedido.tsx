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
  agregarItemDespachoAlPedido,
  actualizarCantidadItem,
  eliminarItemPedido,
  cerrarPedidoComoVenta,
  renombrarPedido,
} from '../database/pedidos';
import { obtenerTurnoAbierto } from '../database/turnos';
import { obtenerDespachos, obtenerProductosDespacho, Despacho, ProductoDespacho } from '../database/despachos';
import { Producto } from '../types';
import { formatCUP, sumaSegura } from '../utils';
import EstadoVacio from '../components/EstadoVacio';
import { useProductos } from '../context/ProductosContext';

type Props = {
  route: RouteProp<RootStackParamList, 'DetallePedido'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'DetallePedido'>;
};

type ModalActivo = 'ninguno' | 'agregarProducto' | 'cobro';
type FuenteAgregar = 'inventario' | 'despacho';
type ItemListaModal = Producto | { __separador: true; id: number };

export default function PantallaDetallePedido({ route, navigation }: Props) {
  const { pedidoId } = route.params;

  const [pedido, setPedido] = useState<PedidoConItems | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const procesandoRef = useRef(false);

  const [modalActivo, setModalActivo] = useState<ModalActivo>('ninguno');

  // ── Estado modal agregar ──────────────────────────────────────────────────
  const { productos: todosLosProductos, cargandoProductos, cargarProductos } = useProductos();
  const [busqueda, setBusqueda] = useState('');

  // Toggle inventario / despacho
  const [fuenteAgregar, setFuenteAgregar] = useState<FuenteAgregar>('inventario');

  // Despachos disponibles
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [despachoSeleccionado, setDespachoSeleccionado] = useState<Despacho | null>(null);
  const [productosDespacho, setProductosDespacho] = useState<ProductoDespacho[]>([]);
  const [cargandoDespacho, setCargandoDespacho] = useState(false);

  // ── Estado modal cobro ────────────────────────────────────────────────────
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cambio, setCambio] = useState(0);

  // ── Renombrar ─────────────────────────────────────────────────────────────
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
          Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true })
            .start(() => setModalActivo('ninguno'));
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
        }
      },
    })
  ).current;

  // ── Totales separados para el modal de cobro ──────────────────────────────
  const totalesSeparados = useMemo(() => {
    if (!pedido) return { propio: 0, porDespacho: new Map<number, { nombre: string; color: string; total: number }>() };

    const propio = sumaSegura(
      pedido.items.filter(i => i.origen === 'propio').map(i => i.subtotal)
    );

    const porDespacho = new Map<number, { nombre: string; color: string; total: number }>();
    for (const item of pedido.items.filter(i => i.origen === 'despacho')) {
      if (item.despacho_id === null) continue;
      const despacho = despachos.find(d => d.id === item.despacho_id);
      const entrada = porDespacho.get(item.despacho_id) ?? {
        nombre: despacho?.nombre ?? `Despacho ${item.despacho_id}`,
        color: despacho?.color ?? '#805ad5',
        total: 0,
      };
      entrada.total = sumaSegura([entrada.total, item.subtotal]);
      porDespacho.set(item.despacho_id, entrada);
    }

    return { propio, porDespacho };
  }, [pedido, despachos]);

  // ── Productos filtrados para modal de inventario ──────────────────────────
  const productosFiltrados = useMemo((): ItemListaModal[] => {
    const base = busqueda.trim()
      ? todosLosProductos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      : todosLosProductos;
    const disponibles = base.filter(p => p.existencia > 0);
    const agotados    = base.filter(p => p.existencia <= 0);
    if (agotados.length === 0) return disponibles;
    return [...disponibles, { __separador: true as const, id: -1 }, ...agotados];
  }, [busqueda, todosLosProductos]);

  // ── Productos de despacho filtrados ──────────────────────────────────────
  const productosDespachoFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productosDespacho;
    const t = busqueda.toLowerCase();
    return productosDespacho.filter(p => p.nombre.toLowerCase().includes(t));
  }, [busqueda, productosDespacho]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (pedido) navigation.setOptions({ title: pedido.nombre });
  }, [pedido?.nombre]);

  useEffect(() => {
    if (metodoPago === 'efectivo' && pedido) {
      const recibido = parseFloat(montoRecibido);
      setCambio(!isNaN(recibido) && recibido >= pedido.total ? recibido - pedido.total : 0);
    } else {
      setCambio(0);
    }
  }, [montoRecibido, metodoPago, pedido?.total]);

  // Cargar despachos al montar
  useEffect(() => {
    obtenerDespachos().then(setDespachos).catch(console.error);
  }, []);

  // Cargar productos del despacho seleccionado
  useEffect(() => {
    if (!despachoSeleccionado) { setProductosDespacho([]); return; }
    setCargandoDespacho(true);
    setBusqueda('');
    obtenerProductosDespacho(despachoSeleccionado.id)
      .then(setProductosDespacho)
      .catch(console.error)
      .finally(() => setCargandoDespacho(false));
  }, [despachoSeleccionado]);

  useFocusEffect(
    useCallback(() => { cargarPedido(); }, [pedidoId])
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

  // ── Abrir modales ─────────────────────────────────────────────────────────
  function abrirModalAgregar() {
    setBusqueda('');
    setFuenteAgregar('inventario');
    setDespachoSeleccionado(null);
    setModalActivo('agregarProducto');
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
  }

  function abrirModalCobro() {
    setMontoRecibido('');
    setMetodoPago('efectivo');
    setModalActivo('cobro');
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
  }

  function cerrarModal() {
    Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true })
      .start(() => setModalActivo('ninguno'));
  }

  // ── Acciones de items ─────────────────────────────────────────────────────
  async function handleAgregarProductoPropio(producto: Producto, cantidad: number) {
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
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message ?? 'No se pudo añadir.', position: 'top' });
    }
  }

  async function handleAgregarProductoDespacho(
    producto: ProductoDespacho,
    despachoId: number,
    cantidad: number
  ) {
    if (cantidad <= 0) return;
    try {
      await agregarItemDespachoAlPedido(pedidoId, producto, despachoId, cantidad);
      await cargarPedido();
      const despacho = despachos.find(d => d.id === despachoId);
      Toast.show({
        type: 'success',
        text1: `${cantidad}× ${producto.nombre} añadido`,
        text2: `${despacho?.nombre ?? 'Despacho'} · ${formatCUP(producto.precio * cantidad)} CUP`,
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message ?? 'No se pudo añadir.', position: 'top' });
    }
  }

  async function handleCambiarCantidad(item: PedidoItem, delta: number) {
    const nueva = item.cantidad + delta;
    if (nueva < 0) return;
    try {
      await actualizarCantidadItem(item.id, pedidoId, nueva, item.precio_aplicado);
      await cargarPedido();
    } catch (e) { console.error(e); }
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
    } catch (e) { console.error(e); }
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
      if (!turno) { Alert.alert('Error', 'No hay turno abierto.'); return; }

      await cerrarPedidoComoVenta(pedidoId, metodoPago, turno.id);
      await cargarProductos();
      cerrarModal();

      const textoCambio = metodoPago === 'efectivo' && cambio > 0
        ? ` · Vuelto: ${formatCUP(cambio)} CUP` : '';

      // Construir texto del toast con el desglose
      const totalDespachos = sumaSegura([...totalesSeparados.porDespacho.values()].map(d => d.total));
      const texto2 = totalesSeparados.propio > 0 && totalDespachos > 0
        ? `Tuyo: ${formatCUP(totalesSeparados.propio)} · Despachos: ${formatCUP(totalDespachos)} CUP${textoCambio}`
        : `${formatCUP(pedido.total)} CUP${textoCambio}`;

      Toast.show({
        type: 'success',
        text1: `✅ Cuenta cerrada — ${pedido.nombre}`,
        text2: texto2,
        position: 'top',
        visibilityTime: 4000,
      });

      navigation.goBack();
    } catch (e: any) {
      const msg = e?.message?.startsWith('Stock insuficiente')
        ? e.message : 'No se pudo cerrar la cuenta. Intenta de nuevo.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg, position: 'top', visibilityTime: 6000 });
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  }

  const botonCobroDeshabilitado =
    procesando || !pedido || pedido.items.length === 0 ||
    (metodoPago === 'efectivo' && (montoRecibido === '' || parseFloat(montoRecibido) < (pedido?.total ?? 0)));

  // ── Render helpers ────────────────────────────────────────────────────────
  function renderEtiquetaOrigen(item: PedidoItem) {
    if (item.origen === 'propio') return null;
    const despacho = despachos.find(d => d.id === item.despacho_id);
    const color = despacho?.color ?? '#805ad5';
    const nombre = despacho?.nombre ?? 'Despacho';
    return (
      <View style={[estilos.etiquetaDespacho, { backgroundColor: color + '22', borderColor: color + '66' }]}>
        <Ionicons name="storefront-outline" size={10} color={color} />
        <Text style={[estilos.textoEtiquetaDespacho, { color }]} numberOfLines={1}>
          {nombre}
        </Text>
      </View>
    );
  }

  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}><ActivityIndicator size="large" color="#2b6cb0" /></View>
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

  const totalDespachoGlobal = sumaSegura([...totalesSeparados.porDespacho.values()].map(d => d.total));

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>

      {/* ── Nombre editable ── */}
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
            onPress={() => { setNombreTemp(pedido.nombre); setEditandoNombre(true); }}
          >
            <Ionicons name="restaurant" size={18} color="#2b6cb0" />
            <Text style={estilos.nombrePedidoHeader}>{pedido.nombre}</Text>
            <Ionicons name="pencil-outline" size={15} color="#a0aec0" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Lista de items ── */}
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
        renderItem={({ item }) => {
          const esDespacho = item.origen === 'despacho';
          const despacho = esDespacho ? despachos.find(d => d.id === item.despacho_id) : null;
          const colorBorde = esDespacho ? (despacho?.color ?? '#805ad5') : '#edf2f7';

          return (
            <View style={[estilos.tarjetaItem, { borderColor: colorBorde, borderLeftWidth: esDespacho ? 4 : 1 }]}>
              <View style={estilos.infoItem}>
                <Text style={estilos.nombreItem} numberOfLines={1}>{item.nombre_producto}</Text>
                <View style={estilos.filaSubInfoItem}>
                  <Text style={estilos.precioUnitItem}>{formatCUP(item.precio_aplicado)} CUP/u</Text>
                  {renderEtiquetaOrigen(item)}
                </View>
              </View>
              <View style={estilos.controlesItem}>
                <TouchableOpacity
                  style={[estilos.botonCantidad, item.cantidad <= 1 && estilos.botonCantidadRojo]}
                  onPress={() => {
                    if (item.cantidad <= 1) handleEliminarItem(item);
                    else handleCambiarCantidad(item, -1);
                  }}
                >
                  <Ionicons name={item.cantidad <= 1 ? 'trash-outline' : 'remove'} size={16} color="#ffffff" />
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
          );
        }}
      />

      {/* ── Barra inferior ── */}
      <View style={estilos.barraInferior}>
        {/* Desglose si hay mezcla */}
        {totalesSeparados.propio > 0 && totalDespachoGlobal > 0 && (
          <View style={estilos.desgloseBar}>
            <View style={estilos.chipDesglose}>
              <Ionicons name="storefront-outline" size={12} color="#ffffff" />
              <Text style={estilos.textoChipDesglose}>
                Tuyo: {formatCUP(totalesSeparados.propio)}
              </Text>
            </View>
            {[...totalesSeparados.porDespacho.entries()].map(([id, d]) => (
              <View key={id} style={[estilos.chipDesglose, { backgroundColor: d.color }]}>
                <Ionicons name="storefront-outline" size={12} color="#ffffff" />
                <Text style={estilos.textoChipDesglose}>
                  {d.nombre}: {formatCUP(d.total)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={estilos.seccionTotal}>
          <Text style={estilos.etiquetaTotalBar}>Total</Text>
          <Text style={estilos.valorTotalBar}>{formatCUP(pedido.total)} CUP</Text>
        </View>
        <View style={estilos.botonesBar}>
          <TouchableOpacity style={estilos.botonAgregar} onPress={abrirModalAgregar}>
            <Ionicons name="add-circle-outline" size={20} color="#2b6cb0" />
            <Text style={estilos.textoBotonAgregar}>Agregar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[estilos.botonCerrarCuenta, pedido.items.length === 0 && estilos.botonDeshabilitado]}
            onPress={abrirModalCobro}
            disabled={pedido.items.length === 0}
          >
            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            <Text style={estilos.textoBotonCerrarCuenta}>Cobrar cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ══════════════════════════════════════════
          MODAL: AGREGAR PRODUCTOS
      ══════════════════════════════════════════ */}
      <Modal visible={modalActivo === 'agregarProducto'} transparent animationType="fade">
        <KeyboardAvoidingView
          style={estilos.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={cerrarModal} />
          <Animated.View style={[estilos.modalGrande, { transform: [{ translateY: slideAnim }] }]}>
            <View style={estilos.barraArrastre} {...panResponder.panHandlers} />

            {/* Título */}
            <View style={estilos.cabeceraModal}>
              <Text style={estilos.tituloModal}>Agregar productos</Text>
              <Text style={estilos.subtituloModal}>{pedido.nombre}</Text>
            </View>

            {/* Toggle Inventario / Despacho */}
            <View style={estilos.toggleFuente}>
              <TouchableOpacity
                style={[estilos.botonToggle, fuenteAgregar === 'inventario' && estilos.botonToggleActivo]}
                onPress={() => { setFuenteAgregar('inventario'); setBusqueda(''); setDespachoSeleccionado(null); }}
              >
                <Ionicons name="cube-outline" size={16} color={fuenteAgregar === 'inventario' ? '#ffffff' : '#4a5568'} />
                <Text style={[estilos.textoToggle, fuenteAgregar === 'inventario' && estilos.textoToggleActivo]}>
                  Mi Inventario
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[estilos.botonToggle, fuenteAgregar === 'despacho' && estilos.botonToggleActivo]}
                onPress={() => { setFuenteAgregar('despacho'); setBusqueda(''); }}
              >
                <Ionicons name="storefront-outline" size={16} color={fuenteAgregar === 'despacho' ? '#ffffff' : '#4a5568'} />
                <Text style={[estilos.textoToggle, fuenteAgregar === 'despacho' && estilos.textoToggleActivo]}>
                  Despachos
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── INVENTARIO ── */}
            {fuenteAgregar === 'inventario' && (
              <>
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
                  </View>
                ) : (
                  <FlatList
                    data={productosFiltrados}
                    keyExtractor={(item) => '__separador' in item ? 'sep' : item.id.toString()}
                    style={estilos.listaProductosModal}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <View style={estilos.centradoModal}>
                        <Text style={estilos.textoSinResultados}>
                          {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin productos en inventario'}
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
                          onAgregar={handleAgregarProductoPropio}
                        />
                      );
                    }}
                  />
                )}
              </>
            )}

            {/* ── DESPACHOS ── */}
            {fuenteAgregar === 'despacho' && (
              <>
                {/* Selector de despacho */}
                {!despachoSeleccionado ? (
                  <View style={estilos.listaProductosModal}>
                    {despachos.length === 0 ? (
                      <View style={estilos.centradoModal}>
                        <Ionicons name="storefront-outline" size={48} color="#cbd5e0" />
                        <Text style={estilos.textoSinResultados}>No hay despachos configurados</Text>
                      </View>
                    ) : (
                      <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={estilos.etiquetaSelectorDespacho}>Selecciona un despacho</Text>
                        {despachos.map(d => (
                          <TouchableOpacity
                            key={d.id}
                            style={[estilos.tarjetaDespachoSelector, { borderLeftColor: d.color }]}
                            onPress={() => setDespachoSeleccionado(d)}
                          >
                            <View style={[estilos.avatarDespachoSelector, { backgroundColor: d.color + '22' }]}>
                              <Ionicons name="storefront" size={22} color={d.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={estilos.nombreDespachoSelector}>{d.nombre}</Text>
                              {d.descripcion ? (
                                <Text style={estilos.descDespachoSelector} numberOfLines={1}>{d.descripcion}</Text>
                              ) : null}
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#a0aec0" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                ) : (
                  <>
                    {/* Cabecera del despacho seleccionado */}
                    <TouchableOpacity
                      style={[estilos.cabeceraDespachoActivo, { borderColor: despachoSeleccionado.color }]}
                      onPress={() => { setDespachoSeleccionado(null); setBusqueda(''); }}
                    >
                      <View style={[estilos.puntoCabeceraDespacho, { backgroundColor: despachoSeleccionado.color }]} />
                      <Text style={[estilos.nombreCabeceraDespacho, { color: despachoSeleccionado.color }]}>
                        {despachoSeleccionado.nombre}
                      </Text>
                      <Ionicons name="close-circle" size={18} color={despachoSeleccionado.color} />
                    </TouchableOpacity>

                    <View style={estilos.contenedorBusqueda}>
                      <Ionicons name="search" size={18} color="#718096" />
                      <TextInput
                        style={estilos.inputBusqueda}
                        placeholder={`Buscar en ${despachoSeleccionado.nombre}...`}
                        placeholderTextColor="#a0aec0"
                        value={busqueda}
                        onChangeText={setBusqueda}
                        clearButtonMode="while-editing"
                      />
                    </View>

                    {cargandoDespacho ? (
                      <View style={estilos.centradoModal}>
                        <ActivityIndicator size="large" color={despachoSeleccionado.color} />
                      </View>
                    ) : (
                      <FlatList
                        data={productosDespachoFiltrados}
                        keyExtractor={(item) => item.id.toString()}
                        style={estilos.listaProductosModal}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                          <View style={estilos.centradoModal}>
                            <Text style={estilos.textoSinResultados}>
                              {busqueda
                                ? `Sin resultados para "${busqueda}"`
                                : 'Este despacho no tiene productos configurados'}
                            </Text>
                          </View>
                        }
                        renderItem={({ item }) => (
                          <ProductoDespachoParaAgregar
                            producto={item}
                            despachoId={despachoSeleccionado.id}
                            color={despachoSeleccionado.color}
                            onAgregar={handleAgregarProductoDespacho}
                          />
                        )}
                      />
                    )}
                  </>
                )}
              </>
            )}

            <TouchableOpacity style={estilos.botonCerrarModal} onPress={cerrarModal}>
              <Text style={estilos.textoBotonCerrarModal}>Cerrar</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════
          MODAL: COBRO
      ══════════════════════════════════════════ */}
      <Modal visible={modalActivo === 'cobro'} transparent animationType="fade">
        <KeyboardAvoidingView
          style={estilos.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={cerrarModal} />
          <Animated.View style={[estilos.modalCobro, { transform: [{ translateY: slideAnim }] }]}>
            <View style={estilos.barraArrastre} {...panResponder.panHandlers} />

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Total general */}
              <View style={estilos.seccionTotalCobro}>
                <Text style={estilos.etiquetaTotalCobro}>TOTAL A COBRAR</Text>
                <Text style={estilos.valorTotalCobro}>{formatCUP(pedido.total)} CUP</Text>
                <Text style={estilos.nombreEnCobro}>{pedido.nombre}</Text>
              </View>

              {/* Desglose tuyo vs despacho — solo si hay mezcla */}
              {totalesSeparados.propio > 0 && totalDespachoGlobal > 0 && (
                <View style={estilos.seccionDesgloseCobro}>
                  <Text style={estilos.tituloDesgloseCobro}>Composición del cobro</Text>

                  <View style={estilos.filaDesgloseCobro}>
                    <View style={estilos.filaIconoDesglose}>
                      <Ionicons name="home-outline" size={16} color="#2b6cb0" />
                      <Text style={estilos.etiquetaDesgloseCobro}>Tu negocio</Text>
                    </View>
                    <View style={estilos.ladoDerechoDesglose}>
                      <Text style={estilos.valorDesgloseCobro}>{formatCUP(totalesSeparados.propio)} CUP</Text>
                      <View style={estilos.badgeVaTuCaja}>
                        <Text style={estilos.textoVaTuCaja}>va a tu caja</Text>
                      </View>
                    </View>
                  </View>

                  {[...totalesSeparados.porDespacho.entries()].map(([id, d]) => (
                    <View key={id} style={estilos.filaDesgloseCobro}>
                      <View style={estilos.filaIconoDesglose}>
                        <Ionicons name="storefront-outline" size={16} color={d.color} />
                        <Text style={[estilos.etiquetaDesgloseCobro, { color: d.color }]}>{d.nombre}</Text>
                      </View>
                      <View style={estilos.ladoDerechoDesglose}>
                        <Text style={[estilos.valorDesgloseCobro, { color: d.color }]}>{formatCUP(d.total)} CUP</Text>
                        <View style={[estilos.badgeNoTuCaja, { borderColor: d.color }]}>
                          <Text style={[estilos.textoNoTuCaja, { color: d.color }]}>entregar al despacho</Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  <View style={estilos.notaDesglose}>
                    <Ionicons name="information-circle-outline" size={14} color="#718096" />
                    <Text style={estilos.textoNotaDesglose}>
                      Cobra el total al cliente, luego entrega la parte del despacho por separado.
                    </Text>
                  </View>
                </View>
              )}

              {/* Método de pago */}
              <Text style={estilos.subtituloCobro}>Método de Pago</Text>
              <View style={estilos.gridMetodos}>
                {(['efectivo', 'transferencia'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[estilos.botonMetodo, metodoPago === m && estilos.botonMetodoActivo]}
                    onPress={() => setMetodoPago(m)}
                  >
                    <Ionicons name={m === 'efectivo' ? 'cash' : 'card'} size={30}
                      color={metodoPago === m ? '#ffffff' : '#718096'} />
                    <Text style={[estilos.textoMetodo, metodoPago === m && { color: '#ffffff' }]}>
                      {m === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Input efectivo */}
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

              {/* Resumen de items */}
              <Text style={estilos.subtituloCobro}>Resumen ({pedido.items.length} productos)</Text>
              {pedido.items.map((item) => {
                const esDespacho = item.origen === 'despacho';
                const despacho = esDespacho ? despachos.find(d => d.id === item.despacho_id) : null;
                return (
                  <View key={item.id} style={estilos.filaResumenItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.nombreResumenItem}>
                        {item.cantidad}× {item.nombre_producto}
                      </Text>
                      {esDespacho && despacho && (
                        <Text style={[estilos.etiquetaResumenDespacho, { color: despacho.color }]}>
                          {despacho.nombre}
                        </Text>
                      )}
                    </View>
                    <Text style={estilos.subtotalResumenItem}>{formatCUP(item.subtotal)} CUP</Text>
                  </View>
                );
              })}
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

// ─── Subcomponente: producto propio para agregar ───────────────────────────────

interface ProductoParaAgregarProps {
  producto: Producto;
  onAgregar: (producto: Producto, cantidad: number) => void;
}

function ProductoParaAgregar({ producto, onAgregar }: ProductoParaAgregarProps) {
  const [cantidad, setCantidad] = useState(1);
  const agotado  = producto.existencia <= 0;
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
      </View>
      <View style={estilosPA.lado}>
        {!agotado && (
          <>
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
            <TouchableOpacity
              style={estilosPA.botonAgregar}
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

// ─── Subcomponente: producto de despacho para agregar ─────────────────────────

interface ProductoDespachoParaAgregarProps {
  producto: ProductoDespacho;
  despachoId: number;
  color: string;
  onAgregar: (producto: ProductoDespacho, despachoId: number, cantidad: number) => void;
}

function ProductoDespachoParaAgregar({ producto, despachoId, color, onAgregar }: ProductoDespachoParaAgregarProps) {
  const [cantidad, setCantidad] = useState(1);

  return (
    <View style={estilosPA.tarjeta}>
      <View style={estilosPA.info}>
        <Text style={estilosPA.nombre} numberOfLines={1}>{producto.nombre}</Text>
        <Text style={[estilosPA.precio, { color }]}>{formatCUP(producto.precio)} CUP</Text>
      </View>
      <View style={estilosPA.lado}>
        <View style={estilosPA.controles}>
          <TouchableOpacity
            style={[estilosPA.botonCant, { backgroundColor: cantidad <= 1 ? '#cbd5e0' : color }, cantidad <= 1 && estilosPA.botonCantDeshabilitado]}
            onPress={() => setCantidad(Math.max(1, cantidad - 1))}
            disabled={cantidad <= 1}
          >
            <Text style={estilosPA.textoBotonCant}>−</Text>
          </TouchableOpacity>
          <Text style={estilosPA.textoCantidad}>{cantidad}</Text>
          <TouchableOpacity
            style={[estilosPA.botonCant, { backgroundColor: color }]}
            onPress={() => setCantidad(cantidad + 1)}
          >
            <Text style={estilosPA.textoBotonCant}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[estilosPA.botonAgregar, { backgroundColor: color }]}
          onPress={() => { onAgregar(producto, despachoId, cantidad); setCantidad(1); }}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f0f4f8' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerPedido: {
    backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#edf2f7',
  },
  filaEditarNombre: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombrePedidoHeader: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
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
  textoEmptyItems: { fontSize: 15, color: '#a0aec0', textAlign: 'center', lineHeight: 22 },

  tarjetaItem: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    borderWidth: 1,
  },
  infoItem: { flex: 1, marginRight: 10 },
  nombreItem: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 },
  filaSubInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  precioUnitItem: { fontSize: 12, color: '#718096' },
  etiquetaDespacho: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  textoEtiquetaDespacho: { fontSize: 11, fontWeight: '700' },

  controlesItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 10 },
  botonCantidad: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#2b6cb0',
    alignItems: 'center', justifyContent: 'center',
  },
  botonCantidadRojo: { backgroundColor: '#e53e3e' },
  cantidadItem: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', minWidth: 24, textAlign: 'center' },
  subtotalItem: { fontSize: 14, fontWeight: '800', color: '#2b6cb0', minWidth: 80, textAlign: 'right' },

  barraInferior: {
    backgroundColor: '#1a1a2e', paddingHorizontal: 16,
    paddingVertical: 14, paddingBottom: 28, gap: 10,
  },
  desgloseBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipDesglose: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#2b6cb0', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  textoChipDesglose: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

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
  cabeceraModal: { marginBottom: 12 },
  tituloModal: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', textAlign: 'center' },
  subtituloModal: { fontSize: 14, color: '#2b6cb0', textAlign: 'center', fontWeight: '600', marginTop: 4 },

  // Toggle fuente
  toggleFuente: {
    flexDirection: 'row', backgroundColor: '#f0f4f8',
    borderRadius: 12, padding: 4, marginBottom: 12,
  },
  botonToggle: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  botonToggleActivo: { backgroundColor: '#1a1a2e' },
  textoToggle: { fontSize: 14, fontWeight: '700', color: '#4a5568' },
  textoToggleActivo: { color: '#ffffff' },

  contenedorBusqueda: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f7fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 12, height: 46, marginBottom: 12,
  },
  inputBusqueda: { flex: 1, fontSize: 15, color: '#2d3748' },

  listaProductosModal: { flex: 1 },
  centradoModal: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  textoSinResultados: { fontSize: 15, color: '#a0aec0', textAlign: 'center' },

  separadorAgotadosModal: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, marginVertical: 8, gap: 8,
  },
  lineaSep: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  textoSep: { fontSize: 11, color: '#a0aec0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  botonCerrarModal: {
    alignItems: 'center', padding: 14,
    borderTopWidth: 1, borderTopColor: '#f0f4f8', marginTop: 4,
  },
  textoBotonCerrarModal: { fontSize: 15, color: '#718096', fontWeight: '600' },

  // Selector de despacho
  etiquetaSelectorDespacho: {
    fontSize: 13, color: '#718096', fontWeight: '600',
    marginBottom: 12, marginTop: 4,
  },
  tarjetaDespachoSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderLeftWidth: 4,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  avatarDespachoSelector: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  nombreDespachoSelector: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  descDespachoSelector: { fontSize: 13, color: '#718096', marginTop: 2 },

  cabeceraDespachoActivo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f7fafc', borderRadius: 12, padding: 10,
    borderWidth: 1.5, marginBottom: 10,
  },
  puntoCabeceraDespacho: { width: 10, height: 10, borderRadius: 5 },
  nombreCabeceraDespacho: { flex: 1, fontSize: 14, fontWeight: '700' },

  modalGrande: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    height: '92%', elevation: 20,
  },

  // Modal cobro
  modalCobro: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12, maxHeight: '92%', elevation: 20,
  },
  seccionTotalCobro: {
    backgroundColor: '#f8fafc', padding: 20, borderRadius: 16, alignItems: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0',
  },
  etiquetaTotalCobro: { fontSize: 11, color: '#64748b', fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  valorTotalCobro: { fontSize: 36, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
  nombreEnCobro: { fontSize: 14, color: '#2b6cb0', fontWeight: '600' },

  // Desglose cobro
  seccionDesgloseCobro: {
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0',
  },
  tituloDesgloseCobro: { fontSize: 13, fontWeight: '700', color: '#4a5568', marginBottom: 10 },
  filaDesgloseCobro: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  filaIconoDesglose: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  etiquetaDesgloseCobro: { fontSize: 14, color: '#4a5568', fontWeight: '600' },
  ladoDerechoDesglose: { alignItems: 'flex-end', gap: 3 },
  valorDesgloseCobro: { fontSize: 14, fontWeight: '800', color: '#2b6cb0' },
  badgeVaTuCaja: {
    backgroundColor: '#f0fff4', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#9ae6b4',
  },
  textoVaTuCaja: { fontSize: 10, color: '#2f855a', fontWeight: '700' },
  badgeNoTuCaja: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, backgroundColor: 'transparent',
  },
  textoNoTuCaja: { fontSize: 10, fontWeight: '700' },
  notaDesglose: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#edf2f7',
  },
  textoNotaDesglose: { flex: 1, fontSize: 12, color: '#718096', lineHeight: 16 },

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
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#f0f4f8',
  },
  nombreResumenItem: { fontSize: 13, color: '#64748b', flex: 1 },
  etiquetaResumenDespacho: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  subtotalResumenItem: { fontSize: 13, fontWeight: '600', color: '#1e293b' },

  botonConfirmarCobro: {
    backgroundColor: '#38a169', padding: 18, borderRadius: 16,
    alignItems: 'center', marginTop: 20,
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