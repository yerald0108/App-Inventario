import { useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Alert,
  Text, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Producto, ItemCesta } from '../types';
import { obtenerProductosDisponibles, registrarVenta } from '../database/ventas';
import { obtenerOCrearTurno } from '../database/turnos';
import ProductoVenta from '../components/ProductoVenta';
import CestaFlotante from '../components/CestaFlotante';

export default function PantallaVenta() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cesta, setCesta] = useState<Map<number, number>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // Recargar productos al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      cargarProductos();
      // Limpiar cesta al entrar
      setCesta(new Map());
    }, [])
  );

  async function cargarProductos() {
    setCargando(true);
    const lista = await obtenerProductosDisponibles();
    setProductos(lista);
    setCargando(false);
  }

  // Actualizar cantidad de un producto en la cesta
  function cambiarCantidad(productoId: number, cantidad: number) {
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

  // Al pulsar COBRAR — mostrar diálogo de método de pago
  function handleCobrar() {
    const items = obtenerItemsCesta();
    if (items.length === 0) return;

    const total = items.reduce(
      (acc, item) => acc + item.producto.precio * item.cantidad,
      0
    );

    Alert.alert(
      `Total: ${total.toFixed(2)} CUP`,
      '¿Cómo paga el cliente?',
      [
        {
          text: '💵 Efectivo',
          onPress: () => confirmarVenta(items, 'efectivo'),
        },
        {
          text: '📱 Transferencia',
          onPress: () => confirmarVenta(items, 'transferencia'),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
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

      // Limpiar cesta y recargar inventario
      setCesta(new Map());
      await cargarProductos();

      // Confirmación breve
      Alert.alert('✅ Venta registrada', `Cobrado en ${metodoPago}.`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la venta. Intenta de nuevo.');
      console.error(error);
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator size="large" color="#2b6cb0" />
      </View>
    );
  }

  const itemsCesta = obtenerItemsCesta();

  return (
    <View style={estilos.contenedor}>
      {productos.length === 0 ? (
        <View style={estilos.centrado}>
          <Text style={estilos.textoVacio}>No hay productos con stock disponible.</Text>
        </View>
      ) : (
        <FlatList
          data={productos}
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
    </View>
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
  },
});