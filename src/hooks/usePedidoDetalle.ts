import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../../App';
import {
  PedidoConItems, PedidoItem,
  obtenerPedidoConItems,
  agregarItemPedido,
  agregarItemDespachoAlPedido,
  actualizarCantidadItem,
  eliminarItemPedido,
  cerrarPedidoComoVenta,
  renombrarPedido,
} from '../database/pedidos';
import { obtenerTurnoAbierto } from '../database/turnos';
import { obtenerDespachos, obtenerProductosDespacho, Despacho, ProductoDespacho } from '../database/despachos';
import { Producto } from '../types';
import { formatCUP, sumaSegura } from '../utils';
import { useProductos } from '../context/ProductosContext';

export type ModalActivo = 'ninguno' | 'agregarProducto' | 'cobro';
export type FuenteAgregar = 'inventario' | 'despacho';

export function usePedidoDetalle(
  pedidoId: number,
  navigation: NativeStackNavigationProp<RootStackParamList, 'DetallePedido'>
) {
  // ── Estado del pedido ─────────────────────────────────────────────────────
  const [pedido, setPedido] = useState<PedidoConItems | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const procesandoRef = useRef(false);

  // ── Estado de modales ─────────────────────────────────────────────────────
  const [modalActivo, setModalActivo] = useState<ModalActivo>('ninguno');

  // ── Estado del modal de agregar ───────────────────────────────────────────
  const { productos: todosLosProductos, cargandoProductos, cargarProductos } = useProductos();
  const [busqueda, setBusqueda] = useState('');
  const [fuenteAgregar, setFuenteAgregar] = useState<FuenteAgregar>('inventario');
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [despachoSeleccionado, setDespachoSeleccionado] = useState<Despacho | null>(null);
  const [productosDespacho, setProductosDespacho] = useState<ProductoDespacho[]>([]);
  const [cargandoDespacho, setCargandoDespacho] = useState(false);

  // ── Estado del modal de cobro ─────────────────────────────────────────────
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cambio, setCambio] = useState(0);
  const [usarPropina, setUsarPropina] = useState(false);

  // ── Estado de renombrar ───────────────────────────────────────────────────
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreTemp, setNombreTemp] = useState('');

  // ── Totales separados ─────────────────────────────────────────────────────
  const totalesSeparados = useMemo(() => {
    if (!pedido) return { propio: 0, porDespacho: new Map<number, { nombre: string; color: string; total: number }>() };

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

  // ── Productos filtrados ───────────────────────────────────────────────────
  type ItemListaModal = Producto | { __separador: true; id: number };

  const productosFiltrados = useMemo((): ItemListaModal[] => {
    const base = busqueda.trim()
      ? todosLosProductos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      : todosLosProductos;
    const disponibles = base.filter(p => p.existencia > 0);
    const agotados = base.filter(p => p.existencia <= 0);
    if (agotados.length === 0) return disponibles;
    return [...disponibles, { __separador: true as const, id: -1 }, ...agotados];
  }, [busqueda, todosLosProductos]);

  const productosDespachoFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productosDespacho;
    return productosDespacho.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  }, [busqueda, productosDespacho]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (pedido) navigation.setOptions({ title: pedido.nombre });
  }, [pedido?.nombre]);

  useEffect(() => {
    if (metodoPago === 'efectivo' && pedido) {
      const recibido = parseFloat(montoRecibido);
      setCambio(!isNaN(recibido) && recibido >= pedido.total ? recibido - pedido.total : 0);
    } else {
      setCambio(0);
    }
  }, [montoRecibido, metodoPago, pedido?.total]);

  useEffect(() => {
    obtenerDespachos().then(setDespachos).catch(console.error);
  }, []);

  useEffect(() => {
    if (!despachoSeleccionado) { setProductosDespacho([]); return; }
    setCargandoDespacho(true);
    setBusqueda('');
    obtenerProductosDespacho(despachoSeleccionado.id)
      .then(setProductosDespacho)
      .catch(console.error)
      .finally(() => setCargandoDespacho(false));
  }, [despachoSeleccionado]);

  useFocusEffect(
    useCallback(() => { cargarPedido(); }, [pedidoId])
  );

  // ── Funciones de datos ────────────────────────────────────────────────────
  async function cargarPedido() {
    setCargando(true);
    try {
      const datos = await obtenerPedidoConItems(pedidoId);
      setPedido(datos);
    } finally {
      setCargando(false);
    }
  }

  // ── Acciones de modales ───────────────────────────────────────────────────
  function abrirModalAgregar() {
    setBusqueda('');
    setFuenteAgregar('inventario');
    setDespachoSeleccionado(null);
    setModalActivo('agregarProducto');
  }

  function abrirModalCobro() {
    setMontoRecibido('');
    setMetodoPago('efectivo');
    setUsarPropina(false);
    setModalActivo('cobro');
  }

  function cerrarModal() {
    setModalActivo('ninguno');
  }

  function cambiarFuenteAgregar(fuente: FuenteAgregar) {
    setFuenteAgregar(fuente);
    setBusqueda('');
    if (fuente === 'inventario') setDespachoSeleccionado(null);
  }

  // ── Acciones de items ─────────────────────────────────────────────────────
  async function handleAgregarProductoPropio(producto: Producto, cantidad: number) {
    if (cantidad <= 0) return;
    try {
      await agregarItemPedido(pedidoId, producto, cantidad);
      await cargarPedido();
      Toast.show({
        type: 'success',
        text1: `${cantidad}× ${producto.nombre} añadido`,
        text2: `Subtotal: ${formatCUP(producto.precio * cantidad)} CUP`,
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message ?? 'No se pudo añadir.', position: 'top' });
    }
  }

  async function handleAgregarProductoDespacho(
    producto: ProductoDespacho,
    despachoId: number,
    cantidad: number
  ) {
    if (cantidad <= 0) return;
    try {
      await agregarItemDespachoAlPedido(pedidoId, producto, despachoId, cantidad);
      await cargarPedido();
      const despacho = despachos.find(d => d.id === despachoId);
      Toast.show({
        type: 'success',
        text1: `${cantidad}× ${producto.nombre} añadido`,
        text2: `${despacho?.nombre ?? 'Despacho'} · ${formatCUP(producto.precio * cantidad)} CUP`,
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message ?? 'No se pudo añadir.', position: 'top' });
    }
  }

  async function handleCambiarCantidad(item: PedidoItem, delta: number) {
    const nueva = item.cantidad + delta;
    if (nueva < 0) return;
    try {
      await actualizarCantidadItem(item.id, pedidoId, nueva, item.precio_aplicado);
      await cargarPedido();
    } catch (e) { console.error(e); }
  }

  async function handleEliminarItem(item: PedidoItem) {
    Alert.alert(
      '¿Quitar producto?',
      `Eliminar "${item.nombre_producto}" del pedido.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            await eliminarItemPedido(item.id, pedidoId);
            await cargarPedido();
          },
        },
      ]
    );
  }

  async function handleGuardarNombre() {
    if (!nombreTemp.trim()) return;
    try {
      await renombrarPedido(pedidoId, nombreTemp);
      await cargarPedido();
      setEditandoNombre(false);
    } catch (e) { console.error(e); }
  }

  async function handleCerrarCuenta() {
    if (!pedido || pedido.items.length === 0) {
      Alert.alert('Pedido vacío', 'Agrega al menos un producto antes de cobrar.');
      return;
    }
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setProcesando(true);

    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) { Alert.alert('Error', 'No hay turno abierto.'); return; }

      const propinaFinal = usarPropina ? cambio : 0;
      await cerrarPedidoComoVenta(pedidoId, metodoPago, turno.id, propinaFinal);
      await cargarProductos();
      cerrarModal();

      const totalDespachos = sumaSegura([...totalesSeparados.porDespacho.values()].map(d => d.total));
      const textoCambio = metodoPago === 'efectivo' && cambio > 0 && !usarPropina
        ? ` · Vuelto: ${formatCUP(cambio)} CUP` : '';
      const textoPropina = propinaFinal > 0 ? ` · Propina: ${formatCUP(propinaFinal)} CUP` : '';
      const texto2 = totalesSeparados.propio > 0 && totalDespachos > 0
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
        ? e.message : 'No se pudo cerrar la cuenta. Intenta de nuevo.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg, position: 'top', visibilityTime: 6000 });
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  }

  // ── Valores derivados ─────────────────────────────────────────────────────
  const botonCobroDeshabilitado =
    procesando || !pedido || pedido.items.length === 0 ||
    (metodoPago === 'efectivo' && (montoRecibido === '' || parseFloat(montoRecibido) < (pedido?.total ?? 0)));

  return {
    // Estado del pedido
    pedido, cargando, procesando,
    // Modales
    modalActivo, abrirModalAgregar, abrirModalCobro, cerrarModal,
    // Modal agregar
    todosLosProductos, cargandoProductos,
    busqueda, setBusqueda,
    fuenteAgregar, cambiarFuenteAgregar,
    despachos, despachoSeleccionado, setDespachoSeleccionado,
    productosDespacho, cargandoDespacho,
    productosFiltrados, productosDespachoFiltrados,
    // Modal cobro
    metodoPago, setMetodoPago,
    montoRecibido, setMontoRecibido,
    cambio, usarPropina, setUsarPropina,
    botonCobroDeshabilitado,
    totalesSeparados,
    // Renombrar
    editandoNombre, setEditandoNombre,
    nombreTemp, setNombreTemp,
    // Acciones
    handleAgregarProductoPropio,
    handleAgregarProductoDespacho,
    handleCambiarCantidad,
    handleEliminarItem,
    handleGuardarNombre,
    handleCerrarCuenta,
  };
}