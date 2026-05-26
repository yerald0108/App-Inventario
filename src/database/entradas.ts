import db from './database';

// Registrar una entrada de mercancía
export async function registrarEntrada(
  productoId: number,
  cantidad: number,
  turnoId: number
): Promise<void> {
  const fechaHora = new Date().toISOString();
  try {
    await db.runAsync(
      `INSERT INTO movimientos
        (tipo, fecha_hora, producto_id, cantidad, turno_id)
       VALUES (?, ?, ?, ?, ?)`,
      ['entrada', fechaHora, productoId, cantidad, turnoId]
    );
    await db.runAsync(
      'UPDATE productos SET existencia = existencia + ? WHERE id = ?',
      [cantidad, productoId]
    );
  } catch (error) {
    console.error('registrarEntrada: error al registrar entrada', error);
    throw error; // re-lanzar para que la pantalla lo capture
  }
}