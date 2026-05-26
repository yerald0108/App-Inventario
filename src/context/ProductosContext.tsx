import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Producto } from '../types';
import { obtenerProductos as dbObtenerProductos } from '../database/productos';
import Toast from 'react-native-toast-message';

interface ProductosContextType {
  productos: Producto[];
  cargandoProductos: boolean;
  cargarProductos: () => Promise<void>;
}

const ProductosContext = createContext<ProductosContextType | undefined>(undefined);

export function ProductosProvider({ children }: { children: React.ReactNode }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  const cargarProductos = useCallback(async () => {
    setCargandoProductos(true);
    try {
      const lista = await dbObtenerProductos();
      setProductos(lista);
    } catch (e) {
      console.error('ProductosContext: error al cargar productos', e);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudieron cargar los productos del inventario.',
      });
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  // Cargar productos al montar el proveedor
  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const value = {
    productos,
    cargandoProductos,
    cargarProductos,
  };

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
