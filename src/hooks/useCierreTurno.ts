import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { obtenerTurnoAbierto, obtenerResumenTurno, cerrarTurno, obtenerPedidosAbiertosTurno, obtenerInventarioInicialTurno } from '../database/turnos';
import { obtenerMermasTurno, MermaAgrupada } from '../database/mermas';
import { obtenerResumenExternoPorDespacho } from '../database/despachos';
import { formatCUP } from '../utils';
import { useExpandable } from './useExpandable';

export type ResumenDespacho = {
  despacho_id: number;
  despacho_nombre: string;
  despacho_color: string;
  total_efectivo: number;
  total_transferencia: number;
  cantidad_ventas: number;
};

export type ResultadoCuadre = {
  diferencia: number;
  mensaje: string;
  color: string;
  icono: any;
};

export function useCierreTurno(
  navigation: NativeStackNavigationProp<RootStackParamList, 'CierreTurno'>
) {
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
  const [pedidosAbiertos, setPedidosAbiertos] = useState<{ id: number; nombre: string; total: number }[]>([]);
  const [mermas, setMermas] = useState<MermaAgrupada[]>([]);
  const [inventarioInicial, setInventarioInicial] = useState<{ nombre: string; existencia: number; alerta_minima: number }[]>([]);
  const [totalPropinas, setTotalPropinas] = useState(0);
  const procesandoRef = useRef(false);
  const { expandidos: mermasExpandidas, toggle: toggleMerma } = useExpandable();

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

      const [resumen, despachos, pedidosOpen, listaMermas, inventIni] = await Promise.all([
        obtenerResumenTurno(turno.id),
        obtenerResumenExternoPorDespacho(turno.id),
        obtenerPedidosAbiertosTurno(turno.id),
        obtenerMermasTurno(turno.id),
        obtenerInventarioInicialTurno(turno.id),
      ]);

      setPedidosAbiertos(pedidosOpen);
      setTotalEfectivo(resumen.totalEfectivo);
      setTotalTransferencia(resumen.totalTransferencia);
      setEntradas(resumen.entradas);
      setSalidasFamiliares(resumen.salidasFamiliares);
      setInventario(resumen.inventario);
      setCantidadVentas(resumen.cantidadVentas);
      setCantidadAnulaciones(resumen.cantidadAnulaciones);
      setResumenDespachos(despachos as ResumenDespacho[]);
      setMermas(listaMermas);
      setInventarioInicial(inventIni);
      setTotalPropinas(resumen.totalPropinas);
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

  function calcularDiferencia(): ResultadoCuadre | null {
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

  return {
    // Estado
    cargando,
    turnoId,
    totalEfectivo,
    totalTransferencia,
    entradas,
    salidasFamiliares,
    inventario,
    cantidadVentas,
    cantidadAnulaciones,
    resumenDespachos,
    efectivoReal,
    procesando,
    refrescando,
    sinTurno,
    pedidosAbiertos,
    mermas,
    totalPropinas,
    inventarioInicial,
    mermasExpandidas,
    toggleMerma,
    // Acciones
    cargarResumen,
    handleRefresh,
    handleCambioEfectivo,
    handleBlurEfectivo,
    calcularDiferencia,
    handleCerrarTurno,
  };
}