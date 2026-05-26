import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, FlatList, StyleSheet, Alert,
  Text, TextInput, TouchableOpacity
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Producto, ItemCesta } from '../types';
import { registrarVenta } from '../database/ventas';
import { obtenerTurnoAbierto } from '../database/turnos';
import { useProductoCesta } from '../hooks/useProductoCesta';
import ProductoVenta from '../components/ProductoVenta';
import CestaFlotante from '../components/CestaFlotante';
import ModalCobro from '../components/ModalCobro';
import { SkeletonProducto } from '../components/Skeleton';
import EstadoVacio from '../components/EstadoVacio';

// Tipo unión para los items de la lista
type ItemLista = Producto | { __tipo: 'separador'; id: number };

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Venta'>;
};

export default function PantallaVenta({ navigation }: Props) {
  const {
    productos,
    busqueda,
    setBusqueda,
    cesta,
    cargando,
    cargarProductos,
    productosConSeparador,
    cambiarCantidad,
    cambiarPrecio, // <-- 1. Obtener la nueva función
    obtenerItemsCesta,
    resetCesta,
  } = useProductoCesta();

  const [procesando, setProcesando] = useState(false);
  const [modalCobroVisible, setModalCobroVisible] = useState(false);
  const [ultimoMetodoPago, setUltimoMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const procesandoRef = useRef(false);

  // Actualizar el badge del header cada vez que cambia la cesta
  useEffect(() => {
    // 2. La lógica de reduce ahora accede a la propiedad `cantidad` del objeto
    const totalItems = Array.from(cesta.values()).reduce((acc, item) => acc + item.cantidad, 0);

    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('UltimasVentas')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="receipt-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
          
          {totalItems > 0 && (
            <View style={estilos.badgeHeader}>
              <Text style={estilos.textoBadgeHeader}>{totalItems}</Text>
              <Text style={estilos.textoUnidadesBadge}> ud.</Text>
            </View>
          )}
        </View>
      ),
    });
  }, [cesta, navigation]);

  useFocusEffect(
    useCallback(() => {
      resetCesta();
    }, [])
  );

  function resetearEstadoProcesando() {
    procesandoRef.current = false;
    setProcesando(false);
  }

  function handleCobrar() {
    const items = obtenerItemsCesta();
    if (items.length === 0) return;
    setModalCobroVisible(true);
  }

  async function confirmarVenta(
    items: ItemCesta[],
    metodoPago: 'efectivo' | 'transferencia',
    montoRecibido: number,
    cambio: number
  ) {
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
      await cargarProductos(); 
      setUltimoMetodoPago(metodoPago);
      setModalCobroVisible(false);
      resetCesta();

      const textoMetodo = metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia';
      const textoCambio = metodoPago === 'efectivo' && cambio > 0 ? ` · Vuelto: ${cambio.toFixed(2)} CUP` : '';

      // 3. Usar `precioFinal` para el cálculo del total en el Toast
      const totalVenta = items.reduce((acc, i) => acc + (i.precioFinal ?? i.producto.precio) * i.cantidad, 0);

      Toast.show({
        type: 'success',
        text1: `Venta registrada · ${textoMetodo}`,
        text2: `Total: ${totalVenta.toFixed(2)} CUP${textoCambio}`,
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
      {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonProducto key={i} />)}
    </View>
  );

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
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
          accion={{ texto: "Ir a Inventario", onPress: () => navigation.navigate('Inventario') }}
        />
      ) : (productosConSeparador as ItemLista[]).length === 0 ? (
        <EstadoVacio 
          icono="search-outline" 
          titulo="Sin resultados" 
          descripcion={`No encontramos "${busqueda}" en los productos.`} 
        />
      ) : (
        <FlatList
          data={productosConSeparador as ItemLista[]}
          keyExtractor={(item) => item.id.toString()}
          windowSize={11}
          renderItem={({ item: productoItem }) => {
            if ('__tipo' in productoItem && productoItem.__tipo === 'separador') {
              return (
                <View style={estilos.separadorAgotados}>
                  <View style={estilos.lineaSeparador} />
                  <Text style={estilos.textoSeparador}>Sin existencia</Text>
                  <View style={estilos.lineaSeparador} />
                </View>
              );
            }

            // 4. Lógica para pasar las nuevas props a ProductoVenta
            const producto = productoItem as Producto;
            const itemEnCesta = cesta.get(producto.id);
            const cantidad = itemEnCesta?.cantidad ?? 0;
            const precioFinal = itemEnCesta?.precioFinal ?? producto.precio;
            const precioModificado = itemEnCesta?.precioFinal !== undefined;

            return (
              <ProductoVenta
                producto={producto}
                cantidadEnCesta={cantidad}
                precioFinal={precioFinal}
                precioModificado={precioModificado}
                onCambiarCantidad={(nuevaCantidad) => cambiarCantidad(producto.id, nuevaCantidad)}
                onCambiarPrecio={(nuevoPrecio) => cambiarPrecio(producto.id, nuevoPrecio)}
              />
            );
          }}
          contentContainerStyle={{ paddingBottom: itemsCesta.length > 0 ? 140 : 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CestaFlotante 
        items={itemsCesta} 
        onCobrar={handleCobrar} 
        procesando={procesando}
      />

      <ModalCobro
        visible={modalCobroVisible}
        items={itemsCesta}
        metodoPagoInicial={ultimoMetodoPago}
        onConfirmar={(metodo, monto, cambio) => confirmarVenta(itemsCesta, metodo, monto, cambio)}
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
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b6cb0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  textoBadgeHeader: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  textoUnidadesBadge: {
    color: '#bee3f8',
    fontSize: 12,
    fontWeight: '600',
  },
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
