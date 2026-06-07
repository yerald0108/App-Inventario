import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, LayoutAnimation
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { VentaAgrupada } from '../types';
import { obtenerVentasTurnoActual, cancelarVenta, cambiarMetodoPagoVenta } from '../database/cancelaciones';
import { obtenerTurnoAbierto } from '../database/turnos';
import Skeleton, { SkeletonVenta } from '../components/Skeleton';
import EstadoVacio from '../components/EstadoVacio';
import { formatCUP } from '../utils';

type FlatListType = FlatList<VentaAgrupada>;

export default function PantallaUltimasVentas() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [ventas, setVentas] = useState<VentaAgrupada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [turnoId, setTurnoId] = useState<number | null>(null);
  const flatListRef = useRef<FlatListType>(null);

  // Añadir botón en el header para ir a Venta
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Venta')}
          style={{ marginRight: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="cart-outline" size={22} color="#ffffff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      cargarVentas();
    }, [])
  );

  async function cargarVentas() {
    setCargando(true);
    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        setTurnoId(null);
        setVentas([]);
        return;
      }
      setTurnoId(turno.id);
      const lista = await obtenerVentasTurnoActual(turno.id);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setVentas(lista);
    } catch (error) {
      console.error('cargarVentas: error', error);
      setVentas([]);
    } finally {
      setCargando(false);
    }
  }

  function confirmarCancelacion(venta: VentaAgrupada) {
    // Construir resumen de items para el mensaje
    const resumenItems = venta.items
      .map(item => `• ${item.cantidad}x ${item.nombre_producto}`)
      .join('\n');

    Alert.alert(
      '¿Anular esta venta?',
      `Se devolverán los productos al inventario:\n\n${resumenItems}\n\nTotal: ${formatCUP(venta.total)} CUP`,
      [
        { text: 'Mantener venta', style: 'cancel' },
        {
          text: 'Anular venta ahora',
          style: 'destructive',
          onPress: () => ejecutarCancelacion(venta.venta_id),
        },
      ]
    );
  }

  async function ejecutarCancelacion(ventaId: string) {
    try {
      // Guardar el índice actual antes de recargar
      const indiceActual = ventas.findIndex(v => v.venta_id === ventaId);
      
      await cancelarVenta(ventaId);
      await cargarVentas();
      
      // Si la venta no era la primera, hacer scroll al elemento anterior
      // para que el usuario no pierda el contexto
      if (indiceActual > 0 && flatListRef.current) {
        // Pequeño delay para que el FlatList haya renderizado la nueva lista
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: Math.max(0, indiceActual - 1),
            animated: true,
            viewPosition: 0,
          });
        }, 150);
      }
      
      Alert.alert('✅ Venta anulada', 'Los productos fueron devueltos al inventario.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo anular la venta.');
      console.error(error);
    }
  }
  
  function confirmarCambioMetodo(venta: VentaAgrupada) {
    const metodoActual = venta.metodo_pago;
    const metodoNuevo = metodoActual === 'efectivo' ? 'transferencia' : 'efectivo';
    const nombreActual = metodoActual === 'efectivo' ? 'Efectivo' : 'Transferencia';
    const nombreNuevo = metodoNuevo === 'efectivo' ? 'Efectivo' : 'Transferencia';

    Alert.alert(
      'Cambiar método de pago',
      `Esta venta está registrada como "${nombreActual}".\n¿Cambiarla a "${nombreNuevo}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: `Cambiar a ${nombreNuevo}`,
          onPress: () => ejecutarCambioMetodo(venta.venta_id, metodoNuevo),
        },
      ]
    );
  }

  async function ejecutarCambioMetodo(
    ventaId: string,
    nuevoMetodo: 'efectivo' | 'transferencia'
  ) {
    try {
      await cambiarMetodoPagoVenta(ventaId, nuevoMetodo);
      await cargarVentas();
      const nombreNuevo = nuevoMetodo === 'efectivo' ? 'Efectivo' : 'Transferencia';
      Alert.alert('✅ Actualizado', `El método de pago fue cambiado a ${nombreNuevo}.`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el método de pago.');
      console.error(error);
    }
  }

  // Formatear hora legible desde ISO string
  function formatearHora(fechaISO: string): string {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleTimeString('es-CU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3].map((i) => (
        <SkeletonVenta key={i} />
      ))}
    </View>
  );

  if (!cargando && !turnoId) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <EstadoVacio 
          icono="alert-circle-outline" 
          titulo="Sin turno abierto" 
          descripcion="Las ventas se registran dentro de un turno activo. Abre uno desde la pantalla de inicio para comenzar a vender."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      {!cargando && (
        <View style={estilos.encabezado}>
          <Text style={estilos.textoEncabezado}>
            {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'} en este turno
          </Text>
        </View>
      )}

      {cargando ? (
        renderSkeleton()
      ) : (
        <FlatList
          ref={flatListRef}
          data={ventas}
          keyExtractor={(item) => item.venta_id}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item }) => (
            <View style={estilos.tarjeta}>
              {/* Encabezado de la venta */}
              <View style={estilos.filaSuperior}>
                <Text style={estilos.hora}>{formatearHora(item.fecha_hora)}</Text>
                <View style={[
                  estilos.etiquetaPago,
                  item.metodo_pago === 'efectivo' ? estilos.etiquetaEfectivo : estilos.etiquetaTransferencia
                ]}>
                  <Ionicons 
                    name={item.metodo_pago === 'efectivo' ? 'cash-outline' : 'card-outline'} 
                    size={14} 
                    color={item.metodo_pago === 'efectivo' ? '#2f855a' : '#2b6cb0'} 
                  />
                  <Text style={[
                    estilos.textoEtiqueta,
                    { color: item.metodo_pago === 'efectivo' ? '#2f855a' : '#2b6cb0' }
                  ]}>
                    {item.metodo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                  </Text>
                </View>
                <Text style={estilos.total}>{formatCUP(item.total)} CUP</Text>
              </View>

              {/* Lista de productos de la venta */}
              <View style={estilos.items}>
                {item.items.map((prod, index) => (
                  <Text key={index} style={estilos.itemTexto}>
                    {prod.cantidad}x {prod.nombre_producto} — {formatCUP(prod.cantidad * prod.precio_aplicado)} CUP
                  </Text>
                ))}

                {/* Propina — solo si hubo */}
                {item.propina > 0 && (
                  <View style={estilosLocal.filaPropina}>
                    <Ionicons name="star" size={13} color="#b7791f" />
                    <Text style={estilosLocal.textoPropina}>
                      Propina: {formatCUP(item.propina)} CUP
                    </Text>
                  </View>
                )}
              </View>

              {/* Botón cancelar */}
              <View style={estilos.filaBotones}>
                <TouchableOpacity
                  style={estilos.botonCambiarMetodo}
                  onPress={() => confirmarCambioMetodo(item)}
                >
                  <Ionicons 
                    name={item.metodo_pago === 'efectivo' ? 'card-outline' : 'cash-outline'} 
                    size={14} 
                    color="#2b6cb0" 
                  />
                  <Text style={estilos.textoBotonCambiarMetodo}>
                    {item.metodo_pago === 'efectivo' ? 'Cambiar a Transfer.' : 'Cambiar a Efectivo'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={estilos.botonCancelar}
                  onPress={() => confirmarCancelacion(item)}
                >
                  <Text style={estilos.textoBotonCancelar}>ANULAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EstadoVacio 
              icono="receipt-outline" 
              titulo="Sin ventas" 
              descripcion="Las ventas que realices en este turno aparecerán aquí." 
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  encabezado: {
    backgroundColor: '#1a1a2e',
    padding: 12,
    alignItems: 'center',
  },
  textoEncabezado: {
    color: '#a0aec0',
    fontSize: 14,
  },
  tarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 2,
  },
  filaSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  hora: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginRight: 4,
  },
  etiquetaPago: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etiquetaEfectivo: {
    backgroundColor: '#f0fff4',
    borderWidth: 1,
    borderColor: '#38a169',
  },
  etiquetaTransferencia: {
    backgroundColor: '#ebf8ff',
    borderWidth: 1,
    borderColor: '#2b6cb0',
  },
  textoEtiqueta: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a5568',
  },
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2b6cb0',
  },
  items: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginBottom: 12,
    gap: 4,
  },
  itemTexto: {
    fontSize: 14,
    color: '#4a5568',
  },
  botonCancelar: {
    flex: 1,
    backgroundColor: '#fff5f5',
    borderWidth: 1.5,
    borderColor: '#e53e3e',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  textoBotonCancelar: {
    color: '#e53e3e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  skeletonCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  textoVacio: {
    fontSize: 18,
    color: '#4a5568',
    marginBottom: 8,
    textAlign: 'center',
  },
  textoVacioSub: {
    fontSize: 14,
    color: '#a0aec0',
    textAlign: 'center',
  },
  filaBotones: {
    flexDirection: 'row',
    gap: 8,
  },
  botonCambiarMetodo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ebf8ff',
    borderWidth: 1.5,
    borderColor: '#2b6cb0',
    borderRadius: 10,
    padding: 12,
  },
  textoBotonCambiarMetodo: {
    color: '#2b6cb0',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

const estilosLocal = StyleSheet.create({
  filaPropina: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#fefcbf',
  },
  textoPropina: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b7791f',
  },
});