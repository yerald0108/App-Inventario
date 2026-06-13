import { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { PedidoConItems } from '../database/pedidos';
import { cerrarPedidoComoVenta } from '../database/pedidos';
import { obtenerTurnoAbierto, obtenerDiaActivo } from '../database/turnos';
import { formatCUP, sumaSegura } from '../utils';
import { useProductos } from '../context/ProductosContext';
import { obtenerDespachos, Despacho } from '../database/despachos';

interface UsePedidoCobroProps {
  pedidoId: number;
  pedido: PedidoConItems | null;
  navigation: NativeStackNavigationProp<RootStackParamList, 'DetallePedido'>;
  onCobrado: () => void;
}

export function usePedidoCobro({
  pedidoId,
  pedido,
  navigation,
  onCobrado,
}: UsePedidoCobroProps) {
  const { cargarProductos } = useProductos();
  const [procesando, setProcesando] = useState(false);
  const [procesandoRef] = useState({ current: false });
  const [despachos, setDespachos] = useState<Despacho[]>([]);

  useEffect(() => {
    obtenerDespachos().then(setDespachos).catch(console.error);
  }, []);

  const totalesSeparados = useMemo(() => {
    if (!pedido) {
      return {
        propio: 0,
        porDespacho: new Map<number, { nombre: string; color: string; total: number }>(),
      };
    }
    const propio = sumaSegura(
      pedido.items.filter(i => i.origen === 'propio').map(i => i.subtotal)
    );
    const porDespacho = new Map<number, { nombre: string; color: string; total: number }>();
    for (const item of pedido.items.filter(i => i.origen === 'despacho')) {
      if (item.despacho_id === null) continue;
      const despacho = despachos.find(d => d.id === item.despacho_id);
      const entrada = porDespacho.get(item.despacho_id) ?? {
        nombre: despacho?.nombre ?? `Despacho ${item.despacho_id}`,
        color: despacho?.color ?? '#805ad5',
        total: 0,
      };
      entrada.total = sumaSegura([entrada.total, item.subtotal]);
      porDespacho.set(item.despacho_id, entrada);
    }
    return { propio, porDespacho };
  }, [pedido, despachos]);

  async function handleCerrarCuenta(
    metodoPagoParam?: 'efectivo' | 'transferencia',
    cambioParam?: number,
    propinaParam?: number
  ) {
    if (!pedido || pedido.items.length === 0) {
      Alert.alert('Pedido vacío', 'Agrega al menos un producto antes de cobrar.');
      return;
    }
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setProcesando(true);

    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        Alert.alert('Error', 'No hay turno abierto.');
        return;
      }

      const metodoFinal = metodoPagoParam ?? 'efectivo';
      const cambioFinal = cambioParam ?? 0;
      const propinaFinal = propinaParam ?? 0;

      const diaActivo = await obtenerDiaActivo(turno.id);
      await cerrarPedidoComoVenta(pedidoId, metodoFinal, turno.id, propinaFinal, diaActivo?.id ?? null);
      
      await cargarProductos();
      onCobrado();

      const totalDespachos = sumaSegura(
        [...totalesSeparados.porDespacho.values()].map(d => d.total)
      );
      const textoCambio =
        metodoFinal === 'efectivo' && cambioFinal > 0 && propinaFinal === 0
          ? ` · Vuelto: ${formatCUP(cambioFinal)} CUP`
          : '';
      const textoPropina =
        propinaFinal > 0 ? ` · Propina: ${formatCUP(propinaFinal)} CUP` : '';
      const texto2 =
        totalesSeparados.propio > 0 && totalDespachos > 0
          ? `Tuyo: ${formatCUP(totalesSeparados.propio)} · Despachos: ${formatCUP(totalDespachos)} CUP${textoCambio}${textoPropina}`
          : `${formatCUP(pedido.total)} CUP${textoCambio}${textoPropina}`;

      Toast.show({
        type: 'success',
        text1: `✅ Cuenta cerrada — ${pedido.nombre}`,
        text2: texto2,
        position: 'top',
        visibilityTime: 4000,
      });

      navigation.goBack();
    } catch (e: any) {
      const msg = e?.message?.startsWith('Stock insuficiente')
        ? e.message
        : 'No se pudo cerrar la cuenta. Intenta de nuevo.';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: msg,
        position: 'top',
        visibilityTime: 6000,
      });
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  }

  return {
    procesando,
    totalesSeparados,
    handleCerrarCuenta,
  };
}