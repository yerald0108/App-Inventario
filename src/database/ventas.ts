import { getDatabase } from '../database/database';
import { Producto } from '../types';

// Obtener productos disponibles para vender (existencia > 0)
export async function obtenerProductosDisponibles(): Promise<Producto[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Producto>(
    'SELECT * FROM productos WHERE existencia > 0 ORDER BY nombre ASC'
  );
}

// Registrar una venta completa con múltiples productos usando una transacción
export async function registrarVenta(
  items: { producto: Producto; cantidad: number }[],
  metodoPago: 'efectivo' | 'transferencia',
  turnoId: number,
  propina: number = 0
): Promise<void> {
  const ventaId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const fechaHora = new Date().toISOString();

  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      // Validar que precio y cantidad son números finitos antes de operar.
      // Esto previene que un dato corrupto propague NaN a la BD.
      const precio = typeof item.producto.precio === 'number' && isFinite(item.producto.precio)
        ? item.producto.precio
        : 0;
      const cantidad = typeof item.cantidad === 'number' && isFinite(item.cantidad) && item.cantidad > 0
        ? item.cantidad
        : 0;

      // Si la validación falla (cantidad 0 o precio 0), no tiene sentido registrar.
      // Lanzar un error explícito es mejor que insertar un movimiento inválido.
      if (precio <= 0 || cantidad <= 0) {
        throw new Error(
          `Datos inválidos para el producto "${item.producto.nombre}": precio=${precio}, cantidad=${cantidad}`
        );
      }

      const prodInDB = await db.getFirstAsync<{ existencia: number }>(
        'SELECT existencia FROM productos WHERE id = ?',
        [item.producto.id]
      );

      if (!prodInDB || prodInDB.existencia < cantidad) {
        throw new Error(`Stock insuficiente para el producto "${item.producto.nombre}". Disponible: ${prodInDB?.existencia ?? 0}, Solicitado: ${cantidad}`);
      }

      const total = precio * cantidad;

      const precioCosto = typeof item.producto.precio_costo === 'number' && isFinite(item.producto.precio_costo)
      ? item.producto.precio_costo
      : 0;

      await db.runAsync(
        `INSERT INTO movimientos 
          (tipo, fecha_hora, producto_id, cantidad, precio_aplicado, precio_costo, total, metodo_pago, turno_id, venta_id, propina)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'venta',
          fechaHora,
          item.producto.id,
          cantidad,
          precio,
          precioCosto,
          total,
          metodoPago,
          turnoId,
          ventaId,
          propina,
        ]
      );

      await db.runAsync(
        'UPDATE productos SET existencia = existencia - ? WHERE id = ?',
        [cantidad, item.producto.id]
      );
    }
  });
}