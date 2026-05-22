import db from './database';
import { Producto } from '../types';

// Obtener todos los productos ordenados por nombre
export async function obtenerProductos(): Promise<Producto[]> {
  return await db.getAllAsync<Producto>(
    'SELECT * FROM productos ORDER BY nombre ASC'
  );
}

// Obtener un producto por id
export async function obtenerProductoPorId(id: number): Promise<Producto | null> {
  return await db.getFirstAsync<Producto>(
    'SELECT * FROM productos WHERE id = ?',
    [id]
  );
}

// Crear un nuevo producto
export async function crearProducto(
  nombre: string,
  precio: number,
  existencia: number,
  alerta_minima: number = 5
): Promise<void> {
  await db.runAsync(
    'INSERT INTO productos (nombre, precio, existencia, alerta_minima) VALUES (?, ?, ?, ?)',
    [nombre, precio, existencia, alerta_minima]
  );
}

// Actualizar un producto existente
export async function actualizarProducto(
  id: number,
  nombre: string,
  precio: number,
  existencia: number,
  alerta_minima: number
): Promise<void> {
  await db.runAsync(
    'UPDATE productos SET nombre = ?, precio = ?, existencia = ?, alerta_minima = ? WHERE id = ?',
    [nombre, precio, existencia, alerta_minima, id]
  );
}

// Eliminar un producto
export async function eliminarProducto(id: number): Promise<void> {
  await db.runAsync('DELETE FROM productos WHERE id = ?', [id]);
}