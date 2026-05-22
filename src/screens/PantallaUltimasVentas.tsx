import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { VentaAgrupada } from '../types';
import { obtenerVentasTurnoActual, cancelarVenta } from '../database/cancelaciones';
import { obtenerTurnoAbierto } from '../database/turnos';

export default function PantallaUltimasVentas() {
  const [ventas, setVentas] = useState<VentaAgrupada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [turnoId, setTurnoId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      cargarVentas();
    }, [])
  );

  async function cargarVentas() {
    setCargando(true);
    const turno = await obtenerTurnoAbierto();
    if (turno) {
      setTurnoId(turno.id);
      const lista = await obtenerVentasTurnoActual(turno.id);
      setVentas(lista);
    } else {
      setTurnoId(null);
      setVentas([]);
    }
    setCargando(false);
  }

  function confirmarCancelacion(venta: VentaAgrupada) {
    // Construir resumen de items para el mensaje
    const resumenItems = venta.items
      .map(item => `• ${item.cantidad}x ${item.nombre_producto}`)
      .join('\n');

    Alert.alert(
      '¿Anular esta venta?',
      `Se devolverán los productos al inventario:\n\n${resumenItems}\n\nTotal: ${venta.total.toFixed(2)} CUP`,
      [
        { text: 'No cancelar', style: 'cancel' },
        {
          text: 'Sí, anular',
          style: 'destructive',
          onPress: () => ejecutarCancelacion(venta.venta_id),
        },
      ]
    );
  }

  async function ejecutarCancelacion(ventaId: string) {
    try {
      await cancelarVenta(ventaId);
      await cargarVentas();
      Alert.alert('✅ Venta anulada', 'Los productos fueron devueltos al inventario.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo anular la venta.');
      console.error(error);
    }
  }

  // Formatear hora legible desde ISO string
  function formatearHora(fechaISO: string): string {
    const fecha = new Date(fechaISO);
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedor}>
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#2b6cb0" />
        </View>
      </SafeAreaView>
    );
  }

  if (!turnoId) {
    return (
      <SafeAreaView style={estilos.contenedor}>
        <View style={estilos.centrado}>
          <Text style={estilos.textoVacio}>No hay turno abierto.</Text>
          <Text style={estilos.textoVacioSub}>Regresa al inicio para abrir un turno.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <View style={estilos.encabezado}>
        <Text style={estilos.textoEncabezado}>
          {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'} en este turno
        </Text>
      </View>

      <FlatList
        data={ventas}
        keyExtractor={(item) => item.venta_id}
        renderItem={({ item }) => (
          <View style={estilos.tarjeta}>
            {/* Encabezado de la venta */}
            <View style={estilos.filaSuperior}>
              <Text style={estilos.hora}>{formatearHora(item.fecha_hora)}</Text>
              <View style={[
                estilos.etiquetaPago,
                item.metodo_pago === 'efectivo' ? estilos.etiquetaEfectivo : estilos.etiquetaTransferencia
              ]}>
                <Text style={estilos.textoEtiqueta}>
                  {item.metodo_pago === 'efectivo' ? '💵 Efectivo' : '📱 Transferencia'}
                </Text>
              </View>
              <Text style={estilos.total}>{item.total.toFixed(2)} CUP</Text>
            </View>

            {/* Lista de productos de la venta */}
            <View style={estilos.items}>
              {item.items.map((prod, index) => (
                <Text key={index} style={estilos.itemTexto}>
                  {prod.cantidad}x {prod.nombre_producto} — {(prod.cantidad * prod.precio_aplicado).toFixed(2)} CUP
                </Text>
              ))}
            </View>

            {/* Botón cancelar */}
            <TouchableOpacity
              style={estilos.botonCancelar}
              onPress={() => confirmarCancelacion(item)}
            >
              <Text style={estilos.textoBotonCancelar}>CANCELAR VENTA</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={estilos.centrado}>
            <Text style={estilos.textoVacio}>No hay ventas en este turno.</Text>
            <Text style={estilos.textoVacioSub}>Las ventas registradas aparecerán aquí.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
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
    backgroundColor: '#fff5f5',
    borderWidth: 1.5,
    borderColor: '#e53e3e',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  textoBotonCancelar: {
    color: '#e53e3e',
    fontSize: 15,
    fontWeight: 'bold',
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
});