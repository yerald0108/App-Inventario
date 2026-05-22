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
import { obtenerProductos } from '../database/productos';
import { registrarSalidaFamiliar } from '../database/salidas_familiares';
import { obtenerTurnoAbierto } from '../database/turnos';
import ProductoVenta from '../components/ProductoVenta';
import CestaFlotante from '../components/CestaFlotante';
import Skeleton, { SkeletonProducto } from '../components/Skeleton';
import EstadoVacio from '../components/EstadoVacio';

export default function PantallaSalidaFamiliar() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cesta, setCesta] = useState<Map<number, number>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [alturaCesta, setAlturaCesta] = useState(0);

  // Recargar productos al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      cargarProductos();
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

  // Construir lista de items de la cesta
  function obtenerItemsCesta(): ItemCesta[] {
    const items: ItemCesta[] = [];
    cesta.forEach((cantidad, productoId) => {
      const producto = productos.find(p => p.id === productoId);
      if (producto) items.push({ producto, cantidad });
    });
    return items;
  }

  // Confirmar y registrar la salida familiar
  function handleConfirmarSalida() {
    const items = obtenerItemsCesta();
    if (items.length === 0) return;

    const totalUnidades = items.reduce((acc, item) => acc + item.cantidad, 0);
    const resumen = items.map(i => `• ${i.cantidad}x ${i.producto.nombre}`).join('\n');

    Alert.alert(
      'Confirmar Salida Familiar',
      `¿Registrar el consumo de estos productos?\n\n${resumen}\n\nTotal: ${totalUnidades} unidades.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Registrar Salida', 
          style: 'destructive', 
          onPress: ejecutarSalida 
        },
      ]
    );
  }

  async function ejecutarSalida() {
    const items = obtenerItemsCesta();
    if (procesando) return;
    setProcesando(true);

    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        Alert.alert('Error', 'No hay un turno abierto. Debes abrir uno antes de operar.');
        return;
      }
      
      await registrarSalidaFamiliar(items, turno.id);

      // Limpiar cesta y recargar inventario
      setCesta(new Map());
      await cargarProductos();

      const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

      Toast.show({
        type: 'success',
        text1: 'Salida familiar registrada',
        text2: `Registrado: ${totalItems} productos para consumo familiar.`,
        position: 'top',
        visibilityTime: 4000,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo registrar la salida familiar.',
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
          placeholder="Buscar producto para familiar..."
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
          icono="people-outline" 
          titulo="Sin productos" 
          descripcion="Agrega productos en Inventario para registrar salidas familiares." 
        />
      ) : productosFiltrados.length === 0 ? (
        <EstadoVacio 
          icono="search-outline" 
          titulo="Sin resultados" 
          descripcion={`No encontramos nada que coincida con "${busqueda}"`} 
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
          contentContainerStyle={{ 
            paddingBottom: itemsCesta.length > 0 ? (alturaCesta + 20) : 20 
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Cesta flotante específica para salida familiar */}
      <View onLayout={(e) => setAlturaCesta(e.nativeEvent.layout.height)}>
        <CestaFlotante 
          items={itemsCesta} 
          onCobrar={handleConfirmarSalida} 
          label="REGISTRAR SALIDA"
          showTotal={false}
          procesando={procesando}
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contenedorBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconoBusqueda: {
    marginRight: 8,
  },
  inputBusqueda: {
    flex: 1,
    fontSize: 16,
    color: '#2d3748',
  },
  textoVacio: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
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
