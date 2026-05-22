import db from './database';
import { Producto } from '../types';

// Obtener productos disponibles para vender (existencia > 0)
export async function obtenerProductosDisponibles(): Promise<Producto[]> {
  return await db.getAllAsync<Producto>(
    'SELECT * FROM productos WHERE existencia > 0 ORDER BY nombre ASC'
  );
}

// Registrar una venta completa con múltiples productos
export async function registrarVenta(
  items: { producto: Producto; cantidad: number }[],
  metodoPago: 'efectivo' | 'transferencia',
  turnoId: number
): Promise<void> {
  // Generar un ID único para agrupar todos los movimientos de esta venta
  const ventaId = Date.now().toString();
  const fechaHora = new Date().toISOString();

  // Registrar cada producto como un movimiento individual
  for (const item of items) {
    const total = item.producto.precio * item.cantidad;

    await db.runAsync(
      `INSERT INTO movimientos 
        (tipo, fecha_hora, producto_id, cantidad, precio_aplicado, total, metodo_pago, turno_id, venta_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'venta',
        fechaHora,
        item.producto.id,
        item.cantidad,
        item.producto.precio,
        total,
        metodoPago,
        turnoId,
        ventaId,
      ]
    );

    // Descontar del inventario
    await db.runAsync(
      'UPDATE productos SET existencia = existencia - ? WHERE id = ?',
      [item.cantidad, item.producto.id]
    );
  }
}