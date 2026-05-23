import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, FlatList, StyleSheet, Alert,
  Text, TextInput, TouchableOpacity, LayoutAnimation
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Producto, ItemCesta } from '../types';
import { obtenerProductos } from '../database/productos';
import { registrarVenta } from '../database/ventas';
import { obtenerTurnoAbierto } from '../database/turnos';
import ProductoVenta from '../components/ProductoVenta';
import CestaFlotante from '../components/CestaFlotante';
import ModalCobro from '../components/ModalCobro';
import Skeleton, { SkeletonProducto } from '../components/Skeleton';
import EstadoVacio from '../components/EstadoVacio';

// Tipo unión para los items de la lista
type ItemLista = Producto | { __tipo: 'separador'; id: number };

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Venta'>;
};

export default function PantallaVenta({ navigation }: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cesta, setCesta] = useState<Map<number, number>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [modalCobroVisible, setModalCobroVisible] = useState(false);
  const procesandoRef = useRef(false);

  // Productos con separador entre disponibles y agotados
  const productosConSeparador = useMemo((): ItemLista[] => {
    if (productosFiltrados.length === 0) return [];

    const disponibles = productosFiltrados.filter(p => p.existencia > 0);
    const agotados = productosFiltrados.filter(p => p.existencia <= 0);

    // Si no hay agotados, devolver solo disponibles sin separador
    if (agotados.length === 0) return disponibles;

    // Si hay agotados, insertar un item especial de separador
    return [
      ...disponibles,
      { __tipo: 'separador', id: -1 },
      ...agotados,
    ];
  }, [productosFiltrados]);

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
    setCargando(true);
    try {
      const lista = await obtenerProductos();
      setProductos(lista);
      setProductosFiltrados(lista);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
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
    
    // Feedback de stock agotado (Bug 2)
    const producto = productos.find(p => p.id === productoId);
    if (producto && cantidad >= producto.existencia && cantidad > cantidadEnCesta(productoId)) {
      if (producto.existencia > 0 && cantidad === producto.existencia) {
        Toast.show({
          type: 'info',
          text1: 'Stock al límite',
          text2: `Has alcanzado el máximo disponible de ${producto.nombre}.`,
          position: 'bottom',
        });
      }
    }

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

  function cantidadEnCesta(productoId: number) {
    return cesta.get(productoId) ?? 0;
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

  function resetearEstadoProcesando() {
    procesandoRef.current = false;
    setProcesando(false);
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
    metodoPago: 'efectivo' | 'transferencia',
    montoRecibido: number,
    cambio: number
  ) {
    // Guard: si ya se está procesando, no hacer nada.
    if (procesandoRef.current) return;

    procesandoRef.current = true;
    setProcesando(true);

    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        Alert.alert('Error', 'No hay un turno abierto. Debes abrir uno antes de vender.');
        return;
      }

      await registrarVenta(items, metodoPago, turno.id);

      setModalCobroVisible(false);
      setCesta(new Map());
      await cargarProductos();

      const textoMetodo = metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia';
      const textoCambio =
        metodoPago === 'efectivo' && cambio > 0
          ? ` · Vuelto: ${cambio.toFixed(2)} CUP`
          : '';

      Toast.show({
        type: 'success',
        text1: `Venta registrada · ${textoMetodo}`,
        text2: `Total: ${items
          .reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)
          .toFixed(2)} CUP${textoCambio}`,
        position: 'top',
        visibilityTime: 4000,
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
      resetearEstadoProcesando();
    }
  }

  const itemsCesta = obtenerItemsCesta();

  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonProducto key={i} />
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
          titulo="Sin productos" 
          descripcion="No hay productos en el inventario. Agrega productos para comenzar a vender." 
          accion={{
            texto: "Ir a Inventario",
            onPress: () => navigation.navigate('Inventario')
          }}
        />
      ) : productosFiltrados.length === 0 ? (
        <EstadoVacio 
          icono="search-outline" 
          titulo="Sin resultados" 
          descripcion={`No encontramos "${busqueda}" en los productos.`} 
        />
      ) : (
        <FlatList
          data={productosConSeparador}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            // Render del separador
            if ('__tipo' in item && item.__tipo === 'separador') {
              return (
                <View style={estilos.separadorAgotados}>
                  <View style={estilos.lineaSeparador} />
                  <Text style={estilos.textoSeparador}>Sin existencia</Text>
                  <View style={estilos.lineaSeparador} />
                </View>
              );
            }
            // Render normal del producto
            return (
              <ProductoVenta
                producto={item as Producto}
                cantidadEnCesta={cantidadEnCesta(item.id)}
                onCambiarCantidad={(cantidad) => cambiarCantidad(item.id, cantidad)}
              />
            );
          }}
          contentContainerStyle={{ 
            paddingBottom: itemsCesta.length > 0 ? 140 : 20 
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Cesta flotante — aparece solo si hay algo en la cesta */}
        <CestaFlotante 
          items={itemsCesta} 
          onCobrar={handleCobrar} 
          procesando={procesando}
        />

      {/* Modal de cobro inteligente */}
      <ModalCobro
        visible={modalCobroVisible}
        items={itemsCesta}
        onConfirmar={(metodo, monto, cambio) =>
          confirmarVenta(itemsCesta, metodo, monto, cambio)
        }
        onCancelar={() => {
          setModalCobroVisible(false);
          resetearEstadoProcesando();
        }}
        procesando={procesando}
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
  // Estilos del separador de agotados
  separadorAgotados: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  lineaSeparador: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  textoSeparador: {
    fontSize: 12,
    color: '#a0aec0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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