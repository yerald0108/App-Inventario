import { getDatabase } from '../database/database';

export async function registrarEntrada(
  productoId: number,
  cantidad: number,
  turnoId: number,
  diaTurnoId: number | null = null
): Promise<void> {
  const fechaHora = new Date().toISOString();
  try {
    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO movimientos
          (tipo, fecha_hora, producto_id, cantidad, turno_id, dia_turno_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['entrada', fechaHora, productoId, cantidad, turnoId, diaTurnoId]
      );
      await db.runAsync(
        'UPDATE productos SET existencia = existencia + ? WHERE id = ?',
        [cantidad, productoId]
      );
    });
  } catch (error) {
    console.error('registrarEntrada: error en transacción', error);
    throw error;
  }
}

export interface EntradaItem {
  id: number;
  producto_id: number;
  nombre_producto: string;
  cantidad: number;
  fecha_hora: string;
}

export async function obtenerEntradasTurno(
  turnoId: number
): Promise<EntradaItem[]> {
  const db = getDatabase();
  return await db.getAllAsync<EntradaItem>(
    `SELECT m.id, m.producto_id, p.nombre AS nombre_producto,
            m.cantidad, m.fecha_hora
     FROM movimientos m
     JOIN productos p ON m.producto_id = p.id
     WHERE m.turno_id = ? AND m.tipo = 'entrada'
     ORDER BY m.fecha_hora DESC`,
    [turnoId]
  );
}

export async function actualizarEntrada(
  id: number,
  nuevaCantidad: number
): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    const actual = await db.getFirstAsync<{ producto_id: number; cantidad: number }>(
      `SELECT producto_id, cantidad FROM movimientos WHERE id = ? AND tipo = 'entrada'`,
      [id]
    );
    if (!actual) throw new Error('Registro de entrada no encontrado.');

    const delta = nuevaCantidad - actual.cantidad; // positivo = más stock
    if (delta < 0) {
      // Se reduce la entrada: verificar que el stock actual aguante
      const stock = await db.getFirstAsync<{ existencia: number }>(
        'SELECT existencia FROM productos WHERE id = ?',
        [actual.producto_id]
      );
      if ((stock?.existencia ?? 0) < Math.abs(delta)) {
        throw new Error('No hay suficiente stock para reducir esta entrada.');
      }
    }

    await db.runAsync(
      'UPDATE productos SET existencia = existencia + ? WHERE id = ?',
      [delta, actual.producto_id]
    );
    await db.runAsync(
      'UPDATE movimientos SET cantidad = ? WHERE id = ?',
      [nuevaCantidad, id]
    );
  });
}

export async function eliminarEntrada(id: number): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    const actual = await db.getFirstAsync<{ producto_id: number; cantidad: number }>(
      `SELECT producto_id, cantidad FROM movimientos WHERE id = ? AND tipo = 'entrada'`,
      [id]
    );
    if (!actual) return;

    const stock = await db.getFirstAsync<{ existencia: number }>(
      'SELECT existencia FROM productos WHERE id = ?',
      [actual.producto_id]
    );
    if ((stock?.existencia ?? 0) < actual.cantidad) {
      throw new Error('No se puede eliminar: el stock actual es menor que la cantidad de esta entrada.');
    }

    await db.runAsync(
      'UPDATE productos SET existencia = existencia - ? WHERE id = ?',
      [actual.cantidad, actual.producto_id]
    );
    await db.runAsync('DELETE FROM movimientos WHERE id = ?', [id]);
  });
}