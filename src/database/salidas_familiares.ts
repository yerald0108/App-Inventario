import { getDatabase } from '../database/database';
import { ItemCesta } from '../types';

/**
 * Registra una salida de productos para consumo familiar.
 * Descuenta del inventario y registra el movimiento sin precio ni total.
 */
export async function registrarSalidaFamiliar(
  items: ItemCesta[],
  turnoId: number,
  diaTurnoId: number | null = null
): Promise<void> {
  const fechaHora = new Date().toISOString();
  const grupoId = `FAM-${Date.now()}`;
  try {
    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      for (const item of items) {
        await db.runAsync(
          `INSERT INTO movimientos 
            (tipo, fecha_hora, producto_id, cantidad, precio_aplicado, total, 
             turno_id, venta_id, dia_turno_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['salida_familiar', fechaHora, item.producto.id, item.cantidad, 
           0, 0, turnoId, grupoId, diaTurnoId]
        );
        await db.runAsync(
          'UPDATE productos SET existencia = existencia - ? WHERE id = ?',
          [item.cantidad, item.producto.id]
        );
      }
    });
  } catch (error) {
    console.error('registrarSalidaFamiliar: error en transacción', error);
    throw error;
  }
}
