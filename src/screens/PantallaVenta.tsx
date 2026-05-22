import { useState, useCallback, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, Alert,
  Text, TextInput, TouchableOpacity, LayoutAnimation
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Producto, ItemCesta } from '../types';
import { obtenerProductosDisponibles, registrarVenta } from '../database/ventas';
import { obtenerOCrearTurno } from '../database/turnos';
import ProductoVenta from '../components/ProductoVenta';
import CestaFlotante from '../components/CestaFlotante';
import ModalCobro from '../components/ModalCobro';
import Skeleton from '../components/Skeleton';
import EstadoVacio from '../components/EstadoVacio';

export default function PantallaVenta() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cesta, setCesta] = useState<Map<number, number>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [modalCobroVisible, setModalCobroVisible] = useState(false);

  // Recargar productos al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      cargarProductos();
      // Limpiar cesta al entrar
      setCesta(new Map());
      setBusqueda('');
    }, [])
  );

  async function cargarProductos() {
    if (productos.length === 0) setCargando(true);
    const lista = await obtenerProductosDisponibles();
    setProductos(lista);
    setProductosFiltrados(lista);
    setCargando(false);
  }

  // Filtrar productos cuando cambia la búsqueda
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (busqueda.trim() === '') {
      setProductosFiltrados(productos);
    } else {
      const termino = busqueda.toLowerCase();
      const filtrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(termino)
      );
      setProductosFiltrados(filtrados);
    }
  }, [busqueda, productos]);

  // Actualizar cantidad de un producto en la cesta
  function cambiarCantidad(productoId: number, cantidad: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCesta(prev => {
      const nueva = new Map(prev);
      if (cantidad === 0) {
        nueva.delete(productoId);
      } else {
        nueva.set(productoId, cantidad);
      }
      return nueva;
    });
  }

  // Construir lista de items de la cesta para pasarla a CestaFlotante
  function obtenerItemsCesta(): ItemCesta[] {
    const items: ItemCesta[] = [];
    cesta.forEach((cantidad, productoId) => {
      const producto = productos.find(p => p.id === productoId);
      if (producto) items.push({ producto, cantidad });
    });
    return items;
  }

  // Al pulsar COBRAR — mostrar modal de cobro
  function handleCobrar() {
    const items = obtenerItemsCesta();
    if (items.length === 0) return;
    setModalCobroVisible(true);
  }

  // Confirmar y registrar la venta en la BD
  async function confirmarVenta(
    items: ItemCesta[],
    metodoPago: 'efectivo' | 'transferencia'
  ) {
    if (procesando) return;
    setProcesando(true);

    try {
      const turnoId = await obtenerOCrearTurno();
      await registrarVenta(items, metodoPago, turnoId);

      // Cerrar modal
      setModalCobroVisible(false);

      // Limpiar cesta y recargar inventario
      setCesta(new Map());
      await cargarProductos();

      // Confirmación profesional con Toast
      Toast.show({
        type: 'success',
        text1: 'Venta registrada',
        text2: `Cobrado en ${metodoPago} correctamente.`,
        position: 'top',
        visibilityTime: 3000,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo registrar la venta. Intenta de nuevo.',
        position: 'top',
      });
      console.error(error);
    } finally {
      setProcesando(false);
    }
  }

  const itemsCesta = obtenerItemsCesta();

  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={estilos.skeletonCard}>
          <View style={{ flex: 1 }}>
            <Skeleton width="60%" height={20} style={{ marginBottom: 10 }} />
            <Skeleton width="30%" height={16} />
          </View>
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      {/* Barra de búsqueda */}
      <View style={estilos.contenedorBusqueda}>
        <Ionicons name="search" size={20} color="#718096" style={estilos.iconoBusqueda} />
        <TextInput
          style={estilos.inputBusqueda}
          placeholder="Buscar producto..."
          placeholderTextColor="#a0aec0"
          value={busqueda}
          onChangeText={setBusqueda}
          clearButtonMode="while-editing"
        />
      </View>

      {cargando ? (
        renderSkeleton()
      ) : productos.length === 0 ? (
        <EstadoVacio 
          icono="cart-outline" 
          titulo="Sin stock" 
          descripcion="No hay productos disponibles para vender. Agrega stock en Inventario." 
        />
      ) : productosFiltrados.length === 0 ? (
        <EstadoVacio 
          icono="search-outline" 
          titulo="Sin resultados" 
          descripcion={`No encontramos "${busqueda}" en los productos disponibles.`} 
        />
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ProductoVenta
              producto={item}
              cantidadEnCesta={cesta.get(item.id) ?? 0}
              onCambiarCantidad={(cantidad) => cambiarCantidad(item.id, cantidad)}
            />
          )}
          contentContainerStyle={{ paddingBottom: itemsCesta.length > 0 ? 120 : 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Cesta flotante — aparece solo si hay algo en la cesta */}
      <CestaFlotante items={itemsCesta} onCobrar={handleCobrar} />

      {/* Modal de cobro inteligente */}
      <ModalCobro
        visible={modalCobroVisible}
        items={itemsCesta}
        onConfirmar={(metodo) => confirmarVenta(itemsCesta, metodo)}
        onCancelar={() => setModalCobroVisible(false)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  textoVacio: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginTop: 8,
  },
  contenedorBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconoBusqueda: {
    marginRight: 8,
  },
  inputBusqueda: {
    flex: 1,
    fontSize: 16,
    color: '#2d3748',
  },
  skeletonCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});