import { useState, useEffect, useCallback, useMemo } from 'react';
import { LayoutAnimation } from 'react-native';
import { Producto, ItemCesta } from '../types';
import { obtenerProductos } from '../database/productos';

type ItemLista = Producto | { __tipo: 'separador'; id: number };

export function useProductoCesta() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cesta, setCesta] = useState<Map<number, number>>(new Map());
  const [cargando, setCargando] = useState(true);

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    try {
      const lista = await obtenerProductos();
      setProductos(lista);
    } catch (e) {
      console.error('useProductoCesta: error al cargar productos', e);
    } finally {
      setCargando(false);
    }
  }, []);

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

  function cambiarCantidad(productoId: number, cantidad: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCesta(prev => {
      const nueva = new Map(prev);
      if (cantidad === 0) nueva.delete(productoId);
      else nueva.set(productoId, cantidad);
      return nueva;
    });
  }

  function obtenerItemsCesta(): ItemCesta[] {
    const items: ItemCesta[] = [];
    cesta.forEach((cantidad, productoId) => {
      const producto = productos.find(p => p.id === productoId);
      if (producto) items.push({ producto, cantidad });
    });
    return items;
  }

  function resetCesta() {
    setCesta(new Map());
    setBusqueda('');
  }

  return {
    productos,
    busqueda,
    setBusqueda,
    cesta,
    cargando,
    cargarProductos,
    productosConSeparador,
    cambiarCantidad,
    obtenerItemsCesta,
    resetCesta,
  };
}