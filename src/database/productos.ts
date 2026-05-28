import db from './database';
import { Producto } from '../types';

// Los productos con existencia > 0 primero, luego los agotados, ambos por nombre
export async function obtenerProductos(): Promise<Producto[]> {
  return await db.getAllAsync<Producto>(
    `SELECT * FROM productos
     ORDER BY
       CASE WHEN existencia > 0 THEN 0 ELSE 1 END ASC,
       nombre ASC`
  );
}

export async function obtenerProductoPorId(id: number): Promise<Producto | null> {
  return await db.getFirstAsync<Producto>(
    'SELECT * FROM productos WHERE id = ?',
    [id]
  );
}

export async function crearProducto(
  nombre: string,
  precio: number,
  existencia: number,
  alerta_minima: number = 5,
  precio_costo: number = 0
): Promise<void> {
  await db.runAsync(
    `INSERT INTO productos
       (nombre, precio, existencia, alerta_minima, precio_costo)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, precio, existencia, alerta_minima, precio_costo]
  );
}

export async function actualizarProducto(
  id: number,
  nombre: string,
  precio: number,
  existencia: number,
  alerta_minima: number,
  precio_costo: number = 0
): Promise<void> {
  await db.runAsync(
    `UPDATE productos
     SET nombre = ?, precio = ?, existencia = ?,
         alerta_minima = ?, precio_costo = ?
     WHERE id = ?`,
    [nombre, precio, existencia, alerta_minima, precio_costo, id]
  );
}

export async function eliminarProducto(id: number): Promise<void> {
  await db.runAsync('DELETE FROM productos WHERE id = ?', [id]);
}