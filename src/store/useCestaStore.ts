import { create } from 'zustand';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { Producto, ItemCesta } from '../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface CestaItemState {
  producto: Producto;
  cantidad: number;
  precioFinal?: number;
}

interface CestaStore {
  cesta: Record<number, CestaItemState>;
  busqueda: string;
  setBusqueda: (busqueda: string) => void;
  cambiarCantidad: (producto: Producto, cantidad: number) => void;
  cambiarPrecio: (productoId: number, nuevoPrecio: number) => void;
  obtenerItemsCesta: () => ItemCesta[];
  resetCesta: () => void;
}

export const useCestaStore = create<CestaStore>((set, get) => ({
  cesta: {},
  busqueda: '',
  
  setBusqueda: (busqueda: string) => set({ busqueda }),
  
  cambiarCantidad: (producto, cantidad) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    set((state) => {
      const nuevaCesta = { ...state.cesta };
      if (cantidad <= 0) {
        delete nuevaCesta[producto.id];
      } else {
        const itemActual = nuevaCesta[producto.id];
        nuevaCesta[producto.id] = {
          producto,
          cantidad,
          precioFinal: itemActual ? itemActual.precioFinal : undefined,
        };
      }
      return { cesta: nuevaCesta };
    });
  },
  
  cambiarPrecio: (productoId, nuevoPrecio) => {
    set((state) => {
      const nuevaCesta = { ...state.cesta };
      const item = nuevaCesta[productoId];
      if (item) {
        const esPrecioOriginal = item.producto.precio === nuevoPrecio;
        nuevaCesta[productoId] = {
          ...item,
          precioFinal: esPrecioOriginal ? undefined : nuevoPrecio,
        };
      }
      return { cesta: nuevaCesta };
    });
  },
  
  obtenerItemsCesta: () => {
    const { cesta } = get();
    return Object.values(cesta).map((item) => {
      const precioFinal = item.precioFinal ?? item.producto.precio;
      return {
        producto: item.producto,
        cantidad: item.cantidad,
        precioFinal,
        precioModificado: item.precioFinal !== undefined,
      };
    });
  },
  
  resetCesta: () => {
    set({ cesta: {}, busqueda: '' });
  },
}));
