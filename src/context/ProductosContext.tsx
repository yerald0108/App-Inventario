import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Producto } from '../types';
import { obtenerProductos as dbObtenerProductos } from '../database/productos';
import { handleError } from '../utils';

interface ProductosContextType {
  productos: Producto[];
  cargandoProductos: boolean;
  ultimaActualizacion: number;
  cargarProductos: () => Promise<void>;
  actualizarProductoEnLista: (productoActualizado: Producto) => void;
  buscarProductos: (query: string) => Producto[];
}

const ProductosContext = createContext<ProductosContextType | undefined>(undefined);

export function ProductosProvider({ children }: { children: React.ReactNode }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(Date.now());

  const cargarProductos = useCallback(async () => {
    setCargandoProductos(true);
    try {
      const lista = await dbObtenerProductos();
      setProductos(lista);
      setUltimaActualizacion(Date.now());
    } catch (e) {
      handleError(e, 'Error al cargar inventario');
    } finally {
      setCargandoProductos(false);
    }
  }, []);

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

  const buscarProductos = useCallback((query: string) => {
    if (!query.trim()) return productos;
    const termino = query.toLowerCase();
    return productos.filter(p => p.nombre.toLowerCase().includes(termino));
  }, [productos]);

  // Cargar productos al montar el proveedor
  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const value = useMemo(() => ({
    productos,
    cargandoProductos,
    ultimaActualizacion,
    cargarProductos,
    actualizarProductoEnLista,
    buscarProductos,
  }), [productos, cargandoProductos, ultimaActualizacion, cargarProductos, actualizarProductoEnLista, buscarProductos]);

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
