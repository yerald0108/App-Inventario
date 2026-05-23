import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert,
  TextInput, TouchableOpacity, LayoutAnimation,
  Modal, ScrollView, KeyboardAvoidingView, Platform,
  Animated, Pressable, ActivityIndicator
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import {
  ProductoDespacho,
  obtenerProductosDespacho,
  registrarVentaExterna,
  obtenerVentasExternasTurno,
  cancelarVentaExterna,
  VentaExternaAgrupada,
} from '../database/despachos';
import { obtenerTurnoAbierto } from '../database/turnos';
import { formatCUP } from '../utils/formatters';
import EstadoVacio from '../components/EstadoVacio';

type Props = {
  route: RouteProp<RootStackParamList, 'VentaExterna'>;
};

interface ItemCestaExterna {
  productoId: number | null;
  nombre: string;
  precio: number;
  cantidad: number;
}

type Tab = 'venta' | 'historial';

export default function PantallaVentaExterna({ route }: Props) {
  const { despachoId, despachoNombre, despachoColor } = route.params;

  const [tabActiva, setTabActiva] = useState<Tab>('venta');
  const [productos, setProductos] = useState<ProductoDespacho[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cesta, setCesta] = useState<Map<number, number>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const procesandoRef = useRef(false);

  // Modal de cobro
  const [modalCobroVisible, setModalCobroVisible] = useState(false);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cambio, setCambio] = useState(0);
  const slideAnim = useRef(new Animated.Value(600)).current;

  // Historial
  const [ventas, setVentas] = useState<VentaExternaAgrupada[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    const t = busqueda.toLowerCase();
    return productos.filter(p => p.nombre.toLowerCase().includes(t));
  }, [busqueda, productos]);

  const itemsCesta = useMemo((): ItemCestaExterna[] => {
    const items: ItemCestaExterna[] = [];
    cesta.forEach((cantidad, productoId) => {
      const producto = productos.find(p => p.id === productoId);
      if (producto) {
        items.push({ productoId, nombre: producto.nombre, precio: producto.precio, cantidad });
      }
    });
    return items;
  }, [cesta, productos]);

  const totalCesta = useMemo(
    () => itemsCesta.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
    [itemsCesta]
  );

  // Efecto del modal de cobro: calcular cambio
  useEffect(() => {
    if (metodoPago === 'efectivo') {
      const recibido = parseFloat(montoRecibido);
      setCambio(!isNaN(recibido) && recibido >= totalCesta ? recibido - totalCesta : 0);
    } else {
      setCambio(0);
    }
  }, [montoRecibido, metodoPago, totalCesta]);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
      setCesta(new Map());
      setBusqueda('');
    }, [])
  );

  async function cargarDatos() {
    setCargando(true);
    try {
      const lista = await obtenerProductosDespacho(despachoId);
      setProductos(lista);
    } finally {
      setCargando(false);
    }
  }

  async function cargarHistorial() {
    setCargandoHistorial(true);
    try {
      const turno = await obtenerTurnoAbierto();
      if (turno) {
        const todas = await obtenerVentasExternasTurno(turno.id);
        setVentas(todas.filter(v => v.despacho_id === despachoId));
      } else {
        setVentas([]);
      }
    } finally {
      setCargandoHistorial(false);
    }
  }

  useEffect(() => {
    if (tabActiva === 'historial') {
      cargarHistorial();
    }
  }, [tabActiva]);

  function cambiarCantidad(productoId: number, cantidad: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCesta(prev => {
      const nueva = new Map(prev);
      if (cantidad === 0) nueva.delete(productoId);
      else nueva.set(productoId, cantidad);
      return nueva;
    });
  }

  function abrirCobro() {
    if (itemsCesta.length === 0) return;
    setMontoRecibido('');
    setMetodoPago('efectivo');
    setModalCobroVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
  }

  function cerrarCobro() {
    setModalCobroVisible(false);
    Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }).start();
  }

  const botonCobroDeshabilitado =
    procesando ||
    (metodoPago === 'efectivo' && (montoRecibido === '' || parseFloat(montoRecibido) < totalCesta));

  async function handleConfirmarVenta() {
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setProcesando(true);

    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        Alert.alert('Error', 'No hay un turno abierto. Debes abrir uno antes de operar.');
        return;
      }

      await registrarVentaExterna(
        itemsCesta.map(i => ({ productoId: i.productoId, nombre: i.nombre, precio: i.precio, cantidad: i.cantidad })),
        metodoPago,
        despachoId,
        turno.id
      );

      cerrarCobro();
      setCesta(new Map());

      const textoCambio = metodoPago === 'efectivo' && cambio > 0
        ? ` · Vuelto: ${cambio.toFixed(2)} CUP`
        : '';

      Toast.show({
        type: 'success',
        text1: `Venta externa · ${metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia'}`,
        text2: `${despachoNombre} — ${formatCUP(totalCesta)} CUP${textoCambio}`,
        position: 'top',
        visibilityTime: 4000,
      });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo registrar la venta.', position: 'top' });
      console.error(error);
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  }

  async function handleCancelarVenta(ventaId: string) {
    Alert.alert(
      '¿Anular venta externa?',
      'Esta venta será eliminada del registro del turno.',
      [
        { text: 'Mantener', style: 'cancel' },
        {
          text: 'Anular',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelarVentaExterna(ventaId);
              await cargarHistorial();
              Toast.show({ type: 'info', text1: 'Venta anulada', position: 'top' });
            } catch {
              Alert.alert('Error', 'No se pudo anular la venta.');
            }
          },
        },
      ]
    );
  }

  function formatearHora(iso: string) {
    const f = new Date(iso);
    return `${f.getHours().toString().padStart(2, '0')}:${f.getMinutes().toString().padStart(2, '0')}`;
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      {/* Banner del despacho */}
      <View style={[estilos.bannerDespacho, { backgroundColor: despachoColor + '18', borderBottomColor: despachoColor + '40' }]}>
        <Ionicons name="storefront" size={16} color={despachoColor} />
        <Text style={[estilos.textoBanner, { color: despachoColor }]}>
          {despachoNombre} · Dinero NO entra a tu caja
        </Text>
      </View>

      {/* Tabs */}
      <View style={estilos.tabs}>
        <TouchableOpacity
          style={[estilos.tab, tabActiva === 'venta' && [estilos.tabActiva, { borderBottomColor: despachoColor }]]}
          onPress={() => setTabActiva('venta')}
        >
          <Ionicons name="cart-outline" size={16} color={tabActiva === 'venta' ? despachoColor : '#718096'} />
          <Text style={[estilos.textoTab, tabActiva === 'venta' && { color: despachoColor, fontWeight: '700' }]}>
            Nueva Venta
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[estilos.tab, tabActiva === 'historial' && [estilos.tabActiva, { borderBottomColor: despachoColor }]]}
          onPress={() => setTabActiva('historial')}
        >
          <Ionicons name="receipt-outline" size={16} color={tabActiva === 'historial' ? despachoColor : '#718096'} />
          <Text style={[estilos.textoTab, tabActiva === 'historial' && { color: despachoColor, fontWeight: '700' }]}>
            Ventas del turno
          </Text>
          {ventas.length > 0 && tabActiva !== 'historial' && (
            <View style={[estilos.badgeTab, { backgroundColor: despachoColor }]}>
              <Text style={estilos.textoBadgeTab}>{ventas.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* TAB: Nueva Venta */}
      {tabActiva === 'venta' && (
        <>
          <View style={estilos.contenedorBusqueda}>
            <Ionicons name="search" size={18} color="#718096" style={{ marginRight: 8 }} />
            <TextInput
              style={estilos.inputBusqueda}
              placeholder="Buscar producto del despacho..."
              placeholderTextColor="#a0aec0"
              value={busqueda}
              onChangeText={setBusqueda}
              clearButtonMode="while-editing"
            />
          </View>

          {cargando ? (
            <View style={estilos.centrado}><ActivityIndicator size="large" color={despachoColor} /></View>
          ) : (
            <FlatList
              data={productosFiltrados}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: itemsCesta.length > 0 ? 140 : 20 }}
              renderItem={({ item }) => {
                const qty = cesta.get(item.id) ?? 0;
                const enCesta = qty > 0;
                return (
                  <View style={[estilos.tarjetaProducto, enCesta && [estilos.tarjetaActiva, { borderColor: despachoColor }]]}>
                    <View style={estilos.infoProducto}>
                      <Text style={estilos.nombreProducto}>{item.nombre}</Text>
                      <Text style={[estilos.precioProducto, { color: despachoColor }]}>
                        {item.precio.toFixed(2)} CUP
                      </Text>
                    </View>
                    <View style={estilos.controles}>
                      <TouchableOpacity
                        style={[estilos.botonControl, qty === 0 && estilos.botonDeshabilitado, { backgroundColor: qty === 0 ? '#cbd5e0' : despachoColor }]}
                        onPress={() => cambiarCantidad(item.id, Math.max(0, qty - 1))}
                        disabled={qty === 0}
                      >
                        <Text style={estilos.textoControl}>−</Text>
                      </TouchableOpacity>
                      <Text style={[estilos.cantidad, enCesta && estilos.cantidadActiva]}>{qty}</Text>
                      <TouchableOpacity
                        style={[estilos.botonControl, { backgroundColor: despachoColor }]}
                        onPress={() => cambiarCantidad(item.id, qty + 1)}
                      >
                        <Text style={estilos.textoControl}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                busqueda !== '' ? (
                  <EstadoVacio icono="search-outline" titulo="Sin resultados" descripcion={`No hay productos que coincidan con "${busqueda}"`} />
                ) : (
                  <EstadoVacio
                    icono="cube-outline"
                    titulo="Sin productos en el catálogo"
                    descripcion={`Agrega productos al catálogo de ${despachoNombre} para vender más rápido.`}
                  />
                )
              }
            />
          )}

          {/* Cesta flotante */}
          {itemsCesta.length > 0 && (
            <View style={[estilos.cestaFlotante, { backgroundColor: despachoColor }]}>
              <View>
                <Text style={estilos.textoCestaProductos}>
                  {itemsCesta.length} producto{itemsCesta.length !== 1 ? 's' : ''}
                </Text>
                <Text style={estilos.textoCestaTotal}>{formatCUP(totalCesta)} CUP</Text>
              </View>
              <TouchableOpacity
                style={estilos.botonCobrar}
                onPress={abrirCobro}
                disabled={procesando}
              >
                <Text style={[estilos.textoBotonCobrar, { color: despachoColor }]}>COBRAR</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* TAB: Historial */}
      {tabActiva === 'historial' && (
        <FlatList
          data={ventas}
          keyExtractor={(item) => item.venta_id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          onRefresh={cargarHistorial}
          refreshing={cargandoHistorial}
          renderItem={({ item }) => (
            <View style={estilos.tarjetaVenta}>
              <View style={estilos.cabeceraVenta}>
                <Text style={estilos.horaVenta}>{formatearHora(item.fecha_hora)}</Text>
                <View style={[
                  estilos.etiquetaMetodo,
                  item.metodo_pago === 'efectivo'
                    ? { backgroundColor: '#f0fff4', borderColor: '#38a169' }
                    : { backgroundColor: '#ebf8ff', borderColor: '#2b6cb0' }
                ]}>
                  <Ionicons
                    name={item.metodo_pago === 'efectivo' ? 'cash-outline' : 'card-outline'}
                    size={12}
                    color={item.metodo_pago === 'efectivo' ? '#38a169' : '#2b6cb0'}
                  />
                  <Text style={[estilos.textoMetodo, { color: item.metodo_pago === 'efectivo' ? '#2f855a' : '#2b6cb0' }]}>
                    {item.metodo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                  </Text>
                </View>
                <Text style={[estilos.totalVenta, { color: despachoColor }]}>
                  {formatCUP(item.total)} CUP
                </Text>
              </View>
              <View style={estilos.itemsVenta}>
                {item.items.map((i, idx) => (
                  <Text key={idx} style={estilos.textoItemVenta}>
                    {i.cantidad}x {i.nombre_producto} — {formatCUP(i.cantidad * i.precio_aplicado)} CUP
                  </Text>
                ))}
              </View>
              <TouchableOpacity
                style={estilos.botonAnular}
                onPress={() => handleCancelarVenta(item.venta_id)}
              >
                <Text style={estilos.textoBotonAnular}>ANULAR</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <EstadoVacio
              icono="receipt-outline"
              titulo="Sin ventas en este turno"
              descripcion={`Las ventas de ${despachoNombre} aparecerán aquí.`}
            />
          }
        />
      )}

      {/* Modal de cobro */}
      <Modal visible={modalCobroVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={estilos.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={cerrarCobro} />
          <Animated.View style={[estilos.modalCobro, { transform: [{ translateY: slideAnim }] }]}>
            <View style={estilos.barraArrastre} />
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Total */}
              <View style={[estilos.seccionTotal, { borderColor: despachoColor + '40' }]}>
                <Text style={estilos.etiquetaTotal}>TOTAL A COBRAR</Text>
                <Text style={[estilos.valorTotal, { color: despachoColor }]}>
                  {formatCUP(totalCesta)} CUP
                </Text>
                <View style={[estilos.badgeExterno, { backgroundColor: despachoColor + '18' }]}>
                  <Ionicons name="storefront-outline" size={12} color={despachoColor} />
                  <Text style={[estilos.textoExterno, { color: despachoColor }]}>
                    {despachoNombre} — dinero NO entra a tu caja
                  </Text>
                </View>
              </View>

              {/* Método de pago */}
              <Text style={estilos.subtituloCobro}>Método de Pago</Text>
              <View style={estilos.gridMetodos}>
                {(['efectivo', 'transferencia'] as const).map((metodo) => (
                  <TouchableOpacity
                    key={metodo}
                    style={[
                      estilos.botonMetodo,
                      metodoPago === metodo && [estilos.botonMetodoActivo, { borderColor: despachoColor, backgroundColor: despachoColor }]
                    ]}
                    onPress={() => setMetodoPago(metodo)}
                  >
                    <Ionicons
                      name={metodo === 'efectivo' ? 'cash' : 'card'}
                      size={28}
                      color={metodoPago === metodo ? '#ffffff' : '#718096'}
                    />
                    <Text style={[estilos.textoMetodoPago, metodoPago === metodo && { color: '#ffffff' }]}>
                      {metodo === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Monto recibido (efectivo) */}
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
                </View>
              )}

              {/* Resumen productos */}
              <Text style={estilos.subtituloCobro}>Productos ({itemsCesta.length})</Text>
              {itemsCesta.map((item, i) => (
                <View key={i} style={estilos.filaProductoCobro}>
                  <Text style={estilos.nombreProductoCobro}>{item.cantidad}x {item.nombre}</Text>
                  <Text style={estilos.precioProductoCobro}>{formatCUP(item.precio * item.cantidad)} CUP</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[
                estilos.botonConfirmarCobro,
                { backgroundColor: botonCobroDeshabilitado ? '#a0aec0' : despachoColor }
              ]}
              onPress={handleConfirmarVenta}
              disabled={botonCobroDeshabilitado}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f7fafc' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bannerDespacho: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  textoBanner: { fontSize: 13, fontWeight: '600' },
  tabs: {
    flexDirection: 'row', backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#edf2f7',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 12,
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabActiva: {},
  textoTab: { fontSize: 14, color: '#718096', fontWeight: '600' },
  badgeTab: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', marginLeft: 2,
  },
  textoBadgeTab: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  contenedorBusqueda: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    margin: 12, paddingHorizontal: 12, borderRadius: 12, height: 46,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  inputBusqueda: { flex: 1, fontSize: 15, color: '#2d3748' },
  tarjetaProducto: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    marginHorizontal: 12, marginVertical: 4, flexDirection: 'row',
    alignItems: 'center', elevation: 1, borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  tarjetaActiva: { backgroundColor: '#faf5ff' },
  infoProducto: { flex: 1, marginRight: 12 },
  nombreProducto: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 2 },
  precioProducto: { fontSize: 14, fontWeight: '700' },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botonControl: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  botonDeshabilitado: {},
  textoControl: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', lineHeight: 24 },
  cantidad: { fontSize: 18, fontWeight: 'bold', color: '#a0aec0', textAlign: 'center', minWidth: 28 },
  cantidadActiva: { color: '#1a1a2e' },
  cestaFlotante: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 28,
    elevation: 10,
  },
  textoCestaProductos: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 2 },
  textoCestaTotal: { color: '#ffffff', fontSize: 26, fontWeight: 'bold' },
  botonCobrar: {
    backgroundColor: '#ffffff', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  textoBotonCobrar: { fontSize: 16, fontWeight: 'bold' },

  // Historial
  tarjetaVenta: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    marginBottom: 10, elevation: 1,
    borderWidth: 1, borderColor: '#edf2f7',
  },
  cabeceraVenta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  horaVenta: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  etiquetaMetodo: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  textoMetodo: { fontSize: 12, fontWeight: '700' },
  totalVenta: { fontSize: 15, fontWeight: 'bold' },
  itemsVenta: { borderTopWidth: 1, borderTopColor: '#f0f4f8', paddingTop: 8, gap: 4, marginBottom: 10 },
  textoItemVenta: { fontSize: 13, color: '#4a5568' },
  botonAnular: {
    borderWidth: 1.5, borderColor: '#e53e3e', borderRadius: 8,
    padding: 10, alignItems: 'center', backgroundColor: '#fff5f5',
  },
  textoBotonAnular: { color: '#e53e3e', fontSize: 13, fontWeight: 'bold' },

  // Modal cobro
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCobro: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12, maxHeight: '92%', elevation: 20,
  },
  barraArrastre: {
    width: 40, height: 5, backgroundColor: '#e2e8f0',
    borderRadius: 3, alignSelf: 'center', marginBottom: 16,
  },
  seccionTotal: {
    borderWidth: 1, borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 20,
  },
  etiquetaTotal: { fontSize: 11, color: '#718096', fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  valorTotal: { fontSize: 34, fontWeight: '900', marginBottom: 8 },
  badgeExterno: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  textoExterno: { fontSize: 12, fontWeight: '600' },
  subtituloCobro: { fontSize: 14, fontWeight: 'bold', color: '#718096', marginBottom: 10 },
  gridMetodos: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  botonMetodo: {
    flex: 1, height: 88, borderRadius: 14, borderWidth: 2,
    borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  botonMetodoActivo: {},
  textoMetodoPago: { fontSize: 13, fontWeight: 'bold', color: '#718096', marginTop: 6 },
  seccionEfectivo: { marginBottom: 18 },
  etiquetaInput: { fontSize: 13, color: '#718096', marginBottom: 6 },
  contenedorInputMonto: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2,
    borderColor: '#cbd5e0', borderRadius: 12, backgroundColor: '#f7fafc', paddingRight: 14,
  },
  inputMonto: { flex: 1, padding: 14, fontSize: 22, fontWeight: 'bold', color: '#1a1a2e' },
  sufijoMonto: { fontSize: 14, fontWeight: 'bold', color: '#a0aec0' },
  contenedorCambio: {
    marginTop: 12, backgroundColor: '#f0fff4', padding: 14,
    borderRadius: 10, borderWidth: 1, borderColor: '#c6f6d5', alignItems: 'center',
  },
  etiquetaCambio: { fontSize: 11, color: '#2f855a', fontWeight: 'bold', marginBottom: 2 },
  valorCambio: { fontSize: 22, fontWeight: '900', color: '#22543d' },
  filaProductoCobro: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f0f4f8',
  },
  nombreProductoCobro: { fontSize: 13, color: '#718096', flex: 1 },
  precioProductoCobro: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
  botonConfirmarCobro: {
    padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20,
  },
  textoBotonConfirmarCobro: { color: '#ffffff', fontSize: 17, fontWeight: 'bold', letterSpacing: 1 },
});