import { useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Animated, ActivityIndicator,
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
import ModalCobro from '../components/ModalCobro';

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
      <ModalCobro
        visible={hook.modalActivo === 'cobro'}
        items={pedido.items.map(item => ({
          producto: {
            id: item.producto_id ?? item.id,
            nombre: item.nombre_producto,
            precio: item.precio_aplicado,
            existencia: 999,
            alerta_minima: 0,
            precio_costo: 0,
          },
          cantidad: item.cantidad,
          precioFinal: item.precio_aplicado,
        }))}
        metodoPagoInicial="efectivo"
        tituloPedido={pedido.nombre}
        desglose={totalesSeparados}
        onConfirmar={(metodo, _monto, cambio, propina) => {
          hook.handleCerrarCuenta(metodo, cambio, propina);
        }}
        onCancelar={hook.cerrarModal}
        procesando={hook.procesando}
      />
    </SafeAreaView>
  );
}

// ── Estilos de la pantalla principal ─────────────────────────────────────────
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
});