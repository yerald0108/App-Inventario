import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { obtenerDetalleTurno } from '../database/turnos';
import { obtenerVentasTurnoActual, obtenerAnulacionesTurno } from '../database/cancelaciones';
import { Turno, VentaAgrupada } from '../types';

type Props = {
  route: RouteProp<RootStackParamList, 'DetalleTurno'>;
};

export default function PantallaDetalleTurno({ route }: Props) {
  const { turnoId } = route.params;
  const [cargando, setCargando] = useState(true);
  const [turno, setTurno] = useState<Turno | null>(null);
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalTransferencia, setTotalTransferencia] = useState(0);
  const [entradas, setEntradas] = useState<{ nombre: string; cantidad: number; fecha_hora: string }[]>([]);
  const [salidasFamiliares, setSalidasFamiliares] = useState<{ nombre: string; cantidad: number; fecha_hora: string }[]>([]);
  const [ventas, setVentas] = useState<VentaAgrupada[]>([]);
  const [anulaciones, setAnulaciones] = useState<VentaAgrupada[]>([]);
  const [inventario, setInventario] = useState<{ nombre: string; existencia: number; alerta_minima: number }[]>([]);

  useEffect(() => {
    cargarDetalle();
  }, []);

  async function cargarDetalle() {
    setCargando(true);
    const detalle = await obtenerDetalleTurno(turnoId);
    if (detalle) {
      setTurno(detalle.turno);
      setTotalEfectivo(detalle.totalEfectivo);
      setTotalTransferencia(detalle.totalTransferencia);
      setEntradas(detalle.entradas);
      setSalidasFamiliares(detalle.salidasFamiliares);
      setInventario(detalle.inventario);

      // Cargar ventas y anulaciones
      const listaVentas = await obtenerVentasTurnoActual(turnoId);
      const listaAnulaciones = await obtenerAnulacionesTurno(turnoId);
      setVentas(listaVentas);
      setAnulaciones(listaAnulaciones);
    }
    setCargando(false);
  }

  function formatearFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-CU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatearHora(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' });
  }

  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#2b6cb0" />
        </View>
      </SafeAreaView>
    );
  }

  if (!turno) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}>
          <Text style={estilos.textoVacio}>No se encontró el turno.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalGeneral = totalEfectivo + totalTransferencia;
  const efectivoReal = turno.efectivo_real ?? 0;
  const diferencia = totalEfectivo - efectivoReal;

  let cuadreTexto = '';
  let cuadreColor = '#38a169';
  let cuadreIcono: any = 'checkmark-circle';
  
  if (diferencia === 0) {
    cuadreTexto = 'Caja cuadrada';
    cuadreColor = '#38a169';
    cuadreIcono = 'checkmark-circle';
  } else if (diferencia > 0) {
    cuadreTexto = `Faltante: ${diferencia.toFixed(2)} CUP`;
    cuadreColor = '#e53e3e';
    cuadreIcono = 'warning';
  } else {
    cuadreTexto = `Sobrante: ${Math.abs(diferencia).toFixed(2)} CUP`;
    cuadreColor = '#d69e2e';
    cuadreIcono = 'information-circle';
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      <ScrollView style={estilos.scroll} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Fechas del turno */}
      <View style={estilos.seccion}>
        <View style={estilos.cabeceraSeccion}>
          <Ionicons name="calendar-outline" size={20} color="#2b6cb0" />
          <Text style={estilos.tituloSeccion}>Datos del turno</Text>
        </View>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Apertura:</Text>
          <Text style={estilos.valor}>{formatearFecha(turno.fecha_inicio)}</Text>
        </View>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Cierre:</Text>
          <Text style={estilos.valor}>
            {turno.fecha_cierre ? formatearFecha(turno.fecha_cierre) : '—'}
          </Text>
        </View>
      </View>

      {/* Resumen de ventas */}
      <View style={estilos.seccion}>
        <View style={estilos.cabeceraSeccion}>
          <Ionicons name="stats-chart-outline" size={20} color="#38a169" />
          <Text style={estilos.tituloSeccion}>Resumen de ventas</Text>
        </View>
        <View style={estilos.fila}>
          <View style={estilos.filaIcono}>
            <Ionicons name="cash-outline" size={16} color="#718096" />
            <Text style={estilos.etiqueta}>Efectivo:</Text>
          </View>
          <Text style={estilos.valor}>{totalEfectivo.toFixed(2)} CUP</Text>
        </View>
        <View style={estilos.fila}>
          <View style={estilos.filaIcono}>
            <Ionicons name="card-outline" size={16} color="#718096" />
            <Text style={estilos.etiqueta}>Transferencia:</Text>
          </View>
          <Text style={estilos.valor}>{totalTransferencia.toFixed(2)} CUP</Text>
        </View>
        <View style={[estilos.fila, estilos.filaTotal]}>
          <Text style={estilos.etiquetaTotal}>Total general:</Text>
          <Text style={estilos.valorTotal}>{totalGeneral.toFixed(2)} CUP</Text>
        </View>
      </View>

      {/* Cuadre de caja */}
      <View style={estilos.seccion}>
        <View style={estilos.cabeceraSeccion}>
          <Ionicons name="receipt-outline" size={20} color="#d69e2e" />
          <Text style={estilos.tituloSeccion}>Cuadre de caja</Text>
        </View>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Esperado:</Text>
          <Text style={estilos.valor}>{totalEfectivo.toFixed(2)} CUP</Text>
        </View>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Real contado:</Text>
          <Text style={estilos.valor}>{efectivoReal.toFixed(2)} CUP</Text>
        </View>
        <View style={[estilos.resultadoCuadre, { borderColor: cuadreColor }]}>
          <Ionicons name={cuadreIcono} size={18} color={cuadreColor} />
          <Text style={[estilos.textoCuadre, { color: cuadreColor }]}>
            {cuadreTexto}
          </Text>
        </View>
      </View>

      {/* Ventas del turno */}
      {ventas.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="cart-outline" size={20} color="#38a169" />
            <Text style={estilos.tituloSeccion}>Ventas ({ventas.length})</Text>
          </View>
          {ventas.map((venta) => (
            <View key={venta.venta_id} style={estilos.filaHistorialVenta}>
              <View style={estilos.cabeceraFilaVenta}>
                <Text style={estilos.horaVenta}>{formatearHora(venta.fecha_hora)}</Text>
                <Text style={estilos.metodoVenta}>{venta.metodo_pago === 'efectivo' ? '💵' : '📱'}</Text>
                <Text style={estilos.totalVentaFila}>{venta.total.toFixed(2)}</Text>
              </View>
              <View style={estilos.detallesVentaFila}>
                {venta.items.map((item, idx) => (
                  <Text key={idx} style={estilos.textoItemVenta}>
                    {item.cantidad}x {item.nombre_producto}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Anulaciones del turno */}
      {anulaciones.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="trash-outline" size={20} color="#e53e3e" />
            <Text style={estilos.tituloSeccion}>Anulaciones ({anulaciones.length})</Text>
          </View>
          {anulaciones.map((venta) => (
            <View key={venta.venta_id} style={[estilos.filaHistorialVenta, { opacity: 0.6 }]}>
              <View style={estilos.cabeceraFilaVenta}>
                <Text style={[estilos.horaVenta, { textDecorationLine: 'line-through' }]}>
                  {formatearHora(venta.fecha_hora)}
                </Text>
                <Text style={estilos.totalVentaFila}>{venta.total.toFixed(2)}</Text>
              </View>
              <View style={estilos.detallesVentaFila}>
                {venta.items.map((item, idx) => (
                  <Text key={idx} style={[estilos.textoItemVenta, { textDecorationLine: 'line-through' }]}>
                    {item.cantidad}x {item.nombre_producto}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Entradas del turno */}
      {entradas.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="download-outline" size={20} color="#2b6cb0" />
            <Text style={estilos.tituloSeccion}>Entradas del turno</Text>
          </View>
          {entradas.map((entrada, index) => (
            <View key={index} style={estilos.filaEntrada}>
              <Text style={estilos.nombreEntrada}>{entrada.nombre}</Text>
              <Text style={estilos.cantidadEntrada}>+{entrada.cantidad} unid.</Text>
              <Text style={estilos.horaEntrada}>{formatearHora(entrada.fecha_hora)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Salidas familiares (Bug 9) */}
      {salidasFamiliares.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="people-outline" size={20} color="#ed64a6" />
            <Text style={estilos.tituloSeccion}>Consumo familiar</Text>
          </View>
          {salidasFamiliares.map((salida, index) => (
            <View key={index} style={estilos.filaEntrada}>
              <Text style={estilos.nombreEntrada}>{salida.nombre}</Text>
              <Text style={[estilos.cantidadEntrada, { color: '#ed64a6' }]}>
                -{salida.cantidad} unid.
              </Text>
              <Text style={estilos.horaEntrada}>{formatearHora(salida.fecha_hora)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Inventario al cierre */}
      <View style={estilos.seccion}>
        <View style={estilos.cabeceraSeccion}>
          <Ionicons name="cube-outline" size={20} color="#805ad5" />
          <Text style={estilos.tituloSeccion}>Inventario al cierre</Text>
        </View>
        {inventario.map((item, index) => {
          const colorStock = item.existencia < item.alerta_minima ? '#e53e3e' : '#38a169';
          return (
            <View key={index} style={estilos.filaInventario}>
              <Text style={estilos.nombreInventario} numberOfLines={1}>{item.nombre}</Text>
              <Text style={[estilos.stockInventario, { color: colorStock }]}>
                {item.existencia} unid.
              </Text>
            </View>
          );
        })}
      </View>

      </ScrollView>
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
  },
  scroll: {
    flex: 1,
  },
  textoVacio: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  cabeceraSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingBottom: 8,
  },
  tituloSeccion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  seccion: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filaIcono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etiqueta: {
    fontSize: 14,
    color: '#718096',
  },
  valor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  filaTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  etiquetaTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  valorTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2b6cb0',
  },
  resultadoCuadre: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  textoCuadre: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  filaEntrada: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    gap: 8,
  },
  nombreEntrada: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a2e',
  },
  cantidadEntrada: {
    fontSize: 15,
    fontWeight: '600',
    color: '#38a169',
  },
  horaEntrada: {
    fontSize: 13,
    color: '#a0aec0',
    width: 48,
    textAlign: 'right',
  },
  filaInventario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  nombreInventario: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a2e',
    marginRight: 8,
  },
  stockInventario: {
    fontSize: 15,
    fontWeight: '600',
  },
  filaHistorialVenta: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  cabeceraFilaVenta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  horaVenta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  metodoVenta: {
    fontSize: 14,
  },
  totalVentaFila: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginLeft: 'auto',
  },
  detallesVentaFila: {
    paddingLeft: 0,
  },
  textoItemVenta: {
    fontSize: 13,
    color: '#718096',
  },
});