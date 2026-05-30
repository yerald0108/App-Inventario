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

// Cada namespace tiene su propio estado aislado
interface CestaNamespaceState {
  cesta: Record<number, CestaItemState>;
  busqueda: string;
}

interface CestaStore {
  // El estado está dividido por namespace
  namespaces: Record<string, CestaNamespaceState>;

  setBusqueda: (namespace: string, busqueda: string) => void;
  cambiarCantidad: (namespace: string, producto: Producto, cantidad: number) => void;
  cambiarPrecio: (namespace: string, productoId: number, nuevoPrecio: number) => void;
  obtenerItemsCesta: (namespace: string) => ItemCesta[];
  resetCesta: (namespace: string) => void;
}

// Estado vacío por defecto para cualquier namespace nuevo
const estadoVacio = (): CestaNamespaceState => ({
  cesta: {},
  busqueda: '',
});

// Helper interno: obtiene el estado de un namespace, 
// creándolo vacío si no existe todavía
function getNamespace(
  namespaces: Record<string, CestaNamespaceState>,
  namespace: string
): CestaNamespaceState {
  return namespaces[namespace] ?? estadoVacio();
}

export const useCestaStore = create<CestaStore>((set, get) => ({
  namespaces: {},

  setBusqueda: (namespace, busqueda) => {
    set((state) => ({
      namespaces: {
        ...state.namespaces,
        [namespace]: {
          ...getNamespace(state.namespaces, namespace),
          busqueda,
        },
      },
    }));
  },

  cambiarCantidad: (namespace, producto, cantidad) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    set((state) => {
      const ns = getNamespace(state.namespaces, namespace);
      const nuevaCesta = { ...ns.cesta };

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

      return {
        namespaces: {
          ...state.namespaces,
          [namespace]: { ...ns, cesta: nuevaCesta },
        },
      };
    });
  },

  cambiarPrecio: (namespace, productoId, nuevoPrecio) => {
    set((state) => {
      const ns = getNamespace(state.namespaces, namespace);
      const nuevaCesta = { ...ns.cesta };
      const item = nuevaCesta[productoId];

      if (item) {
        const esPrecioOriginal = item.producto.precio === nuevoPrecio;
        nuevaCesta[productoId] = {
          ...item,
          precioFinal: esPrecioOriginal ? undefined : nuevoPrecio,
        };
      }

      return {
        namespaces: {
          ...state.namespaces,
          [namespace]: { ...ns, cesta: nuevaCesta },
        },
      };
    });
  },

  obtenerItemsCesta: (namespace) => {
    const ns = getNamespace(get().namespaces, namespace);
    return Object.values(ns.cesta).map((item) => {
      const precioFinal = item.precioFinal ?? item.producto.precio;
      return {
        producto: item.producto,
        cantidad: item.cantidad,
        precioFinal,
        precioModificado: item.precioFinal !== undefined,
      };
    });
  },

  resetCesta: (namespace) => {
    set((state) => ({
      namespaces: {
        ...state.namespaces,
        [namespace]: estadoVacio(),
      },
    }));
  },
}));

// ── Namespaces disponibles ────────────────────────────────────────────────────
// Exportamos constantes para evitar strings sueltos en las pantallas
export const NAMESPACE_VENTA = 'venta';
export const NAMESPACE_SALIDA_FAMILIAR = 'salidaFamiliar';
export const NAMESPACE_MERMA = 'merma';
export const NAMESPACE_VENTA_EXTERNA = 'ventaExterna';