import db from './database';

// Registrar una entrada de mercancía
export async function registrarEntrada(
  productoId: number,
  cantidad: number,
  turnoId: number
): Promise<void> {
  const fechaHora = new Date().toISOString();

  // Registrar movimiento tipo entrada
  await db.runAsync(
    `INSERT INTO movimientos
      (tipo, fecha_hora, producto_id, cantidad, turno_id)
     VALUES (?, ?, ?, ?, ?)`,
    ['entrada', fechaHora, productoId, cantidad, turnoId]
  );

  // Sumar al inventario
  await db.runAsync(
    'UPDATE productos SET existencia = existencia + ? WHERE id = ?',
    [cantidad, productoId]
  );
}