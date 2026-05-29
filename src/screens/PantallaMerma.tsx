import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert,
  TextInput, TouchableOpacity, Modal, ScrollView,
  Animated, Pressable, PanResponder, Platform,
  KeyboardAvoidingView, ActivityIndicator
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Producto } from '../types';
import { obtenerTurnoAbierto } from '../database/turnos';
import {
  registrarMerma, MotivoMerma,
  MOTIVOS_MERMA, ItemMerma
} from '../database/mermas';
import { useCestaStore, NAMESPACE_MERMA } from '../store/useCestaStore';
import { useProductos } from '../context/ProductosContext';
import EstadoVacio from '../components/EstadoVacio';
import { SkeletonProducto } from '../components/Skeleton';
import { formatCUP } from '../utils';

type ItemLista = Producto | { __tipo: 'separador'; id: number };

export default function PantallaMerma() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { productos, cargandoProductos: cargando, cargarProductos, cargarMasProductos, cargandoMas } = useProductos();
  
  const {
    namespaces,
    setBusqueda,
    cambiarCantidad,
    obtenerItemsCesta,
    resetCesta,
  } = useCestaStore();

  const { cesta, busqueda } = namespaces[NAMESPACE_MERMA] ?? { cesta: {}, busqueda: '' };

  const productosConSeparador = useMemo((): ItemLista[] => {
    if (productos.length === 0) return [];
    const disponibles = productos.filter(p => p.existencia > 0);
    const agotados = productos.filter(p => p.existencia <= 0);
    if (agotados.length === 0) return disponibles;
    return [...disponibles, { __tipo: 'separador' as const, id: -1 }, ...agotados];
  }, [productos]);

  // Búsqueda remota (debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarProductos(busqueda);
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda, cargarProductos]);

  const [modalVisible, setModalVisible] = useState(false);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<MotivoMerma | null>(null);
  const [motivoDetalle, setMotivoDetalle] = useState('');
  const [procesando, setProcesando] = useState(false);
  const procesandoRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => { if (g.dy > 0) slideAnim.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 150 || g.vy > 0.5) {
          Animated.timing(slideAnim, {
            toValue: 600, duration: 200, useNativeDriver: true,
          }).start(cerrarModal);
        } else {
          Animated.spring(slideAnim, {
            toValue: 0, useNativeDriver: true, tension: 50, friction: 8,
          }).start();
        }
      },
    })
  ).current;

  // Badge en el header
  useEffect(() => {
    const totalItems = Object.values(cesta)
      .reduce((acc, item) => acc + item.cantidad, 0);
    navigation.setOptions({
      headerRight: () =>
        totalItems > 0 ? (
          <View style={estilos.badgeHeader}>
            <Text style={estilos.textoBadgeHeader}>{totalItems}</Text>
            <Text style={estilos.textoUnidadesBadge}> ud.</Text>
          </View>
        ) : null,
    });
  }, [cesta, navigation]);

  useFocusEffect(
    useCallback(() => {
      resetCesta(NAMESPACE_MERMA);
    }, [])
  );

  function abrirModal() {
    const items = obtenerItemsCesta(NAMESPACE_MERMA);
    if (items.length === 0) return;
    setMotivoSeleccionado(null);
    setMotivoDetalle('');
    setModalVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, tension: 50, friction: 8,
    }).start();
  }

  function cerrarModal() {
    setModalVisible(false);
    setMotivoSeleccionado(null);
    setMotivoDetalle('');
  }

  async function confirmarMerma() {
    if (!motivoSeleccionado) {
      Alert.alert('Error', 'Selecciona el motivo de la merma.');
      return;
    }
    if (motivoSeleccionado === 'otro' && !motivoDetalle.trim()) {
      Alert.alert('Error', 'Describe el motivo de la merma.');
      return;
    }
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setProcesando(true);

    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        Alert.alert('Error', 'No hay un turno abierto.');
        return;
      }

      const items = obtenerItemsCesta(NAMESPACE_MERMA);
      const itemsMerma: ItemMerma[] = items.map(i => ({
        productoId: i.producto.id,
        nombreProducto: i.producto.nombre,
        cantidad: i.cantidad,
      }));

      await registrarMerma(
        itemsMerma,
        motivoSeleccionado,
        motivoSeleccionado === 'otro' ? motivoDetalle.trim() : null,
        turno.id
      );

      await cargarProductos();
      cerrarModal();
      resetCesta(NAMESPACE_MERMA);

      const totalUnidades = items.reduce((acc, i) => acc + i.cantidad, 0);
      Toast.show({
        type: 'success',
        text1: 'Merma registrada',
        text2: `${totalUnidades} unidad${totalUnidades !== 1 ? 'es' : ''} dada${totalUnidades !== 1 ? 's' : ''} de baja.`,
        position: 'top',
        visibilityTime: 4000,
      });
    } catch (error: any) {
      const mensaje = error?.message?.includes('Stock insuficiente') || 
                      error?.message?.includes('ya no existe')
        ? error.message
        : 'No se pudo registrar la merma. Intenta de nuevo.';

      Toast.show({
        type: 'error',
        text1: 'Error al registrar merma',
        text2: mensaje,
        position: 'top',
        visibilityTime: 5000,
      });
      console.error(error);
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  }

  const itemsCesta = obtenerItemsCesta(NAMESPACE_MERMA);
  const totalUnidades = itemsCesta.reduce((acc, i) => acc + i.cantidad, 0);

  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4, 5].map(i => <SkeletonProducto key={i} />)}
    </View>
  );

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>

      {/* Banner informativo */}
      <View style={estilos.banner}>
        <Ionicons name="warning-outline" size={15} color="#c05621" />
        <Text style={estilos.textoBanner}>
          La merma descuenta stock sin registrar dinero
        </Text>
      </View>

      {/* Barra de búsqueda */}
      <View style={estilos.contenedorBusqueda}>
        <Ionicons name="search" size={20} color="#718096" style={{ marginRight: 8 }} />
        <TextInput
          style={estilos.inputBusqueda}
          placeholder="Buscar producto..."
          placeholderTextColor="#a0aec0"
          value={busqueda}
          onChangeText={(texto) => setBusqueda(NAMESPACE_MERMA, texto)}
          clearButtonMode="while-editing"
        />
      </View>

      {cargando ? renderSkeleton() : (
        <FlatList
          data={productosConSeparador as ItemLista[]}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => {
            if ('__tipo' in item && item.__tipo === 'separador') {
              return (
                <View style={estilos.separador}>
                  <View style={estilos.lineaSeparador} />
                  <Text style={estilos.textoSeparador}>Sin existencia</Text>
                  <View style={estilos.lineaSeparador} />
                </View>
              );
            }
            const producto = item as Producto;
            const itemEnCesta = cesta[producto.id];
            const cantidad = itemEnCesta?.cantidad ?? 0;

            return (
              <View style={[
                estilos.tarjeta,
                cantidad > 0 && estilos.tarjetaActiva,
                producto.existencia <= 0 && estilos.tarjetaAgotada,
              ]}>
                <View style={estilos.infoProducto}>
                  <Text style={estilos.nombreProducto} numberOfLines={1}>
                    {producto.nombre}
                  </Text>
                  <Text style={estilos.stockProducto}>
                    Stock: {producto.existencia} unid.
                  </Text>
                </View>
                <View style={estilos.controles}>
                  <TouchableOpacity
                    style={[estilos.botonControl, cantidad === 0 && estilos.botonDeshabilitado]}
                    onPress={() => cambiarCantidad(NAMESPACE_MERMA, producto, Math.max(0, cantidad - 1))}
                    disabled={cantidad === 0}
                  >
                    <Text style={estilos.textoControl}>−</Text>
                  </TouchableOpacity>
                  <Text style={[estilos.cantidad, cantidad > 0 && estilos.cantidadActiva]}>
                    {cantidad}
                  </Text>
                  <TouchableOpacity
                    style={[
                      estilos.botonControl,
                      producto.existencia <= 0 && estilos.botonDeshabilitado,
                      cantidad >= producto.existencia && estilos.botonLimite,
                    ]}
                    onPress={() => cambiarCantidad(NAMESPACE_MERMA, producto, Math.min(producto.existencia, cantidad + 1))}
                    disabled={producto.existencia <= 0}
                  >
                    <Text style={estilos.textoControl}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            busqueda !== '' ? (
              <EstadoVacio
                icono="search-outline"
                titulo="Sin resultados"
                descripcion={`No encontramos "${busqueda}"`}
              />
            ) : (
              <EstadoVacio
                icono="trash-outline"
                titulo="Sin productos"
                descripcion="Agrega productos en Inventario para registrar mermas."
              />
            )
          }
          contentContainerStyle={{ paddingBottom: itemsCesta.length > 0 ? 140 : 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Barra flotante */}
      {itemsCesta.length > 0 && (
        <View style={estilos.barraFlotante}>
          <View>
            <Text style={estilos.textoBarraProductos}>
              {itemsCesta.length} producto{itemsCesta.length !== 1 ? 's' : ''}
            </Text>
            <Text style={estilos.textoBarraUnidades}>
              {totalUnidades} unidad{totalUnidades !== 1 ? 'es' : ''} a dar de baja
            </Text>
          </View>
          <TouchableOpacity
            style={estilos.botonRegistrar}
            onPress={abrirModal}
            disabled={procesando}
          >
            <Text style={estilos.textoBotonRegistrar}>REGISTRAR</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de motivo */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={estilos.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={cerrarModal} />
          <Animated.View
            style={[estilos.modal, { transform: [{ translateY: slideAnim }] }]}
          >
            <View style={estilos.barraArrastre} {...panResponder.panHandlers} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={estilos.tituloModal}>Motivo de la merma</Text>
              <Text style={estilos.subtituloModal}>
                {itemsCesta.length} producto{itemsCesta.length !== 1 ? 's' : ''} · {totalUnidades} unidad{totalUnidades !== 1 ? 'es' : ''}
              </Text>

              {/* Resumen de productos */}
              <View style={estilos.resumenProductos}>
                {itemsCesta.map((item, idx) => (
                  <View key={idx} style={estilos.filaResumen}>
                    <Text style={estilos.nombreResumen} numberOfLines={1}>
                      {item.producto.nombre}
                    </Text>
                    <Text style={estilos.cantidadResumen}>
                      -{item.cantidad} unid.
                    </Text>
                  </View>
                ))}
              </View>

              {/* Selector de motivo */}
              <Text style={estilos.etiquetaMotivo}>¿Por qué se da de baja?</Text>
              <View style={estilos.gridMotivos}>
                {MOTIVOS_MERMA.map(motivo => (
                  <TouchableOpacity
                    key={motivo.valor}
                    style={[
                      estilos.botonMotivo,
                      motivoSeleccionado === motivo.valor && estilos.botonMotivoActivo,
                    ]}
                    onPress={() => setMotivoSeleccionado(motivo.valor)}
                  >
                    <Ionicons
                      name={motivo.icono as any}
                      size={22}
                      color={motivoSeleccionado === motivo.valor ? '#ffffff' : '#c05621'}
                    />
                    <Text style={[
                      estilos.textoBotonMotivo,
                      motivoSeleccionado === motivo.valor && estilos.textoBotonMotivoActivo,
                    ]}>
                      {motivo.etiqueta}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Campo de texto libre para "Otro" */}
              {motivoSeleccionado === 'otro' && (
                <View style={estilos.contenedorDetalle}>
                  <Text style={estilos.etiquetaDetalle}>Describe el motivo</Text>
                  <TextInput
                    style={estilos.inputDetalle}
                    value={motivoDetalle}
                    onChangeText={setMotivoDetalle}
                    placeholder="Ej: Caída accidental, producto mojado..."
                    placeholderTextColor="#a0aec0"
                    autoFocus
                    multiline
                    numberOfLines={2}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[
                  estilos.botonConfirmar,
                  (!motivoSeleccionado || procesando) && estilos.botonDeshabilitadoConfirmar,
                ]}
                onPress={confirmarMerma}
                disabled={!motivoSeleccionado || procesando}
              >
                <View style={estilos.filaBotonConfirmar}>
                  {procesando && <ActivityIndicator size="small" color="#ffffff" />}
                  <Text style={estilos.textoBotonConfirmar}>
                    {procesando ? 'REGISTRANDO...' : 'CONFIRMAR MERMA'}
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
  contenedor: { flex: 1, backgroundColor: '#f7fafc' },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fffaf0', borderBottomWidth: 1,
    borderBottomColor: '#fbd38d', paddingHorizontal: 16, paddingVertical: 10,
  },
  textoBanner: { fontSize: 13, color: '#c05621', fontWeight: '600' },
  contenedorBusqueda: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    margin: 16, paddingHorizontal: 12, borderRadius: 12, height: 50,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  inputBusqueda: { flex: 1, fontSize: 16, color: '#2d3748' },
  tarjeta: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    marginHorizontal: 16, marginVertical: 5, flexDirection: 'row',
    alignItems: 'center', elevation: 1, borderWidth: 2, borderColor: 'transparent',
  },
  tarjetaActiva: { borderColor: '#c05621', backgroundColor: '#fffaf0' },
  tarjetaAgotada: { opacity: 0.5 },
  infoProducto: { flex: 1, marginRight: 12 },
  nombreProducto: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 3 },
  stockProducto: { fontSize: 13, color: '#718096' },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  botonControl: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#c05621', alignItems: 'center', justifyContent: 'center',
  },
  botonDeshabilitado: { backgroundColor: '#cbd5e0' },
  botonLimite: { backgroundColor: '#e53e3e' },
  textoControl: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', lineHeight: 26 },
  cantidad: {
    fontSize: 18, fontWeight: 'bold', color: '#a0aec0',
    textAlign: 'center', minWidth: 32,
  },
  cantidadActiva: { color: '#1a1a2e' },
  separador: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 8, gap: 8,
  },
  lineaSeparador: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  textoSeparador: {
    fontSize: 11, color: '#a0aec0', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  barraFlotante: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#7b341e', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 28,
    elevation: 10,
  },
  textoBarraProductos: { color: '#fed7aa', fontSize: 13, marginBottom: 2 },
  textoBarraUnidades: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  botonRegistrar: {
    backgroundColor: '#c05621', borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  textoBotonRegistrar: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  badgeHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#c05621', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 4, marginRight: 8,
  },
  textoBadgeHeader: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  textoUnidadesBadge: { color: '#fed7aa', fontSize: 12, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12, maxHeight: '92%', elevation: 20,
  },
  barraArrastre: {
    width: 40, height: 5, backgroundColor: '#e2e8f0',
    borderRadius: 3, alignSelf: 'center', marginBottom: 16,
  },
  tituloModal: {
    fontSize: 22, fontWeight: 'bold', color: '#1a1a2e',
    textAlign: 'center', marginBottom: 4,
  },
  subtituloModal: {
    fontSize: 14, color: '#c05621', textAlign: 'center',
    fontWeight: '600', marginBottom: 16,
  },
  resumenProductos: {
    backgroundColor: '#fffaf0', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#fbd38d', marginBottom: 20,
  },
  filaResumen: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 4,
  },
  nombreResumen: { flex: 1, fontSize: 14, color: '#744210' },
  cantidadResumen: { fontSize: 14, fontWeight: 'bold', color: '#c05621' },
  etiquetaMotivo: {
    fontSize: 15, fontWeight: '600', color: '#4a5568', marginBottom: 12,
  },
  gridMotivos: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20,
  },
  botonMotivo: {
    width: '47%', paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 14, borderWidth: 2, borderColor: '#fed7aa',
    backgroundColor: '#fffaf0', alignItems: 'center', gap: 6,
  },
  botonMotivoActivo: { backgroundColor: '#c05621', borderColor: '#c05621' },
  textoBotonMotivo: { fontSize: 14, fontWeight: '700', color: '#c05621' },
  textoBotonMotivoActivo: { color: '#ffffff' },
  contenedorDetalle: { marginBottom: 20 },
  etiquetaDetalle: {
    fontSize: 14, fontWeight: '600', color: '#4a5568', marginBottom: 8,
  },
  inputDetalle: {
    borderWidth: 1.5, borderColor: '#cbd5e0', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#1a1a2e', backgroundColor: '#f7fafc',
    textAlignVertical: 'top',
  },
  botonConfirmar: {
    backgroundColor: '#c05621', borderRadius: 14,
    padding: 18, alignItems: 'center', marginTop: 8,
  },
  botonDeshabilitadoConfirmar: { backgroundColor: '#a0aec0' },
  filaBotonConfirmar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textoBotonConfirmar: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
  botonCancelar: { padding: 16, alignItems: 'center', marginBottom: 8 },
  textoBotonCancelar: { color: '#718096', fontSize: 16 },
});