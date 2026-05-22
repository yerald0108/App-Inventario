import db from './database';
import { Producto } from '../types';

// Obtener productos disponibles para vender (existencia > 0)
export async function obtenerProductosDisponibles(): Promise<Producto[]> {
  return await db.getAllAsync<Producto>(
    'SELECT * FROM productos WHERE existencia > 0 ORDER BY nombre ASC'
  );
}

// Registrar una venta completa con múltiples productos usando una transacción
export async function registrarVenta(
  items: { producto: Producto; cantidad: number }[],
  metodoPago: 'efectivo' | 'transferencia',
  turnoId: number
): Promise<void> {
  // Generar datos comunes para la venta
  const ventaId = Date.now().toString();
  const fechaHora = new Date().toISOString();

  // Ejecutar todo dentro de una transacción para asegurar la integridad de los datos
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      const total = item.producto.precio * item.cantidad;

      // 1. Registrar el movimiento de venta
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

      // 2. Descontar del inventario
      await db.runAsync(
        'UPDATE productos SET existencia = existencia - ? WHERE id = ?',
        [item.cantidad, item.producto.id]
      );
    }
  });
}