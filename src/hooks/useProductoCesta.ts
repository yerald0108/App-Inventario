import { useState, useMemo, useCallback } from 'react';
import { LayoutAnimation } from 'react-native';
import { Producto, ItemCesta } from '../types';
import { useProductos } from '../context/ProductosContext';

type ItemEnCesta = {
  cantidad: number;
  precioFinal?: number;
};

type ItemLista = Producto | { __tipo: 'separador'; id: number };

export function useProductoCesta() {
  const { productos, cargandoProductos, cargarProductos } = useProductos();

  const [busqueda, setBusqueda] = useState('');
  const [cesta, setCesta] = useState<Map<number, ItemEnCesta>>(new Map());

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    const t = busqueda.toLowerCase();
    return productos.filter(p => p.nombre.toLowerCase().includes(t));
  }, [busqueda, productos]);

  const productosConSeparador = useMemo((): ItemLista[] => {
    if (productosFiltrados.length === 0) return [];
    const disponibles = productosFiltrados.filter(p => p.existencia > 0);
    const agotados = productosFiltrados.filter(p => p.existencia <= 0);
    if (agotados.length === 0) return disponibles;
    return [...disponibles, { __tipo: 'separador' as const, id: -1 }, ...agotados];
  }, [productosFiltrados]);

  const cambiarCantidad = useCallback((productoId: number, cantidad: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCesta(prev => {
      const nueva = new Map(prev);
      const item = nueva.get(productoId);

      if (cantidad === 0) {
        nueva.delete(productoId);
      } else {
        // Si el item no existe, lo crea con la cantidad. Si existe, solo actualiza la cantidad.
        const newItem = item ? { ...item, cantidad } : { cantidad };
        nueva.set(productoId, newItem);
      }
      return nueva;
    });
  }, []);

  const cambiarPrecio = useCallback((productoId: number, nuevoPrecio: number) => {
    setCesta(prev => {
      const nueva = new Map(prev);
      const item = nueva.get(productoId);
      const producto = productos.find(p => p.id === productoId);

      if (item && producto) {
        const esPrecioOriginal = producto.precio === nuevoPrecio;
        nueva.set(productoId, {
          ...item,
          precioFinal: esPrecioOriginal ? undefined : nuevoPrecio,
        });
      }
      return nueva;
    });
  }, [productos]);

  const obtenerItemsCesta = useCallback((): ItemCesta[] => {
    const items: ItemCesta[] = [];
    cesta.forEach((item, productoId) => {
      const producto = productos.find(p => p.id === productoId);
      if (producto) {
        const precioFinal = item.precioFinal ?? producto.precio;
        items.push({
          producto,
          cantidad: item.cantidad,
          precioFinal,
          precioModificado: item.precioFinal !== undefined,
        });
      }
    });
    return items;
  }, [cesta, productos]);

  const resetCesta = useCallback(() => {
    setCesta(new Map());
    setBusqueda('');
  }, []);

  return {
    productos,
    busqueda,
    setBusqueda,
    cesta,
    cargando: cargandoProductos,
    cargarProductos,
    productosConSeparador,
    cambiarCantidad,
    cambiarPrecio, // <-- Exportar la nueva función
    obtenerItemsCesta,
    resetCesta,
  };
}
