import {
  Modal, View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Animated, Pressable, Platform,
  KeyboardAvoidingView, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Producto } from '../../types';
import { Despacho, ProductoDespacho } from '../../database/despachos';
import ProductoParaAgregar from './ProductoParaAgregar';
import ProductoDespachoParaAgregar from './ProductoDespachoParaAgregar';
import { FuenteAgregar } from '../../hooks/usePedidoDetalle';

type ItemListaModal = Producto | { __separador: true; id: number };

interface Props {
  visible: boolean;
  pedidoNombre: string;
  slideAnim: Animated.Value;
  panHandlers: any;
  // Fuente toggle
  fuenteAgregar: FuenteAgregar;
  onCambiarFuente: (fuente: FuenteAgregar) => void;
  // Búsqueda
  busqueda: string;
  onCambiarBusqueda: (texto: string) => void;
  // Inventario
  productosFiltrados: ItemListaModal[];
  cargandoProductos: boolean;
  onAgregarPropio: (producto: Producto, cantidad: number) => void;
  // Despachos
  despachos: Despacho[];
  despachoSeleccionado: Despacho | null;
  onSeleccionarDespacho: (despacho: Despacho | null) => void;
  productosDespachoFiltrados: ProductoDespacho[];
  cargandoDespacho: boolean;
  onAgregarDespacho: (producto: ProductoDespacho, despachoId: number, cantidad: number) => void;
  // Control
  onCerrar: () => void;
}

export default function ModalAgregarProductoPedido({
  visible, pedidoNombre, slideAnim, panHandlers,
  fuenteAgregar, onCambiarFuente,
  busqueda, onCambiarBusqueda,
  productosFiltrados, cargandoProductos, onAgregarPropio,
  despachos, despachoSeleccionado, onSeleccionarDespacho,
  productosDespachoFiltrados, cargandoDespacho, onAgregarDespacho,
  onCerrar,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={estilos.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onCerrar} />
        <Animated.View style={[estilos.modal, { transform: [{ translateY: slideAnim }] }]}>
          <View style={estilos.barraArrastre} {...panHandlers} />

          <View style={estilos.cabecera}>
            <Text style={estilos.titulo}>Agregar productos</Text>
            <Text style={estilos.subtitulo}>{pedidoNombre}</Text>
          </View>

          {/* Toggle inventario / despacho */}
          <View style={estilos.toggleFuente}>
            <TouchableOpacity
              style={[estilos.botonToggle, fuenteAgregar === 'inventario' && estilos.botonToggleActivo]}
              onPress={() => onCambiarFuente('inventario')}
            >
              <Ionicons name="cube-outline" size={16} color={fuenteAgregar === 'inventario' ? '#ffffff' : '#4a5568'} />
              <Text style={[estilos.textoToggle, fuenteAgregar === 'inventario' && estilos.textoToggleActivo]}>
                Mi Inventario
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.botonToggle, fuenteAgregar === 'despacho' && estilos.botonToggleActivo]}
              onPress={() => onCambiarFuente('despacho')}
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
                  onChangeText={onCambiarBusqueda}
                  clearButtonMode="while-editing"
                />
              </View>

              {cargandoProductos ? (
                <View style={estilos.centrado}>
                  <ActivityIndicator size="large" color="#2b6cb0" />
                </View>
              ) : (
                <FlatList
                  data={productosFiltrados}
                  keyExtractor={(item) => '__separador' in item ? 'sep' : item.id.toString()}
                  style={estilos.lista}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={estilos.centrado}>
                      <Text style={estilos.textoVacio}>
                        {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin productos en inventario'}
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    if ('__separador' in item) {
                      return (
                        <View style={estilos.separador}>
                          <View style={estilos.lineaSep} />
                          <Text style={estilos.textoSep}>Sin existencia</Text>
                          <View style={estilos.lineaSep} />
                        </View>
                      );
                    }
                    return (
                      <ProductoParaAgregar
                        producto={item as Producto}
                        onAgregar={onAgregarPropio}
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
              {!despachoSeleccionado ? (
                <View style={estilos.lista}>
                  {despachos.length === 0 ? (
                    <View style={estilos.centrado}>
                      <Ionicons name="storefront-outline" size={48} color="#cbd5e0" />
                      <Text style={estilos.textoVacio}>No hay despachos configurados</Text>
                    </View>
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <Text style={estilos.etiquetaSelector}>Selecciona un despacho</Text>
                      {despachos.map(d => (
                        <TouchableOpacity
                          key={d.id}
                          style={[estilos.tarjetaDespacho, { borderLeftColor: d.color }]}
                          onPress={() => onSeleccionarDespacho(d)}
                        >
                          <View style={[estilos.avatarDespacho, { backgroundColor: d.color + '22' }]}>
                            <Ionicons name="storefront" size={22} color={d.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={estilos.nombreDespacho}>{d.nombre}</Text>
                            {d.descripcion ? (
                              <Text style={estilos.descDespacho} numberOfLines={1}>{d.descripcion}</Text>
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
                  <TouchableOpacity
                    style={[estilos.cabeceraDespachoActivo, { borderColor: despachoSeleccionado.color }]}
                    onPress={() => onSeleccionarDespacho(null)}
                  >
                    <View style={[estilos.puntoDespacho, { backgroundColor: despachoSeleccionado.color }]} />
                    <Text style={[estilos.nombreDespachoActivo, { color: despachoSeleccionado.color }]}>
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
                      onChangeText={onCambiarBusqueda}
                      clearButtonMode="while-editing"
                    />
                  </View>

                  {cargandoDespacho ? (
                    <View style={estilos.centrado}>
                      <ActivityIndicator size="large" color={despachoSeleccionado.color} />
                    </View>
                  ) : (
                    <FlatList
                      data={productosDespachoFiltrados}
                      keyExtractor={(item) => item.id.toString()}
                      style={estilos.lista}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      ListEmptyComponent={
                        <View style={estilos.centrado}>
                          <Text style={estilos.textoVacio}>
                            {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin productos en este despacho'}
                          </Text>
                        </View>
                      }
                      renderItem={({ item }) => (
                        <ProductoDespachoParaAgregar
                          producto={item}
                          despachoId={despachoSeleccionado.id}
                          color={despachoSeleccionado.color}
                          onAgregar={onAgregarDespacho}
                        />
                      )}
                    />
                  )}
                </>
              )}
            </>
          )}

          <TouchableOpacity style={estilos.botonCerrar} onPress={onCerrar}>
            <Text style={estilos.textoBotonCerrar}>Cerrar</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    height: '92%', elevation: 20,
  },
  barraArrastre: {
    width: 40, height: 5, backgroundColor: '#e2e8f0',
    borderRadius: 3, alignSelf: 'center', marginBottom: 16,
  },
  cabecera: { marginBottom: 12 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', textAlign: 'center' },
  subtitulo: { fontSize: 14, color: '#2b6cb0', textAlign: 'center', fontWeight: '600', marginTop: 4 },
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
  lista: { flex: 1 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  textoVacio: { fontSize: 15, color: '#a0aec0', textAlign: 'center' },
  separador: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 4, marginVertical: 8, gap: 8,
  },
  lineaSep: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  textoSep: { fontSize: 11, color: '#a0aec0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  etiquetaSelector: { fontSize: 13, color: '#718096', fontWeight: '600', marginBottom: 12, marginTop: 4 },
  tarjetaDespacho: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderLeftWidth: 4,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  avatarDespacho: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nombreDespacho: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  descDespacho: { fontSize: 13, color: '#718096', marginTop: 2 },
  cabeceraDespachoActivo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f7fafc', borderRadius: 12, padding: 10,
    borderWidth: 1.5, marginBottom: 10,
  },
  puntoDespacho: { width: 10, height: 10, borderRadius: 5 },
  nombreDespachoActivo: { flex: 1, fontSize: 14, fontWeight: '700' },
  botonCerrar: {
    alignItems: 'center', padding: 14,
    borderTopWidth: 1, borderTopColor: '#f0f4f8', marginTop: 4,
  },
  textoBotonCerrar: { fontSize: 15, color: '#718096', fontWeight: '600' },
});