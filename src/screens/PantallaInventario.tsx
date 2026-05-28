import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, LayoutAnimation
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  obtenerProductos, crearProducto,
  actualizarProducto, eliminarProducto
} from '../database/productos';
import { Producto } from '../types';
import ProductoItem from '../components/ProductoItem';
import FormularioProducto from '../components/FormularioProducto';
import Skeleton, { SkeletonProducto } from '../components/Skeleton';
import EstadoVacio from '../components/EstadoVacio';
import { useProductos } from '../context/ProductosContext';
import { handleError } from '../utils';

export default function PantallaInventario() {
  const { productos, cargandoProductos, cargarProductos, buscarProductos, actualizarProductoEnLista } = useProductos();
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

  // Recargar productos cada vez que la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      cargarProductos().then(() => setBusqueda(''));
    }, [cargarProductos])
  );

  // Filtrar productos cuando cambia la búsqueda o los productos cambian
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setProductosFiltrados(buscarProductos(busqueda));
  }, [busqueda, productos, buscarProductos]);

  function abrirCrear() {
    setProductoSeleccionado(null);
    setModalVisible(true);
  }

  function abrirEditar(producto: Producto) {
    setProductoSeleccionado(producto);
    setModalVisible(true);
  }

  function cerrarModal() {
    setModalVisible(false);
    setProductoSeleccionado(null);
  }

  async function handleGuardar(datos: {
    nombre: string;
    precio: number;
    precio_costo: number;
    existencia: number;
    alerta_minima: number;
  }) {
    try {
      if (productoSeleccionado) {
        await actualizarProducto(
          productoSeleccionado.id,
          datos.nombre,
          datos.precio,
          datos.existencia,
          datos.alerta_minima,
          datos.precio_costo
        );
        actualizarProductoEnLista({
          ...productoSeleccionado,
          ...datos
        });
        Toast.show({
          type: 'success',
          text1: 'Producto actualizado',
          text2: `"${datos.nombre}" se guardó correctamente.`,
          position: 'top',
        });
      } else {
        await crearProducto(
          datos.nombre,
          datos.precio,
          datos.existencia,
          datos.alerta_minima,
          datos.precio_costo
        );
        await cargarProductos();
        Toast.show({
          type: 'success',
          text1: 'Producto creado',
          text2: `"${datos.nombre}" se añadió al inventario.`,
          position: 'top',
        });
      }
      cerrarModal();
    } catch (error) {
      handleError(error, 'Error al guardar');
    }
  }

  async function handleEliminar() {
    if (!productoSeleccionado) return;
    try {
      const nombreEliminado = productoSeleccionado.nombre;
      await eliminarProducto(productoSeleccionado.id);
      Toast.show({
        type: 'info',
        text1: 'Producto eliminado',
        text2: `"${nombreEliminado}" ha sido borrado.`,
        position: 'top',
      });
      cerrarModal();
      cargarProductos();
    } catch (error) {
      handleError(error, 'Error al eliminar');
    }
  }

  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonProducto key={i} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      {/* Resumen de stock y finanzas */}
      {!cargandoProductos && (
        <View style={estilos.resumen}>
          <Text style={estilos.textoResumen}>
            {productos.length} productos · {productos.filter(p => p.existencia < p.alerta_minima).length} stock bajo
          </Text>
          {productos.some(p => p.precio_costo && p.precio_costo > 0) && (
            <Text style={estilos.textoResumenMargen}>
              Margen prom: {(productos.filter(p => p.precio_costo && p.precio_costo > 0).reduce((acc, p) => acc + ((p.precio - (p.precio_costo || 0)) / p.precio), 0) / productos.filter(p => p.precio_costo && p.precio_costo > 0).length * 100).toFixed(1)}%
            </Text>
          )}
        </View>
      )}

      {/* Barra de búsqueda */}
      <View style={estilos.contenedorBusqueda}>
        <Ionicons name="search" size={20} color="#718096" style={estilos.iconoBusqueda} />
        <TextInput
          style={estilos.inputBusqueda}
          placeholder="Buscar en inventario..."
          placeholderTextColor="#a0aec0"
          value={busqueda}
          onChangeText={setBusqueda}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Lista de productos o Skeleton */}
      {cargandoProductos ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item) => item.id.toString()}
          windowSize={11} // Número de elementos a renderizar más allá de la vista visible (aprox. 2 pantallas)
          renderItem={({ item }) => (
            <ProductoItem producto={item} onEditar={abrirEditar} />
          )}
          ListEmptyComponent={
            busqueda !== '' ? (
              <EstadoVacio 
                icono="search-outline" 
                titulo="Sin resultados" 
                descripcion={`No encontramos nada que coincida con "${busqueda}"`} 
              />
            ) : (
              <EstadoVacio 
                icono="cube-outline" 
                titulo="Inventario vacío" 
                descripcion="Toca el botón + para agregar tu primer producto." 
              />
            )
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Botón flotante para agregar */}
      <TouchableOpacity style={estilos.botonAgregar} onPress={abrirCrear}>
        <Text style={estilos.textoBotonAgregar}>+</Text>
      </TouchableOpacity>

      {/* Modal de formulario */}
      <FormularioProducto
        visible={modalVisible}
        producto={productoSeleccionado}
        onGuardar={handleGuardar}
        onCancelar={cerrarModal}
        onEliminar={handleEliminar}
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
  resumen: {
    backgroundColor: '#1a1a2e',
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  textoResumen: {
    color: '#a0aec0',
    fontSize: 14,
  },
  textoResumenMargen: {
    color: '#9ae6b4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  textoVacio: {
    fontSize: 18,
    color: '#4a5568',
    marginBottom: 8,
  },
  textoVacioSub: {
    fontSize: 14,
    color: '#a0aec0',
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
    color: '#1a1a2e',
  },
  botonAgregar: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2b6cb0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  textoBotonAgregar: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  skeletonCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
});