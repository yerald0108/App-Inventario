import db from './database';
import { Producto } from '../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EstadoPedido = 'abierto' | 'cerrado' | 'cancelado';

export interface Pedido {
  id: number;
  nombre: string;           // Ej: "Mesa 1", "Barra 3", "Para llevar"
  fecha_apertura: string;
  fecha_cierre: string | null;
  estado: EstadoPedido;
  turno_id: number;
  total: number;            // Calculado, actualizado en cada cambio
}

export interface PedidoItem {
  id: number;
  pedido_id: number;
  producto_id: number;
  nombre_producto: string;  // Snapshot del nombre al momento de agregar
  precio_aplicado: number;  // Snapshot del precio al momento de agregar
  cantidad: number;
  subtotal: number;
}

export interface PedidoConItems extends Pedido {
  items: PedidoItem[];
}

// ─── Inicialización de tablas ─────────────────────────────────────────────────

export async function inicializarTablaPedidos(): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      fecha_apertura TEXT NOT NULL,
      fecha_cierre TEXT,
      estado TEXT NOT NULL DEFAULT 'abierto'
        CHECK(estado IN ('abierto', 'cerrado', 'cancelado')),
      turno_id INTEGER NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (turno_id) REFERENCES turnos(id)
    );

    CREATE TABLE IF NOT EXISTS pedidos_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      nombre_producto TEXT NOT NULL,
      precio_aplicado REAL NOT NULL,
      cantidad REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    );
  `);
}

// ─── CRUD Pedidos ─────────────────────────────────────────────────────────────

/** Crea un nuevo pedido abierto y devuelve su ID */
export async function crearPedido(nombre: string, turnoId: number): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO pedidos (nombre, fecha_apertura, estado, turno_id, total)
     VALUES (?, ?, 'abierto', ?, 0)`,
    [nombre.trim(), new Date().toISOString(), turnoId]
  );
  return result.lastInsertRowId;
}

/** Obtiene todos los pedidos abiertos del turno actual */
export async function obtenerPedidosAbiertos(turnoId: number): Promise<Pedido[]> {
  return await db.getAllAsync<Pedido>(
    `SELECT * FROM pedidos WHERE turno_id = ? AND estado = 'abierto'
     ORDER BY fecha_apertura ASC`,
    [turnoId]
  );
}

/** Obtiene un pedido con todos sus items */
export async function obtenerPedidoConItems(pedidoId: number): Promise<PedidoConItems | null> {
  const pedido = await db.getFirstAsync<Pedido>(
    'SELECT * FROM pedidos WHERE id = ?',
    [pedidoId]
  );
  if (!pedido) return null;

  const items = await db.getAllAsync<PedidoItem>(
    'SELECT * FROM pedidos_items WHERE pedido_id = ? ORDER BY id ASC',
    [pedidoId]
  );

  return { ...pedido, items };
}

/** Agrega un producto al pedido o incrementa su cantidad si ya existe */
export async function agregarItemPedido(
  pedidoId: number,
  producto: Producto,
  cantidad: number
): Promise<void> {
  // Verificar si ya existe ese producto en el pedido
  const existente = await db.getFirstAsync<PedidoItem>(
    'SELECT * FROM pedidos_items WHERE pedido_id = ? AND producto_id = ?',
    [pedidoId, producto.id]
  );

  if (existente) {
    const nuevaCantidad = existente.cantidad + cantidad;
    const nuevoSubtotal = nuevaCantidad * existente.precio_aplicado;
    await db.runAsync(
      'UPDATE pedidos_items SET cantidad = ?, subtotal = ? WHERE id = ?',
      [nuevaCantidad, nuevoSubtotal, existente.id]
    );
  } else {
    const subtotal = cantidad * producto.precio;
    await db.runAsync(
      `INSERT INTO pedidos_items (pedido_id, producto_id, nombre_producto, precio_aplicado, cantidad, subtotal)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pedidoId, producto.id, producto.nombre, producto.precio, cantidad, subtotal]
    );
  }

  await recalcularTotalPedido(pedidoId);
}

/** Actualiza la cantidad de un item (0 = eliminar el item) */
export async function actualizarCantidadItem(
  itemId: number,
  pedidoId: number,
  nuevaCantidad: number,
  precioAplicado: number
): Promise<void> {
  if (nuevaCantidad <= 0) {
    await db.runAsync('DELETE FROM pedidos_items WHERE id = ?', [itemId]);
  } else {
    const nuevoSubtotal = nuevaCantidad * precioAplicado;
    await db.runAsync(
      'UPDATE pedidos_items SET cantidad = ?, subtotal = ? WHERE id = ?',
      [nuevaCantidad, nuevoSubtotal, itemId]
    );
  }
  await recalcularTotalPedido(pedidoId);
}

/** Elimina un item del pedido */
export async function eliminarItemPedido(itemId: number, pedidoId: number): Promise<void> {
  await db.runAsync('DELETE FROM pedidos_items WHERE id = ?', [itemId]);
  await recalcularTotalPedido(pedidoId);
}

/** Recalcula y guarda el total del pedido */
async function recalcularTotalPedido(pedidoId: number): Promise<void> {
  const resultado = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(subtotal), 0) as total FROM pedidos_items WHERE pedido_id = ?',
    [pedidoId]
  );
  await db.runAsync(
    'UPDATE pedidos SET total = ? WHERE id = ?',
    [resultado?.total ?? 0, pedidoId]
  );
}

/** Renombra un pedido */
export async function renombrarPedido(pedidoId: number, nuevoNombre: string): Promise<void> {
  await db.runAsync(
    'UPDATE pedidos SET nombre = ? WHERE id = ?',
    [nuevoNombre.trim(), pedidoId]
  );
}

/**
 * Cierra el pedido y lo convierte en ventas reales en la tabla movimientos.
 * Descuenta el inventario y registra el movimiento contable en el turno.
 */
export async function cerrarPedidoComoVenta(
  pedidoId: number,
  metodoPago: 'efectivo' | 'transferencia',
  turnoId: number
): Promise<void> {
  const pedido = await obtenerPedidoConItems(pedidoId);
  if (!pedido || pedido.items.length === 0) {
    throw new Error('El pedido está vacío o no existe.');
  }

  const ventaId = `PED-${pedidoId}-${Date.now()}`;
  const fechaHora = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const item of pedido.items) {
      // Insertar en movimientos (igual que una venta normal)
      await db.runAsync(
        `INSERT INTO movimientos
          (tipo, fecha_hora, producto_id, cantidad, precio_aplicado, total, metodo_pago, turno_id, venta_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'venta',
          fechaHora,
          item.producto_id,
          item.cantidad,
          item.precio_aplicado,
          item.subtotal,
          metodoPago,
          turnoId,
          ventaId,
        ]
      );

      // Descontar del inventario
      await db.runAsync(
        'UPDATE productos SET existencia = existencia - ? WHERE id = ?',
        [item.cantidad, item.producto_id]
      );
    }

    // Marcar el pedido como cerrado
    await db.runAsync(
      `UPDATE pedidos SET estado = 'cerrado', fecha_cierre = ? WHERE id = ?`,
      [fechaHora, pedidoId]
    );
  });
}

/** Cancela un pedido sin cobrar (no genera movimiento contable) */
export async function cancelarPedido(pedidoId: number): Promise<void> {
  await db.runAsync(
    `UPDATE pedidos SET estado = 'cancelado', fecha_cierre = ? WHERE id = ?`,
    [new Date().toISOString(), pedidoId]
  );
}

/** Obtiene pedidos cerrados del turno (para historial rápido) */
export async function obtenerPedidosCerradosTurno(turnoId: number): Promise<Pedido[]> {
  return await db.getAllAsync<Pedido>(
    `SELECT * FROM pedidos WHERE turno_id = ? AND estado != 'abierto'
     ORDER BY fecha_cierre DESC LIMIT 50`,
    [turnoId]
  );
}