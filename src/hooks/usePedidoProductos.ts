import { useState, useEffect, useMemo } from 'react';
import Toast from 'react-native-toast-message';
import {
  PedidoItem,
  agregarItemPedido,
  agregarItemDespachoAlPedido,
  actualizarCantidadItem,
  eliminarItemPedido,
} from '../database/pedidos';
import {
  obtenerDespachos,
  obtenerProductosDespacho,
  Despacho,
  ProductoDespacho,
} from '../database/despachos';
import { Producto } from '../types';
import { formatCUP } from '../utils';
import { useProductos } from '../context/ProductosContext';
import { Alert } from 'react-native';

export type FuenteAgregar = 'inventario' | 'despacho';

type ItemListaModal = Producto | { __separador: true; id: number };

interface UsePedidoProductosProps {
  pedidoId: number;
  onItemsChanged: () => Promise<void>;
}

export function usePedidoProductos({
  pedidoId,
  onItemsChanged,
}: UsePedidoProductosProps) {
  const { productos: todosLosProductos, cargandoProductos } = useProductos();

  const [busqueda, setBusqueda] = useState('');
  const [fuenteAgregar, setFuenteAgregar] = useState<FuenteAgregar>('inventario');
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [despachoSeleccionado, setDespachoSeleccionado] = useState<Despacho | null>(null);
  const [productosDespacho, setProductosDespacho] = useState<ProductoDespacho[]>([]);
  const [cargandoDespacho, setCargandoDespacho] = useState(false);

  useEffect(() => {
    obtenerDespachos().then(setDespachos).catch(console.error);
  }, []);

  useEffect(() => {
    if (!despachoSeleccionado) {
      setProductosDespacho([]);
      return;
    }
    setCargandoDespacho(true);
    setBusqueda('');
    obtenerProductosDespacho(despachoSeleccionado.id)
      .then(setProductosDespacho)
      .catch(console.error)
      .finally(() => setCargandoDespacho(false));
  }, [despachoSeleccionado]);

  const productosFiltrados = useMemo((): ItemListaModal[] => {
    const base = busqueda.trim()
      ? todosLosProductos.filter(p =>
          p.nombre.toLowerCase().includes(busqueda.toLowerCase())
        )
      : todosLosProductos;
    const disponibles = base.filter(p => p.existencia > 0);
    const agotados = base.filter(p => p.existencia <= 0);
    if (agotados.length === 0) return disponibles;
    return [...disponibles, { __separador: true as const, id: -1 }, ...agotados];
  }, [busqueda, todosLosProductos]);

  const productosDespachoFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productosDespacho;
    return productosDespacho.filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [busqueda, productosDespacho]);

  function cambiarFuenteAgregar(fuente: FuenteAgregar) {
    setFuenteAgregar(fuente);
    setBusqueda('');
    if (fuente === 'inventario') setDespachoSeleccionado(null);
  }

  async function handleAgregarProductoPropio(producto: Producto, cantidad: number) {
    if (cantidad <= 0) return;
    try {
      await agregarItemPedido(pedidoId, producto, cantidad);
      await onItemsChanged();
      Toast.show({
        type: 'success',
        text1: `${cantidad}× ${producto.nombre} añadido`,
        text2: `Subtotal: ${formatCUP(producto.precio * cantidad)} CUP`,
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e?.message ?? 'No se pudo añadir.',
        position: 'top',
      });
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
      await onItemsChanged();
      const despacho = despachos.find(d => d.id === despachoId);
      Toast.show({
        type: 'success',
        text1: `${cantidad}× ${producto.nombre} añadido`,
        text2: `${despacho?.nombre ?? 'Despacho'} · ${formatCUP(
          producto.precio * cantidad
        )} CUP`,
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e?.message ?? 'No se pudo añadir.',
        position: 'top',
      });
    }
  }

  async function handleCambiarCantidad(item: PedidoItem, delta: number) {
    const nueva = item.cantidad + delta;
    if (nueva < 0) return;
    try {
      await actualizarCantidadItem(item.id, pedidoId, nueva, item.precio_aplicado);
      await onItemsChanged();
    } catch (e) {
      console.error(e);
    }
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
            await onItemsChanged();
          },
        },
      ]
    );
  }

  return {
    // Búsqueda y fuente
    busqueda,
    setBusqueda,
    fuenteAgregar,
    cambiarFuenteAgregar,
    // Inventario propio
    todosLosProductos,
    cargandoProductos,
    productosFiltrados,
    // Despachos
    despachos,
    despachoSeleccionado,
    setDespachoSeleccionado,
    productosDespacho,
    cargandoDespacho,
    productosDespachoFiltrados,
    // Acciones
    handleAgregarProductoPropio,
    handleAgregarProductoDespacho,
    handleCambiarCantidad,
    handleEliminarItem,
  };
}