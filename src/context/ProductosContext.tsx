import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { Producto } from '../types';
import { obtenerProductos as dbObtenerProductos } from '../database/productos';
import { handleError } from '../utils';

const LIMITE_POR_PAGINA = 20;

interface ProductosContextType {
  productos: Producto[];
  cargandoProductos: boolean;
  cargandoMas: boolean;
  hayMasProductos: boolean;
  ultimaActualizacion: number;
  cargarProductos: (query?: string) => Promise<void>;
  cargarMasProductos: () => Promise<void>;
  actualizarProductoEnLista: (productoActualizado: Producto) => void;
}

const ProductosContext = createContext<ProductosContextType | undefined>(undefined);

export function ProductosProvider({ children }: { children: React.ReactNode }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMasProductos, setHayMasProductos] = useState(true);
  const [offsetActual, setOffsetActual] = useState(0);
  const [queryActual, setQueryActual] = useState('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState(Date.now());

  const versionRef = useRef(0);

  const cargarProductos = useCallback(async (query: string = '') => {
    // Incrementar versión invalida cualquier carga anterior en vuelo
    const version = ++versionRef.current;

    setCargandoProductos(true);
    setQueryActual(query);
    setOffsetActual(0);
    try {
      const lista = await dbObtenerProductos(query, LIMITE_POR_PAGINA, 0);

      // Solo aplicar si esta sigue siendo la carga más reciente
      if (version !== versionRef.current) return;

      setProductos(lista);
      setHayMasProductos(lista.length === LIMITE_POR_PAGINA);
      setOffsetActual(LIMITE_POR_PAGINA);
      setUltimaActualizacion(Date.now());
    } catch (e) {
      if (version !== versionRef.current) return;
      handleError(e, 'Error al cargar inventario');
    } finally {
      if (version === versionRef.current) {
        setCargandoProductos(false);
      }
    }
  }, []);

  const cargarMasProductos = useCallback(async () => {
    if (cargandoMas || !hayMasProductos) return;
    setCargandoMas(true);
    try {
      const lista = await dbObtenerProductos(queryActual, LIMITE_POR_PAGINA, offsetActual);
      if (lista.length > 0) {
        setProductos(prev => [...prev, ...lista]);
        setOffsetActual(prev => prev + LIMITE_POR_PAGINA);
      }
      setHayMasProductos(lista.length === LIMITE_POR_PAGINA);
    } catch (e) {
      handleError(e, 'Error al cargar más productos');
    } finally {
      setCargandoMas(false);
    }
  }, [cargandoMas, hayMasProductos, queryActual, offsetActual]);

  const actualizarProductoEnLista = useCallback((productoActualizado: Producto) => {
    setProductos(prev => {
      const index = prev.findIndex(p => p.id === productoActualizado.id);
      if (index === -1) {
        // Es nuevo
        return [...prev, productoActualizado].sort((a, b) => {
          if (a.existencia > 0 && b.existencia <= 0) return -1;
          if (a.existencia <= 0 && b.existencia > 0) return 1;
          return a.nombre.localeCompare(b.nombre);
        });
      }
      
      const copia = [...prev];
      copia[index] = productoActualizado;
      return copia;
    });
    setUltimaActualizacion(Date.now());
  }, []);

  // Cargar productos al montar el proveedor inicial sin query
  useEffect(() => {
    cargarProductos('');
  }, [cargarProductos]);

  const value = useMemo(() => ({
    productos,
    cargandoProductos,
    cargandoMas,
    hayMasProductos,
    ultimaActualizacion,
    cargarProductos,
    cargarMasProductos,
    actualizarProductoEnLista,
  }), [productos, cargandoProductos, cargandoMas, hayMasProductos, ultimaActualizacion, cargarProductos, cargarMasProductos, actualizarProductoEnLista]);

  return (
    <ProductosContext.Provider value={value}>
      {children}
    </ProductosContext.Provider>
  );
}

export function useProductos() {
  const context = useContext(ProductosContext);
  if (context === undefined) {
    throw new Error('useProductos debe ser usado dentro de un ProductosProvider');
  }
  return context;
}