// Tipos principales de la aplicación MiCaja

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  existencia: number;
  alerta_minima: number;
}

export interface Movimiento {
  id: number;
  tipo: 'venta' | 'entrada' | 'cancelacion' | 'salida_familiar';
  fecha_hora: string;
  producto_id: number;
  cantidad: number;
  precio_aplicado: number | null;
  total: number | null;
  metodo_pago: 'efectivo' | 'transferencia' | null;
  turno_id: number | null;
  venta_id: string | null;
}

export interface Turno {
  id: number;
  fecha_inicio: string;
  fecha_cierre: string | null;
  total_esperado_efectivo: number | null;
  total_esperado_transferencia: number | null;
  efectivo_real: number | null;
  cerrado: number; // 0 = abierto, 1 = cerrado
}

// Venta agrupada por venta_id para mostrar en "Últimas Ventas"
export interface VentaAgrupada {
  venta_id: string;
  fecha_hora: string;
  metodo_pago: 'efectivo' | 'transferencia';
  total: number;
  items: {
    producto_id: number;
    nombre_producto: string;
    cantidad: number;
    precio_aplicado: number;
  }[];
}

// Item de la cesta durante una venta activa
export interface ItemCesta {
  producto: Producto;
  cantidad: number;
}