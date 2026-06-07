import { getDatabase } from '../database/database';
import { Producto } from '../types';

export async function obtenerProductos(query: string = '', limit: number = 20, offset: number = 0): Promise<Producto[]> {
  const db = getDatabase();
  const searchQuery = `%${query}%`;
  return await db.getAllAsync<Producto>(
    `SELECT * FROM productos
     WHERE nombre LIKE ?
     ORDER BY
       CASE WHEN existencia > 0 THEN 0 ELSE 1 END ASC,
       nombre ASC
     LIMIT ? OFFSET ?`,
    [searchQuery, limit, offset]
  );
}

export async function obtenerProductoPorId(id: number): Promise<Producto | null> {
  const db = getDatabase();
  return await db.getFirstAsync<Producto>(
    'SELECT * FROM productos WHERE id = ?',
    [id]
  );
}

/**
 * Crea un producto nuevo en el inventario.
 *
 * IMPORTANTE — existencia inicial:
 * - Desde PantallaInventario: pasa la existencia real del usuario.
 *   No se registra movimiento de entrada (el stock nace directo).
 * - Desde PantallaEntrada: pasa SIEMPRE 0 aquí y llama a
 *   registrarEntrada() por separado para que quede en el historial.
 *
 * Nunca pases existencia > 0 Y llames registrarEntrada() después:
 * el stock se duplicaría.
 */
export async function crearProducto(
  nombre: string,
  precio: number,
  existencia: number,
  alerta_minima: number = 5,
  precio_costo: number = 0
): Promise<number> {
  const db = getDatabase();
  const resultado = await db.runAsync(
    `INSERT INTO productos
       (nombre, precio, existencia, alerta_minima, precio_costo)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, precio, existencia, alerta_minima, precio_costo]
  );
  return resultado.lastInsertRowId;
}

export async function actualizarProducto(
  id: number,
  nombre: string,
  precio: number,
  existencia: number,
  alerta_minima: number,
  precio_costo: number = 0
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE productos
     SET nombre = ?, precio = ?, existencia = ?,
         alerta_minima = ?, precio_costo = ?
     WHERE id = ?`,
    [nombre, precio, existencia, alerta_minima, precio_costo, id]
  );
}

export async function eliminarProducto(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM productos WHERE id = ?', [id]);
}