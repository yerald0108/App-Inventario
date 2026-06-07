import { useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ScrollView, Animated, Pressable, Platform,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { PedidoItem } from '../database/pedidos';
import { formatCUP, sumaSegura } from '../utils';
import EstadoVacio from '../components/EstadoVacio';
import ModalAgregarProductoPedido from '../components/pedido/ModalAgregarProductoPedido';
import { usePedidoDetalle } from '../hooks/usePedidoDetalle';
import { usePanResponderSlide } from '../hooks/usePanResponderSlide';

// ── Estilos del modal de cobro (propina) ──────────────────────────────────────
const estilosModalCobro = StyleSheet.create({
  contenedorPropina: { backgroundColor: '#fffff0', borderColor: '#d69e2e' },
  etiquetaPropina: { color: '#b7791f' },
  valorPropina: { color: '#744210' },
  etiquetaSelector: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 12, marginBottom: 8 },
  gridSelector: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  botonSelector: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 2,
    borderColor: '#bee3f8', backgroundColor: '#ebf8ff',
  },
  botonSelectorActivo: { backgroundColor: '#2b6cb0', borderColor: '#2b6cb0' },
  botonSelectorPropina: { backgroundColor: '#d69e2e', borderColor: '#d69e2e' },
  textoBotonSelector: { fontSize: 13, fontWeight: '700', color: '#2b6cb0' },
  textoBotonSelectorActivo: { color: '#ffffff' },
});

type Props = {
  route: RouteProp<RootStackParamList, 'DetallePedido'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'DetallePedido'>;
};

export default function PantallaDetallePedido({ route, navigation }: Props) {
  const { pedidoId } = route.params;
  const slideAnim = useRef(new Animated.Value(600)).current;

  const hook = usePedidoDetalle(pedidoId, navigation);
  const { panHandlers } = usePanResponderSlide(slideAnim, hook.cerrarModal);

  // Sincronizar animación del slide con el modal activo
  useEffect(() => {
    if (hook.modalActivo !== 'ninguno') {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start();
    }
  }, [hook.modalActivo, slideAnim]);

  if (hook.cargando) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}><ActivityIndicator size="large" color="#2b6cb0" /></View>
      </SafeAreaView>
    );
  }

  if (!hook.pedido) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <EstadoVacio icono="alert-circle-outline" titulo="Pedido no encontrado" />
      </SafeAreaView>
    );
  }

  const { pedido, totalesSeparados } = hook;
  const totalDespachoGlobal = sumaSegura([...totalesSeparados.porDespacho.values()].map(d => d.total));

  function renderEtiquetaOrigen(item: PedidoItem) {
    if (item.origen === 'propio') return null;
    const despacho = hook.despachos.find(d => d.id === item.despacho_id);
    const color = despacho?.color ?? '#805ad5';
    const nombre = despacho?.nombre ?? 'Despacho';
    return (
      <View style={[estilos.etiquetaDespacho, { backgroundColor: color + '22', borderColor: color + '66' }]}>
        <Ionicons name="storefront-outline" size={10} color={color} />
        <Text style={[estilos.textoEtiquetaDespacho, { color }]} numberOfLines={1}>{nombre}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>

      {/* ── Nombre editable ── */}
      <View style={estilos.headerPedido}>
        {hook.editandoNombre ? (
          <View style={estilos.filaEditarNombre}>
            <TextInput
              style={estilos.inputNombrePedido}
              value={hook.nombreTemp}
              onChangeText={hook.setNombreTemp}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={hook.handleGuardarNombre}
              onBlur={hook.handleGuardarNombre}
            />
            <TouchableOpacity onPress={hook.handleGuardarNombre} style={estilos.botonGuardarNombre}>
              <Ionicons name="checkmark" size={20} color="#38a169" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={estilos.filaEditarNombre}
            onPress={() => { hook.setNombreTemp(pedido.nombre); hook.setEditandoNombre(true); }}
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
          const despacho = esDespacho ? hook.despachos.find(d => d.id === item.despacho_id) : null;
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
                    if (item.cantidad <= 1) hook.handleEliminarItem(item);
                    else hook.handleCambiarCantidad(item, -1);
                  }}
                >
                  <Ionicons name={item.cantidad <= 1 ? 'trash-outline' : 'remove'} size={16} color="#ffffff" />
                </TouchableOpacity>
                <Text style={estilos.cantidadItem}>{item.cantidad}</Text>
                <TouchableOpacity
                  style={estilos.botonCantidad}
                  onPress={() => hook.handleCambiarCantidad(item, 1)}
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
        {totalesSeparados.propio > 0 && totalDespachoGlobal > 0 && (
          <View style={estilos.desgloseBar}>
            <View style={estilos.chipDesglose}>
              <Ionicons name="storefront-outline" size={12} color="#ffffff" />
              <Text style={estilos.textoChipDesglose}>Tuyo: {formatCUP(totalesSeparados.propio)}</Text>
            </View>
            {[...totalesSeparados.porDespacho.entries()].map(([id, d]) => (
              <View key={id} style={[estilos.chipDesglose, { backgroundColor: d.color }]}>
                <Ionicons name="storefront-outline" size={12} color="#ffffff" />
                <Text style={estilos.textoChipDesglose}>{d.nombre}: {formatCUP(d.total)}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={estilos.seccionTotal}>
          <Text style={estilos.etiquetaTotalBar}>Total</Text>
          <Text style={estilos.valorTotalBar}>{formatCUP(pedido.total)} CUP</Text>
        </View>
        <View style={estilos.botonesBar}>
          <TouchableOpacity style={estilos.botonAgregar} onPress={hook.abrirModalAgregar}>
            <Ionicons name="add-circle-outline" size={20} color="#2b6cb0" />
            <Text style={estilos.textoBotonAgregar}>Agregar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[estilos.botonCerrarCuenta, pedido.items.length === 0 && estilos.botonDeshabilitado]}
            onPress={hook.abrirModalCobro}
            disabled={pedido.items.length === 0}
          >
            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            <Text style={estilos.textoBotonCerrarCuenta}>Cobrar cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Modal agregar productos ── */}
      <ModalAgregarProductoPedido
        visible={hook.modalActivo === 'agregarProducto'}
        pedidoNombre={pedido.nombre}
        slideAnim={slideAnim}
        panHandlers={panHandlers}
        fuenteAgregar={hook.fuenteAgregar}
        onCambiarFuente={hook.cambiarFuenteAgregar}
        busqueda={hook.busqueda}
        onCambiarBusqueda={hook.setBusqueda}
        productosFiltrados={hook.productosFiltrados}
        cargandoProductos={hook.cargandoProductos}
        onAgregarPropio={hook.handleAgregarProductoPropio}
        despachos={hook.despachos}
        despachoSeleccionado={hook.despachoSeleccionado}
        onSeleccionarDespacho={hook.setDespachoSeleccionado}
        productosDespachoFiltrados={hook.productosDespachoFiltrados}
        cargandoDespacho={hook.cargandoDespacho}
        onAgregarDespacho={hook.handleAgregarProductoDespacho}
        onCerrar={hook.cerrarModal}
      />

      {/* ── Modal cobro ── */}
      <Modal visible={hook.modalActivo === 'cobro'} transparent animationType="fade">
        <KeyboardAvoidingView
          style={estilos.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={hook.cerrarModal} />
          <Animated.View style={[estilos.modalCobro, { transform: [{ translateY: slideAnim }] }]}>
            <View style={estilos.barraArrastre} {...panHandlers} />
            <ScrollView showsVerticalScrollIndicator={false}>

              <View style={estilos.seccionTotalCobro}>
                <Text style={estilos.etiquetaTotalCobro}>TOTAL A COBRAR</Text>
                <Text style={estilos.valorTotalCobro}>{formatCUP(pedido.total)} CUP</Text>
                <Text style={estilos.nombreEnCobro}>{pedido.nombre}</Text>
              </View>

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

              <Text style={estilos.subtituloCobro}>Método de Pago</Text>
              <View style={estilos.gridMetodos}>
                {(['efectivo', 'transferencia'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[estilos.botonMetodo, hook.metodoPago === m && estilos.botonMetodoActivo]}
                    onPress={() => hook.setMetodoPago(m)}
                  >
                    <Ionicons name={m === 'efectivo' ? 'cash' : 'card'} size={30}
                      color={hook.metodoPago === m ? '#ffffff' : '#718096'} />
                    <Text style={[estilos.textoMetodo, hook.metodoPago === m && { color: '#ffffff' }]}>
                      {m === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {hook.metodoPago === 'efectivo' && (
                <View style={estilos.seccionEfectivo}>
                  <Text style={estilos.etiquetaInput}>Monto recibido</Text>
                  <View style={estilos.contenedorInputMonto}>
                    <TextInput
                      style={estilos.inputMonto}
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={hook.montoRecibido}
                      onChangeText={hook.setMontoRecibido}
                      autoFocus
                    />
                    <Text style={estilos.sufijoMonto}>CUP</Text>
                  </View>
                  {hook.montoRecibido !== '' && parseFloat(hook.montoRecibido) < pedido.total && (
                    <Text style={estilos.textoError}>Monto insuficiente para cubrir el total</Text>
                  )}

                  {hook.cambio > 0 && (
                    <View>
                      <View style={[estilos.contenedorCambio, hook.usarPropina && estilosModalCobro.contenedorPropina]}>
                        <Text style={[estilos.etiquetaCambio, hook.usarPropina && estilosModalCobro.etiquetaPropina]}>
                          {hook.usarPropina ? '⭐ PROPINA' : 'CAMBIO (VUELTO)'}
                        </Text>
                        <Text style={[estilos.valorCambio, hook.usarPropina && estilosModalCobro.valorPropina]}>
                          {formatCUP(hook.cambio)} CUP
                        </Text>
                      </View>
                      <Text style={estilosModalCobro.etiquetaSelector}>¿Qué hacer con este dinero?</Text>
                      <View style={estilosModalCobro.gridSelector}>
                        <TouchableOpacity
                          style={[estilosModalCobro.botonSelector, !hook.usarPropina && estilosModalCobro.botonSelectorActivo]}
                          onPress={() => hook.setUsarPropina(false)}
                        >
                          <Ionicons name="arrow-undo-outline" size={20} color={!hook.usarPropina ? '#ffffff' : '#2b6cb0'} />
                          <Text style={[estilosModalCobro.textoBotonSelector, !hook.usarPropina && estilosModalCobro.textoBotonSelectorActivo]}>
                            Devolver al cliente
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[estilosModalCobro.botonSelector, hook.usarPropina && estilosModalCobro.botonSelectorPropina]}
                          onPress={() => hook.setUsarPropina(true)}
                        >
                          <Ionicons name="star-outline" size={20} color={hook.usarPropina ? '#ffffff' : '#d69e2e'} />
                          <Text style={[estilosModalCobro.textoBotonSelector, hook.usarPropina && estilosModalCobro.textoBotonSelectorActivo]}>
                            Registrar propina
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <Text style={estilos.subtituloCobro}>Resumen ({pedido.items.length} productos)</Text>
              {pedido.items.map((item) => {
                const esDespacho = item.origen === 'despacho';
                const despacho = esDespacho ? hook.despachos.find(d => d.id === item.despacho_id) : null;
                return (
                  <View key={item.id} style={estilos.filaResumenItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.nombreResumenItem}>{item.cantidad}× {item.nombre_producto}</Text>
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
              style={[estilos.botonConfirmarCobro, hook.botonCobroDeshabilitado && estilos.botonDeshabilitado]}
              onPress={hook.handleCerrarCuenta}
              disabled={hook.botonCobroDeshabilitado}
            >
              <View style={estilos.filaBotonCobro}>
                {hook.procesando && <ActivityIndicator size="small" color="#ffffff" />}
                <Text style={estilos.textoBotonConfirmarCobro}>
                  {hook.procesando ? 'PROCESANDO...' : 'CONFIRMAR COBRO'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Estilos de la pantalla principal ─────────────────────────────────────────
const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f0f4f8' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  barraArrastre: {
    width: 40, height: 5, backgroundColor: '#e2e8f0',
    borderRadius: 3, alignSelf: 'center', marginBottom: 16,
  },

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
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, borderWidth: 1,
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
    backgroundColor: '#2b6cb0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
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
  seccionDesgloseCobro: {
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0',
  },
  tituloDesgloseCobro: { fontSize: 13, fontWeight: '700', color: '#4a5568', marginBottom: 10 },
  filaDesgloseCobro: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  filaIconoDesglose: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  etiquetaDesgloseCobro: { fontSize: 14, color: '#4a5568', fontWeight: '600' },
  ladoDerechoDesglose: { alignItems: 'flex-end', gap: 3 },
  valorDesgloseCobro: { fontSize: 14, fontWeight: '800', color: '#2b6cb0' },
  badgeVaTuCaja: {
    backgroundColor: '#f0fff4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#9ae6b4',
  },
  textoVaTuCaja: { fontSize: 10, color: '#2f855a', fontWeight: '700' },
  badgeNoTuCaja: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, backgroundColor: 'transparent' },
  textoNoTuCaja: { fontSize: 10, fontWeight: '700' },
  notaDesglose: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#edf2f7',
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f4f8',
  },
  nombreResumenItem: { fontSize: 13, color: '#64748b', flex: 1 },
  etiquetaResumenDespacho: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  subtotalResumenItem: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  botonConfirmarCobro: {
    backgroundColor: '#38a169', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20,
  },
  filaBotonCobro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textoBotonConfirmarCobro: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
});