import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { renombrarPedido, obtenerPedidoConItems, PedidoConItems } from '../database/pedidos';
import { RootStackParamList } from '../../App';
import { sumaSegura } from '../utils';
import { usePedidoCobro } from './usePedidoCobro';
import { usePedidoProductos } from './usePedidoProductos';

export type ModalActivo = 'ninguno' | 'agregarProducto' | 'cobro';
// Re-exportamos para que PantallaDetallePedido no cambie sus imports
export type { FuenteAgregar } from './usePedidoProductos';

export function usePedidoDetalle(
  pedidoId: number,
  navigation: NativeStackNavigationProp<RootStackParamList, 'DetallePedido'>
) {
  // ── Estado del pedido ────────────────────────────────────────────────────
  const [pedido, setPedido] = useState<PedidoConItems | null>(null);
  const [cargando, setCargando] = useState(true);

  // ── Estado de modales ────────────────────────────────────────────────────
  const [modalActivo, setModalActivo] = useState<ModalActivo>('ninguno');

  // ── Estado de renombrar ──────────────────────────────────────────────────
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreTemp, setNombreTemp] = useState('');

  // ── Hooks especializados ─────────────────────────────────────────────────
  const productosHook = usePedidoProductos({
    pedidoId,
    onItemsChanged: cargarPedido,
  });

  // ── Totales separados (propio vs despachos) ──────────────────────────────
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
      const despacho = productosHook.despachos.find(d => d.id === item.despacho_id);
      const entrada = porDespacho.get(item.despacho_id) ?? {
        nombre: despacho?.nombre ?? `Despacho ${item.despacho_id}`,
        color: despacho?.color ?? '#805ad5',
        total: 0,
      };
      entrada.total = sumaSegura([entrada.total, item.subtotal]);
      porDespacho.set(item.despacho_id, entrada);
    }
    return { propio, porDespacho };
  }, [pedido, productosHook.despachos]);

  const cobroHook = usePedidoCobro({
    pedidoId,
    pedido,
    navigation,
    onCobrado: cerrarModal,
  });

  // ── Sincronizar título del header ────────────────────────────────────────
  useEffect(() => {
    if (pedido) navigation.setOptions({ title: pedido.nombre });
  }, [pedido?.nombre]);

  useFocusEffect(
    useCallback(() => {
      cargarPedido();
    }, [pedidoId])
  );

  // ── Funciones de datos ───────────────────────────────────────────────────
  async function cargarPedido() {
    setCargando(true);
    try {
      const datos = await obtenerPedidoConItems(pedidoId);
      setPedido(datos);
    } finally {
      setCargando(false);
    }
  }

  // ── Control de modales ───────────────────────────────────────────────────
  function abrirModalAgregar() {
    productosHook.setBusqueda('');
    productosHook.cambiarFuenteAgregar('inventario');
    productosHook.setDespachoSeleccionado(null);
    setModalActivo('agregarProducto');
  }

  function abrirModalCobro() {
    setModalActivo('cobro');
  }

  function cerrarModal() {
    setModalActivo('ninguno');
  }

  // ── Renombrar pedido ─────────────────────────────────────────────────────
  async function handleGuardarNombre() {
    if (!nombreTemp.trim()) return;
    try {
      await renombrarPedido(pedidoId, nombreTemp);
      await cargarPedido();
      setEditandoNombre(false);
    } catch (e) {
      console.error(e);
    }
  }

  return {
    // Estado del pedido
    pedido,
    cargando,
    procesando: cobroHook.procesando,
    totalesSeparados: cobroHook.totalesSeparados,
    // Modales
    modalActivo,
    abrirModalAgregar,
    abrirModalCobro,
    cerrarModal,
    // Productos (de usePedidoProductos)
    ...productosHook,
    // Cobro (de usePedidoCobro)
    handleCerrarCuenta: cobroHook.handleCerrarCuenta,
    // Renombrar
    editandoNombre,
    setEditandoNombre,
    nombreTemp,
    setNombreTemp,
    handleGuardarNombre,
  };
}