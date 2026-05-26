import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, FlatList, StyleSheet, Alert,
  Text, TextInput
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Producto, ItemCesta } from '../types';
import { registrarSalidaFamiliar } from '../database/salidas_familiares';
import { obtenerTurnoAbierto } from '../database/turnos';
import { useProductoCesta } from '../hooks/useProductoCesta';
import ProductoVenta from '../components/ProductoVenta';
import CestaFlotante from '../components/CestaFlotante';
import { SkeletonProducto } from '../components/Skeleton';
import EstadoVacio from '../components/EstadoVacio';

// Tipo unión para los items de la lista
type ItemLista = Producto | { __tipo: 'separador'; id: number };

export default function PantallaSalidaFamiliar() {
  // Obtener navigation hook
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'SalidaFamiliar'>>();
  
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
  const procesandoRef = useRef(false);

  // Actualizar el badge del header cada vez que cambia la cesta
  useEffect(() => {
    const totalItems = Array.from(cesta.values()).reduce((acc, item) => acc + item.cantidad, 0);

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

  // Recargar productos al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      resetCesta();
    }, [])
  );

  // Función centralizada de reset de estado
  function resetearEstadoProcesando() {
    procesandoRef.current = false;
    setProcesando(false);
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

  // Guard con return temprano y finally consistente
  async function ejecutarSalida() {
    const items = obtenerItemsCesta();
    
    // Guard: si ya se está procesando, no hacer nada.
    // El ref garantiza que no haya doble ejecución aunque el componente re-renderice.
    if (procesandoRef.current) return;

    procesandoRef.current = true;
    setProcesando(true);

    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        Alert.alert('Error', 'No hay un turno abierto. Debes abrir uno antes de operar.');
        // Importante: el finally se ejecutará igual, reseteando el estado
        return;
      }
      
      await registrarSalidaFamiliar(items, turno.id);
      await cargarProductos(); 

      // Limpiar cesta y recargar inventario
      resetCesta();
      

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
      // Este bloque SIEMPRE se ejecuta, incluso si hay return dentro del try.
      // Es el único lugar donde se debe resetear el estado de procesamiento.
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
      ) : (productosConSeparador as ItemLista[]).length === 0 ? (
        <EstadoVacio 
          icono="search-outline" 
          titulo="Sin resultados" 
          descripcion={`No encontramos nada que coincida con "${busqueda}"`} 
        />
      ) : (
        <FlatList
          data={productosConSeparador as ItemLista[]}
          keyExtractor={(item) => item.id.toString()}
          windowSize={11} // Aproximadamente 2 pantallas
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
                cantidadEnCesta={cesta.get(item.id)?.cantidad ?? 0}
                precioFinal={(item as Producto).precio}
                precioModificado={false}
                onCambiarCantidad={(cantidad) => cambiarCantidad(item.id, cantidad)}
                onCambiarPrecio={() => {}}
              />
            );
          }}
          contentContainerStyle={{ 
            paddingBottom: itemsCesta.length > 0 ? 140 : 20 
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* CestaFlotante — el reset lo maneja el finally de ejecutarSalida */}
      <CestaFlotante 
        items={itemsCesta} 
        onCobrar={handleConfirmarSalida} 
        label="REGISTRAR SALIDA"
        showTotal={false}
        procesando={procesando}
      />
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
  // Estilos del badge del header (rosa temático)
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ed64a6', // rosa consistente con el botón de esa pantalla
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  textoBadgeHeader: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  textoUnidadesBadge: {
    color: '#fbb6ce', // rosa claro para contraste
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