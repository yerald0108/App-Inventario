import { getDatabase } from '../database/database';
import { ItemCesta } from '../types';

/**
 * Registra una salida de productos para consumo familiar.
 * Descuenta del inventario y registra el movimiento sin precio ni total.
 * El campo `persona` indica quién consumió (ej: "el hijo", "la mujer").
 */
export async function registrarSalidaFamiliar(
  items: ItemCesta[],
  turnoId: number,
  diaTurnoId: number | null = null,
  persona: string | null = null
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
             turno_id, venta_id, dia_turno_id, persona)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['salida_familiar', fechaHora, item.producto.id, item.cantidad, 
           0, 0, turnoId, grupoId, diaTurnoId, persona ?? null]
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

export interface SalidaFamiliarItem {
  id: number;
  producto_id: number;
  nombre_producto: string;
  cantidad: number;
  fecha_hora: string;
  persona: string | null;
}

export async function obtenerSalidasFamiliaresTurno(
  turnoId: number
): Promise<SalidaFamiliarItem[]> {
  const db = getDatabase();
  return await db.getAllAsync<SalidaFamiliarItem>(
    `SELECT m.id, m.producto_id, p.nombre AS nombre_producto,
            m.cantidad, m.fecha_hora, m.persona
     FROM movimientos m
     JOIN productos p ON m.producto_id = p.id
     WHERE m.turno_id = ? AND m.tipo = 'salida_familiar'
     ORDER BY m.fecha_hora DESC`,
    [turnoId]
  );
}

export async function actualizarSalidaFamiliar(
  id: number,
  nuevaCantidad: number,
  nuevaPersona: string | null
): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    const actual = await db.getFirstAsync<{ producto_id: number; cantidad: number }>(
      `SELECT producto_id, cantidad FROM movimientos WHERE id = ? AND tipo = 'salida_familiar'`,
      [id]
    );
    if (!actual) throw new Error('Registro no encontrado.');

    if (nuevaCantidad <= 0) {
      await db.runAsync('DELETE FROM movimientos WHERE id = ?', [id]);
      await db.runAsync(
        'UPDATE productos SET existencia = existencia + ? WHERE id = ?',
        [actual.cantidad, actual.producto_id]
      );
      return;
    }

    const delta = nuevaCantidad - actual.cantidad; // + → sale más stock, - → se devuelve
    if (delta > 0) {
      const stock = await db.getFirstAsync<{ existencia: number }>(
        'SELECT existencia FROM productos WHERE id = ?',
        [actual.producto_id]
      );
      if ((stock?.existencia ?? 0) < delta) {
        throw new Error('Stock insuficiente para aumentar esta salida familiar.');
      }
    }

    await db.runAsync(
      'UPDATE productos SET existencia = existencia - ? WHERE id = ?',
      [delta, actual.producto_id]
    );
    await db.runAsync(
      'UPDATE movimientos SET cantidad = ?, persona = ? WHERE id = ?',
      [nuevaCantidad, nuevaPersona, id]
    );
  });
}

export async function eliminarSalidaFamiliar(id: number): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    const actual = await db.getFirstAsync<{ producto_id: number; cantidad: number }>(
      `SELECT producto_id, cantidad FROM movimientos WHERE id = ? AND tipo = 'salida_familiar'`,
      [id]
    );
    if (!actual) return;
    await db.runAsync('DELETE FROM movimientos WHERE id = ?', [id]);
    await db.runAsync(
      'UPDATE productos SET existencia = existencia + ? WHERE id = ?',
      [actual.cantidad, actual.producto_id]
    );
  });
}