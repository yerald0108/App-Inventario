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
    obtenerItemsCesta,
    resetCesta,
  } = useProductoCesta();

  const [procesando, setProcesando] = useState(false);
  const [modalCobroVisible, setModalCobroVisible] = useState(false);
  const [ultimoMetodoPago, setUltimoMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const procesandoRef = useRef(false);

  // Actualizar el badge del header cada vez que cambia la cesta
  useEffect(() => {
    const totalItems = Array.from(cesta.values()).reduce((acc, qty) => acc + qty, 0);

    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 8 }}>
          {/* Botón a Últimas Ventas */}
          <TouchableOpacity
            onPress={() => navigation.navigate('UltimasVentas')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="receipt-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
          
          {/* Badge de la cesta */}
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

  // Recargar productos al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      cargarProductos();
      resetCesta();
    }, [])
  );

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
    // El ref garantiza que no haya doble ejecución aunque el componente re-renderice.
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

      // Recordar el método para la próxima venta
      setUltimoMetodoPago(metodoPago);

      setModalCobroVisible(false);
      resetCesta();
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
                cantidadEnCesta={cesta.get(item.id) ?? 0}
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
        metodoPagoInicial={ultimoMetodoPago}
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
  // Estilos del badge del header
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