import db from './database';
import { ItemCesta } from '../types';

/**
 * Registra una salida de productos para consumo familiar.
 * Descuenta del inventario y registra el movimiento sin precio ni total.
 */
export async function registrarSalidaFamiliar(
  items: ItemCesta[],
  turnoId: number
): Promise<void> {
  const fechaHora = new Date().toISOString();
  // Usamos un ID de grupo similar al de ventas para agrupar los movimientos
  const grupoId = `FAM-${Date.now()}`;

  // Ejecutar todo dentro de una transacción para asegurar la integridad
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      // 1. Registrar el movimiento
      await db.runAsync(
        `INSERT INTO movimientos 
          (tipo, fecha_hora, producto_id, cantidad, precio_aplicado, total, turno_id, venta_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'salida_familiar',
          fechaHora,
          item.producto.id,
          item.cantidad,
          0, // Sin precio
          0, // Sin total
          turnoId,
          grupoId
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
