import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Alert, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { obtenerTurnoAbierto, obtenerResumenTurno, cerrarTurno, obtenerPedidosAbiertosTurno } from '../database/turnos';
import { obtenerResumenExternoPorDespacho } from '../database/despachos';
import { formatCUP } from '../utils';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CierreTurno'>;
};

type ResumenDespacho = {
  despacho_id: number;
  despacho_nombre: string;
  despacho_color: string;
  total_efectivo: number;
  total_transferencia: number;
  cantidad_ventas: number;
};

export default function PantallaCierreTurno({ navigation }: Props) {
  const [cargando, setCargando] = useState(true);
  const [turnoId, setTurnoId] = useState<number | null>(null);
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalTransferencia, setTotalTransferencia] = useState(0);
  const [entradas, setEntradas] = useState<{ nombre: string; cantidad: number; fecha_hora: string }[]>([]);
  const [salidasFamiliares, setSalidasFamiliares] = useState<{ nombre: string; cantidad: number; fecha_hora: string }[]>([]);
  const [inventario, setInventario] = useState<{ nombre: string; existencia: number; alerta_minima: number }[]>([]);
  const [cantidadVentas, setCantidadVentas] = useState(0);
  const [cantidadAnulaciones, setCantidadAnulaciones] = useState(0);
  const [resumenDespachos, setResumenDespachos] = useState<ResumenDespacho[]>([]);
  const [efectivoReal, setEfectivoReal] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [sinTurno, setSinTurno] = useState(false);
  const [pedidosAbiertos, setPedidosAbiertos] = useState<{ id: number; nombre: string; total: number; }[]>([]);
  const procesandoRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      cargarResumen();
    }, [])
  );

  useEffect(() => {
    if (sinTurno) {
      const timer = setTimeout(() => {
        Alert.alert(
          'Sin turno abierto',
          'No hay un turno abierto. Inicia uno desde la pantalla de inicio.',
          [{ text: 'Volver', onPress: () => navigation.goBack() }]
        );
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [sinTurno]);

  async function cargarResumen() {
    setCargando(true);
    setSinTurno(false);
    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        setSinTurno(true);
        return;
      }
      setTurnoId(turno.id);

      const [resumen, despachos, pedidosOpen] = await Promise.all([
        obtenerResumenTurno(turno.id),
        obtenerResumenExternoPorDespacho(turno.id),
        obtenerPedidosAbiertosTurno(turno.id),
      ]);

      // Añadir justo después
      setPedidosAbiertos(pedidosOpen);

      setTotalEfectivo(resumen.totalEfectivo);
      setTotalTransferencia(resumen.totalTransferencia);
      setEntradas(resumen.entradas);
      setSalidasFamiliares(resumen.salidasFamiliares);
      setInventario(resumen.inventario);
      setCantidadVentas(resumen.cantidadVentas);
      setCantidadAnulaciones(resumen.cantidadAnulaciones);
      setResumenDespachos(despachos as ResumenDespacho[]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el resumen del turno.');
      console.error(error);
    } finally {
      setCargando(false);
    }
  }

  async function handleRefresh() {
    setRefrescando(true);
    await cargarResumen();
    setRefrescando(false);
  }

  function handleCambioEfectivo(texto: string) {
    const filtrado = texto.replace(/[^0-9.]/g, '');
    const partes = filtrado.split('.');
    if (partes.length > 2) return;
    if (partes[1] && partes[1].length > 2) return;
    setEfectivoReal(filtrado);
  }

  function handleBlurEfectivo() {
    const num = parseFloat(efectivoReal);
    if (!isNaN(num)) {
      setEfectivoReal(num.toFixed(2));
    }
  }

  function calcularDiferencia(): { diferencia: number; mensaje: string; color: string; icono: any } | null {
    const real = parseFloat(efectivoReal);
    if (isNaN(real)) return null;
    const diferencia = totalEfectivo - real;
    if (diferencia === 0) return { diferencia: 0, mensaje: 'Caja cuadrada', color: '#38a169', icono: 'checkmark-circle' };
    if (diferencia > 0) return { diferencia, mensaje: `Faltante: ${formatCUP(diferencia)} CUP`, color: '#e53e3e', icono: 'warning' };
    return { diferencia, mensaje: `Sobrante: ${formatCUP(Math.abs(diferencia))} CUP`, color: '#d69e2e', icono: 'information-circle' };
  }

  function handleCerrarTurno() {
    const real = parseFloat(efectivoReal);
    if (isNaN(real) || real < 0) {
      Alert.alert('Error', 'Ingresa el efectivo físico contado para cerrar el turno.');
      return;
    }

    const resultado = calcularDiferencia();

    // Si hay pedidos abiertos, advertir primero
    if (pedidosAbiertos.length > 0) {
      const totalPendiente = pedidosAbiertos.reduce((acc, p) => acc + p.total, 0);
      const detalleMesas = pedidosAbiertos
        .map(p => `• ${p.nombre}: ${formatCUP(p.total)} CUP`)
        .join('\n');

      Alert.alert(
        '⚠️ Hay pedidos sin cobrar',
        `Los siguientes pedidos se cancelarán sin registrar cobro:\n\n${detalleMesas}\n\nTotal pendiente: ${formatCUP(totalPendiente)} CUP\n\n¿Seguro que deseas cerrar el turno y perder estos pedidos?`,
        [
          { text: 'Volver y cobrar', style: 'cancel' },
          {
            text: 'Cerrar de todas formas',
            style: 'destructive',
            onPress: () => mostrarConfirmacionFinal(resultado?.mensaje ?? ''),
          },
        ]
      );
      return;
    }

    mostrarConfirmacionFinal(resultado?.mensaje ?? '');
  }

  function mostrarConfirmacionFinal(mensajeCuadre: string) {
    Alert.alert(
      'Cerrar turno',
      `${mensajeCuadre}\n\n¿Confirmas el cierre del turno?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar turno', style: 'destructive', onPress: confirmarCierre },
      ]
    );
  }

  async function confirmarCierre() {
    if (!turnoId || procesandoRef.current) return;
    procesandoRef.current = true;
    setProcesando(true);
    try {
      const real = parseFloat(efectivoReal);
      await cerrarTurno(turnoId, totalEfectivo, totalTransferencia, real);
      Alert.alert('✅ Turno cerrado', 'El turno fue cerrado exitosamente.', [
        { text: 'OK', onPress: () => navigation.navigate('Inicio') },
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar el turno.');
      console.error(error);
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  }

  function formatearFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' });
  }

  if (cargando || sinTurno) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#2b6cb0" />
        </View>
      </SafeAreaView>
    );
  }

  const totalGeneral = totalEfectivo + totalTransferencia;
  const resultadoCuadre = calcularDiferencia();

  // Totales de despachos externos
  const totalExternoEfectivo = resumenDespachos.reduce((acc, d) => acc + d.total_efectivo, 0);
  const totalExternoTransferencia = resumenDespachos.reduce((acc, d) => acc + d.total_transferencia, 0);
  const totalExterno = totalExternoEfectivo + totalExternoTransferencia;

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={handleRefresh} tintColor="#2b6cb0" />
        }
      >
        {/* ── Resumen de ventas propias ── */}
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="stats-chart-outline" size={20} color="#38a169" />
            <Text style={estilos.tituloSeccion}>Resumen de ventas</Text>
            <TouchableOpacity onPress={cargarResumen} style={estilos.botonRefrescar} disabled={cargando}>
              <Ionicons name="refresh" size={18} color={cargando ? '#cbd5e0' : '#2b6cb0'} />
            </TouchableOpacity>
          </View>

          <View style={estilos.filasConteo}>
            <View style={estilos.chipConteo}>
              <Ionicons name="checkmark-circle" size={14} color="#38a169" />
              <Text style={estilos.textoChipConteo}>
                {cantidadVentas} {cantidadVentas === 1 ? 'venta' : 'ventas'}
              </Text>
            </View>
            {cantidadAnulaciones > 0 && (
              <View style={[estilos.chipConteo, estilos.chipConteoAnulacion]}>
                <Ionicons name="close-circle" size={14} color="#e53e3e" />
                <Text style={[estilos.textoChipConteo, { color: '#e53e3e' }]}>
                  {cantidadAnulaciones} anulada{cantidadAnulaciones > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          <View style={estilos.filaResumen}>
            <View style={estilos.filaIcono}>
              <Ionicons name="cash-outline" size={16} color="#718096" />
              <Text style={estilos.etiquetaResumen}>Efectivo:</Text>
            </View>
            <Text style={estilos.valorResumen}>{formatCUP(totalEfectivo)} CUP</Text>
          </View>
          <View style={estilos.filaResumen}>
            <View style={estilos.filaIcono}>
              <Ionicons name="card-outline" size={16} color="#718096" />
              <Text style={estilos.etiquetaResumen}>Transferencia:</Text>
            </View>
            <Text style={estilos.valorResumen}>{formatCUP(totalTransferencia)} CUP</Text>
          </View>
          <View style={[estilos.filaResumen, estilos.filaTotal]}>
            <Text style={estilos.etiquetaTotal}>Total general:</Text>
            <Text style={estilos.valorTotal}>{formatCUP(totalGeneral)} CUP</Text>
          </View>
        </View>

        {/* ── Despachos externos ── */}
        {resumenDespachos.length > 0 && (
          <View style={estilos.seccion}>
            <View style={estilos.cabeceraSeccion}>
              <Ionicons name="storefront-outline" size={20} color="#319795" />
              <Text style={estilos.tituloSeccion}>Ventas de despachos externos</Text>
            </View>

            {/* Aviso: este dinero NO es tuyo */}
            <View style={estilos.alertaExterna}>
              <Ionicons name="information-circle-outline" size={16} color="#2c7a7b" />
              <Text style={estilos.textoAlertaExterna}>
                Este dinero <Text style={{ fontWeight: 'bold' }}>no pertenece a tu caja</Text>.
                Debes depositarlo a cada despacho por separado.
              </Text>
            </View>

            {resumenDespachos.map((d) => (
              <View key={d.despacho_id} style={estilos.filaDespacho}>
                <View style={[estilos.puntoCColor, { backgroundColor: d.despacho_color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={estilos.nombreDespacho}>{d.despacho_nombre}</Text>
                  <Text style={estilos.detailDespacho}>
                    {d.cantidad_ventas} venta{d.cantidad_ventas !== 1 ? 's' : ''}
                    {d.total_efectivo > 0 ? `  ·  Ef: ${formatCUP(d.total_efectivo)}` : ''}
                    {d.total_transferencia > 0 ? `  ·  Tr: ${formatCUP(d.total_transferencia)}` : ''}
                  </Text>
                </View>
                <Text style={[estilos.totalDespacho, { color: d.despacho_color }]}>
                  {formatCUP(d.total_efectivo + d.total_transferencia)} CUP
                </Text>
              </View>
            ))}

            {/* Total a depositar por despacho */}
            <View style={[estilos.filaResumen, estilos.filaTotal, { marginTop: 12 }]}>
              <Text style={estilos.etiquetaTotal}>Total a depositar:</Text>
              <Text style={[estilos.valorTotal, { color: '#319795' }]}>
                {formatCUP(totalExterno)} CUP
              </Text>
            </View>
          </View>
        )}

        {/* ── Gran total del día ── */}
        {resumenDespachos.length > 0 && (
          <View style={estilos.seccion}>
            <View style={estilos.cabeceraSeccion}>
              <Ionicons name="calculator-outline" size={20} color="#1a1a2e" />
              <Text style={estilos.tituloSeccion}>Gran total del día</Text>
            </View>

            <View style={estilos.filaResumen}>
              <Text style={estilos.etiquetaResumen}>Ventas propias:</Text>
              <Text style={estilos.valorResumen}>{formatCUP(totalGeneral)} CUP</Text>
            </View>
            <View style={estilos.filaResumen}>
              <Text style={estilos.etiquetaResumen}>Ventas de despachos:</Text>
              <Text style={estilos.valorResumen}>{formatCUP(totalExterno)} CUP</Text>
            </View>

            {/* Divisor */}
            <View style={{ height: 1, backgroundColor: '#edf2f7', marginVertical: 8 }} />

            <View style={estilos.filaResumen}>
              <Text style={[estilos.etiquetaTotal, { fontSize: 16 }]}>
                Total movido hoy:
              </Text>
              <Text style={[estilos.valorTotal, { fontSize: 20, color: '#1a1a2e' }]}>
                {formatCUP(totalGeneral + totalExterno)} CUP
              </Text>
            </View>

            <Text style={estilosLocal.notaGranTotal}>
              * Las ventas de despachos no son tuyas. Tu dinero real es {formatCUP(totalGeneral)} CUP.
            </Text>
          </View>
        )}

        {/* ── Cuadre de caja ── */}
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="receipt-outline" size={20} color="#d69e2e" />
            <Text style={estilos.tituloSeccion}>Cuadre de caja</Text>
          </View>

          <Text style={estilos.etiquetaCuadre}>Efectivo físico contado (CUP)</Text>
          <TextInput
            style={[
              estilos.inputEfectivo,
              efectivoReal !== '' && !isNaN(parseFloat(efectivoReal)) && {
                borderColor:
                  calcularDiferencia()?.diferencia === 0
                    ? '#38a169'
                    : (calcularDiferencia()?.diferencia ?? 0) > 0
                    ? '#e53e3e'
                    : '#d69e2e',
              },
            ]}
            value={efectivoReal}
            onChangeText={handleCambioEfectivo}
            onBlur={handleBlurEfectivo}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#a0aec0"
          />

          {resultadoCuadre && (
            <View style={[estilos.resultadoCuadre, { borderColor: resultadoCuadre.color }]}>
              <View style={estilos.filaResultado}>
                <Ionicons name={resultadoCuadre.icono} size={20} color={resultadoCuadre.color} />
                <Text style={[estilos.textoResultado, { color: resultadoCuadre.color }]}>
                  {resultadoCuadre.mensaje}
                </Text>
              </View>
              <Text style={estilos.detalleResultado}>
                Esperado: {formatCUP(totalEfectivo)} CUP · Real: {formatCUP(parseFloat(efectivoReal))} CUP
              </Text>
            </View>
          )}
        </View>

        {/* ── Entradas del turno ── */}
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
                <Text style={estilos.horaEntrada}>{formatearFecha(entrada.fecha_hora)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Salidas familiares ── */}
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
                <Text style={estilos.horaEntrada}>{formatearFecha(salida.fecha_hora)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Inventario final ── */}
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="cube-outline" size={20} color="#805ad5" />
            <Text style={estilos.tituloSeccion}>Inventario para el próximo turno</Text>
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

        {/* ── Advertencia pedidos abiertos ── */}
        {pedidosAbiertos.length > 0 && (
          <View style={estilosLocal.advertenciaPedidos}>
            <View style={estilosLocal.cabeceraAdvertencia}>
              <Ionicons name="warning" size={20} color="#c05621" />
              <Text style={estilosLocal.tituloAdvertencia}>
                {pedidosAbiertos.length} pedido{pedidosAbiertos.length > 1 ? 's' : ''} sin cobrar
              </Text>
            </View>
            <Text style={estilosLocal.textoAdvertencia}>
              Estos pedidos se cancelarán si cierras el turno ahora:
            </Text>
            {pedidosAbiertos.map(p => (
              <View key={p.id} style={estilosLocal.filaPedido}>
                <Ionicons name="restaurant-outline" size={14} color="#c05621" />
                <Text style={estilosLocal.nombrePedido}>{p.nombre}</Text>
                <Text style={estilosLocal.totalPedido}>{formatCUP(p.total)} CUP</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Botón cerrar turno ── */}
        <TouchableOpacity
          style={[estilos.botonCerrar, procesando && estilos.botonDeshabilitado]}
          onPress={handleCerrarTurno}
          disabled={procesando}
        >
          <Text style={estilos.textoBotonCerrar}>
            {procesando ? 'Cerrando turno...' : 'CERRAR TURNO'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f0f4f8' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  cabeceraSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingBottom: 8,
  },
  tituloSeccion: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', flex: 1 },
  botonRefrescar: { padding: 4 },
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
  filasConteo: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  chipConteo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fff4',
    borderWidth: 1,
    borderColor: '#9ae6b4',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipConteoAnulacion: { backgroundColor: '#fff5f5', borderColor: '#feb2b2' },
  textoChipConteo: { fontSize: 13, fontWeight: '700', color: '#2f855a' },
  filaResumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filaIcono: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etiquetaResumen: { fontSize: 14, color: '#718096' },
  valorResumen: { fontSize: 14, fontWeight: '600', color: '#2d3748' },
  filaTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  etiquetaTotal: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e' },
  valorTotal: { fontSize: 18, fontWeight: '900', color: '#2b6cb0' },
  // Despachos externos
  alertaExterna: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#e6fffa',
    borderWidth: 1,
    borderColor: '#81e6d9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  textoAlertaExterna: { flex: 1, fontSize: 13, color: '#2c7a7b', lineHeight: 18 },
  filaDespacho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  puntoCColor: { width: 12, height: 12, borderRadius: 6 },
  nombreDespacho: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  detailDespacho: { fontSize: 12, color: '#718096', marginTop: 1 },
  totalDespacho: { fontSize: 15, fontWeight: 'bold' },
  // Cuadre
  etiquetaCuadre: { fontSize: 14, color: '#4a5568', marginBottom: 8, fontWeight: '600' },
  inputEfectivo: {
    borderWidth: 1.5,
    borderColor: '#cbd5e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: '#2d3748',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  resultadoCuadre: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#f8fafc',
  },
  filaResultado: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  textoResultado: { fontSize: 16, fontWeight: 'bold' },
  detalleResultado: { fontSize: 13, color: '#718096', marginLeft: 28 },
  // Entradas / salidas
  filaEntrada: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    gap: 8,
  },
  nombreEntrada: { flex: 1, fontSize: 15, color: '#1a1a2e' },
  cantidadEntrada: { fontSize: 15, fontWeight: '600', color: '#38a169' },
  horaEntrada: { fontSize: 13, color: '#a0aec0', width: 48, textAlign: 'right' },
  // Inventario
  filaInventario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  nombreInventario: { flex: 1, fontSize: 15, color: '#1a1a2e', marginRight: 8 },
  stockInventario: { fontSize: 15, fontWeight: '600' },
  // Botón cerrar
  botonCerrar: {
    backgroundColor: '#e53e3e',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginTop: 20,
    alignItems: 'center',
    elevation: 3,
  },
  botonDeshabilitado: { backgroundColor: '#a0aec0' },
  textoBotonCerrar: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});

const estilosLocal = StyleSheet.create({
  notaGranTotal: {
    fontSize: 12,
    color: '#a0aec0',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 18,
  },
  advertenciaPedidos: {
    backgroundColor: '#fffaf0',
    borderWidth: 1.5,
    borderColor: '#f6ad55',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  cabeceraAdvertencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tituloAdvertencia: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#c05621',
  },
  textoAdvertencia: {
    fontSize: 13,
    color: '#7b341e',
    marginBottom: 10,
  },
  filaPedido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#feebc8',
  },
  nombrePedido: {
    flex: 1,
    fontSize: 14,
    color: '#c05621',
    fontWeight: '600',
  },
  totalPedido: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#c05621',
  },
});