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