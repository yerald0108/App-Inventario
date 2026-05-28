import { getDatabase } from '../database/database';
import { Producto } from '../types';
import { ProductoDespacho } from './despachos';
import { sumaSegura } from '../utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EstadoPedido = 'abierto' | 'cerrado' | 'cancelado';

export interface Pedido {
  id: number;
  nombre: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  estado: EstadoPedido;
  turno_id: number;
  total: number;
}

export interface PedidoItem {
  id: number;
  pedido_id: number;
  producto_id: number;          // 0 cuando el item es de despacho
  nombre_producto: string;
  precio_aplicado: number;
  cantidad: number;
  subtotal: number;
  // ── Campos nuevos (v6) ──
  origen: 'propio' | 'despacho';
  producto_despacho_id: number | null;
  despacho_id: number | null;
}

export interface PedidoConItems extends Pedido {
  items: PedidoItem[];
}

// ─── CRUD Pedidos ─────────────────────────────────────────────────────────────

export async function crearPedido(nombre: string, turnoId: number): Promise<number> {
  try {
    const db = await getDatabase();
    const result = await db.runAsync(
      `INSERT INTO pedidos (nombre, fecha_apertura, estado, turno_id, total)
       VALUES (?, ?, 'abierto', ?, 0)`,
      [nombre.trim(), new Date().toISOString(), turnoId]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('crearPedido: error', error);
    throw error;
  }
}

export async function obtenerPedidosAbiertos(turnoId: number): Promise<Pedido[]> {
  try {
    const db = await getDatabase();
    return await db.getAllAsync<Pedido>(
      `SELECT * FROM pedidos WHERE turno_id = ? AND estado = 'abierto'
       ORDER BY fecha_apertura ASC`,
      [turnoId]
    );
  } catch (error) {
    console.error('obtenerPedidosAbiertos: error', error);
    throw error;
  }
}

export async function obtenerPedidoConItems(pedidoId: number): Promise<PedidoConItems | null> {
  try {
    const db = await getDatabase();
    const pedido = await db.getFirstAsync<Pedido>(
      'SELECT * FROM pedidos WHERE id = ?',
      [pedidoId]
    );
    if (!pedido) return null;

    // Leemos las columnas nuevas junto a las existentes.
    // COALESCE garantiza que dispositivos con filas antiguas
    // (sin origen) no exploten — les asigna 'propio' en memoria.
    const items = await db.getAllAsync<PedidoItem>(
      `SELECT 
        id,
        pedido_id,
        producto_id,
        nombre_producto,
        precio_aplicado,
        cantidad,
        subtotal,
        COALESCE(origen, 'propio')        AS origen,
        producto_despacho_id,
        despacho_id
       FROM pedidos_items
       WHERE pedido_id = ?
       ORDER BY id ASC`,
      [pedidoId]
    );

    return { ...pedido, items };
  } catch (error) {
    console.error('obtenerPedidoConItems: error', error);
    throw error;
  }
}

// ─── Agregar item PROPIO (inventario) ─────────────────────────────────────────

export async function agregarItemPedido(
  pedidoId: number,
  producto: Producto,
  cantidad: number
): Promise<void> {
  try {
    const db = await getDatabase();
    // Validar stock actual en BD
    const stockActual = await db.getFirstAsync<{ existencia: number }>(
      'SELECT existencia FROM productos WHERE id = ?',
      [producto.id]
    );
    if (!stockActual) {
      throw new Error(`El producto "${producto.nombre}" ya no existe en el inventario.`);
    }

    const existente = await db.getFirstAsync<PedidoItem>(
      `SELECT * FROM pedidos_items 
       WHERE pedido_id = ? AND producto_id = ? AND origen = 'propio'`,
      [pedidoId, producto.id]
    );

    const cantidadYaEnPedido = existente ? existente.cantidad : 0;
    const totalSolicitado = cantidadYaEnPedido + cantidad;

    if (totalSolicitado > stockActual.existencia) {
      const disponible = stockActual.existencia - cantidadYaEnPedido;
      throw new Error(
        `Stock insuficiente para "${producto.nombre}".\n` +
        `En pedido: ${cantidadYaEnPedido} · Intentas agregar: ${cantidad} · Disponible: ${Math.max(0, disponible)}`
      );
    }

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
        `INSERT INTO pedidos_items 
          (pedido_id, producto_id, nombre_producto, precio_aplicado, cantidad, subtotal, origen, producto_despacho_id, despacho_id)
         VALUES (?, ?, ?, ?, ?, ?, 'propio', NULL, NULL)`,
        [pedidoId, producto.id, producto.nombre, producto.precio, cantidad, subtotal]
      );
    }

    await recalcularTotalPedidoInterno(pedidoId);
  } catch (error) {
    console.error('agregarItemPedido: error', error);
    throw error;
  }
}

// ─── Agregar item de DESPACHO ─────────────────────────────────────────────────

export async function agregarItemDespachoAlPedido(
  pedidoId: number,
  productoDespacho: ProductoDespacho,
  despachoId: number,
  cantidad: number
): Promise<void> {
  try {
    const db = await getDatabase();
    // Los productos de despacho no tienen stock propio,
    // pero sí pueden repetirse en el pedido: acumulamos.
    const existente = await db.getFirstAsync<PedidoItem>(
      `SELECT * FROM pedidos_items 
       WHERE pedido_id = ? AND producto_despacho_id = ? AND origen = 'despacho'`,
      [pedidoId, productoDespacho.id]
    );

    if (existente) {
      const nuevaCantidad = existente.cantidad + cantidad;
      const nuevoSubtotal = nuevaCantidad * existente.precio_aplicado;
      await db.runAsync(
        'UPDATE pedidos_items SET cantidad = ?, subtotal = ? WHERE id = ?',
        [nuevaCantidad, nuevoSubtotal, existente.id]
      );
    } else {
      const subtotal = cantidad * productoDespacho.precio;
      await db.runAsync(
        `INSERT INTO pedidos_items 
          (pedido_id, producto_id, nombre_producto, precio_aplicado, cantidad, subtotal, origen, producto_despacho_id, despacho_id)
         VALUES (?, 0, ?, ?, ?, ?, 'despacho', ?, ?)`,
        [
          pedidoId,
          productoDespacho.nombre,
          productoDespacho.precio,
          cantidad,
          subtotal,
          productoDespacho.id,
          despachoId,
        ]
      );
    }

    await recalcularTotalPedidoInterno(pedidoId);
  } catch (error) {
    console.error('agregarItemDespachoAlPedido: error', error);
    throw error;
  }
}

// ─── Recalcular total interno ─────────────────────────────────────────────────

async function recalcularTotalPedidoInterno(pedidoId: number): Promise<void> {
  const db = await getDatabase();
  const resultado = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(subtotal), 0) as total FROM pedidos_items WHERE pedido_id = ?',
    [pedidoId]
  );
  await db.runAsync(
    'UPDATE pedidos SET total = ? WHERE id = ?',
    [resultado?.total ?? 0, pedidoId]
  );
}

// ─── Actualizar / eliminar items ──────────────────────────────────────────────

export async function actualizarCantidadItem(
  itemId: number,
  pedidoId: number,
  nuevaCantidad: number,
  precioAplicado: number
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    if (nuevaCantidad <= 0) {
      await db.runAsync('DELETE FROM pedidos_items WHERE id = ?', [itemId]);
    } else {
      const nuevoSubtotal = nuevaCantidad * precioAplicado;
      await db.runAsync(
        'UPDATE pedidos_items SET cantidad = ?, subtotal = ? WHERE id = ?',
        [nuevaCantidad, nuevoSubtotal, itemId]
      );
    }
    await recalcularTotalPedidoInterno(pedidoId);
  });
}

export async function eliminarItemPedido(itemId: number, pedidoId: number): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM pedidos_items WHERE id = ?', [itemId]);
    await recalcularTotalPedidoInterno(pedidoId);
  });
}

export async function renombrarPedido(pedidoId: number, nuevoNombre: string): Promise<void> {
  const db = await getDatabase();
  try {
    await db.runAsync(
      'UPDATE pedidos SET nombre = ? WHERE id = ?',
      [nuevoNombre.trim(), pedidoId]
    );
  } catch (error) {
    console.error('renombrarPedido: error', error);
    throw error;
  }
}

// ─── Cerrar pedido como venta (PROPIO + DESPACHO separados) ──────────────────

export async function cerrarPedidoComoVenta(
  pedidoId: number,
  metodoPago: 'efectivo' | 'transferencia',
  turnoId: number,
  propina: number = 0
): Promise<void> {
  try {
    const db = await getDatabase();
    const pedido = await obtenerPedidoConItems(pedidoId);
    if (!pedido || pedido.items.length === 0) {
      throw new Error('El pedido está vacío o no existe.');
    }

    // Separar items por origen
    const itemsPropios   = pedido.items.filter(i => i.origen === 'propio');
    const itemsDespacho  = pedido.items.filter(i => i.origen === 'despacho');

    // ── Validar stock solo para items propios ──────────────────────────────
    if (itemsPropios.length > 0) {
      const conflictos = await db.getAllAsync<{
        nombre_producto: string;
        cantidad: number;
        existencia: number;
      }>(
        `SELECT 
           pi.nombre_producto,
           pi.cantidad,
           p.existencia
         FROM pedidos_items pi
         JOIN productos p ON p.id = pi.producto_id
         WHERE pi.pedido_id = ?
           AND pi.origen = 'propio'
           AND p.existencia < pi.cantidad`,
        [pedidoId]
      );

      if (conflictos.length > 0) {
        const detalle = conflictos
          .map(c => `• ${c.nombre_producto} — pedido: ${c.cantidad}, disponible: ${c.existencia}`)
          .join('\n');
        throw new Error(`Stock insuficiente para cerrar el pedido:\n${detalle}`);
      }
    }

    const ventaId   = `PED-${pedidoId}-${Date.now()}`;
    const fechaHora = new Date().toISOString();

    await db.withTransactionAsync(async () => {

      // ── 1. Items PROPIOS → movimientos (descuenta inventario, suma a tu caja) ──
      for (const item of itemsPropios) {
        await db.runAsync(
          `INSERT INTO movimientos
            (tipo, fecha_hora, producto_id, cantidad, precio_aplicado, total,
            metodo_pago, turno_id, venta_id, propina)
          VALUES ('venta', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fechaHora,
            item.producto_id,
            item.cantidad,
            item.precio_aplicado,
            item.subtotal,
            metodoPago,
            turnoId,
            ventaId,
            propina, 
          ]
        );

        await db.runAsync(
          'UPDATE productos SET existencia = existencia - ? WHERE id = ?',
          [item.cantidad, item.producto_id]
        );
      }

      // ── 2. Items de DESPACHO → ventas_externas (NO toca tu caja) ──────────
      // Agrupamos por despacho_id porque puede haber productos de varios despachos
      // en el mismo pedido.
      const despachoIds = [...new Set(itemsDespacho.map(i => i.despacho_id))];

      for (const dId of despachoIds) {
        if (dId === null) continue;

        const itemsEsteDespacho = itemsDespacho.filter(i => i.despacho_id === dId);
        const totalEsteDespacho = sumaSegura(itemsEsteDespacho.map(i => i.subtotal));

        // Insertar cabecera de venta externa
        const ventaExtId = `PED-EXT-${pedidoId}-${dId}-${Date.now()}`;
        const resultExt = await db.runAsync(
          `INSERT INTO ventas_externas
            (despacho_id, turno_id, fecha_hora, metodo_pago, total, venta_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [dId, turnoId, fechaHora, metodoPago, totalEsteDespacho, ventaExtId]
        );
        const ventaExternaId = resultExt.lastInsertRowId;

        // Insertar cada item externo
        for (const item of itemsEsteDespacho) {
          await db.runAsync(
            `INSERT INTO ventas_externas_items
              (venta_externa_id, producto_despacho_id, nombre_producto, precio_aplicado, cantidad)
             VALUES (?, ?, ?, ?, ?)`,
            [
              ventaExternaId,
              item.producto_despacho_id,
              item.nombre_producto,
              item.precio_aplicado,
              item.cantidad,
            ]
          );
        }
      }

      // ── 3. Marcar el pedido como cerrado ───────────────────────────────────
      await db.runAsync(
        `UPDATE pedidos SET estado = 'cerrado', fecha_cierre = ? WHERE id = ?`,
        [fechaHora, pedidoId]
      );
    });

  } catch (error) {
    console.error('cerrarPedidoComoVenta: error', error);
    throw error;
  }
}

// ─── Cancelar pedido ──────────────────────────────────────────────────────────

export async function cancelarPedido(pedidoId: number): Promise<void> {
  const db = await getDatabase();
  try {
    await db.runAsync(
      `UPDATE pedidos SET estado = 'cancelado', fecha_cierre = ? WHERE id = ?`,
      [new Date().toISOString(), pedidoId]
    );
  } catch (error) {
    console.error('cancelarPedido: error', error);
    throw error;
  }
}

// ─── Historial ────────────────────────────────────────────────────────────────

export async function obtenerPedidosCerradosTurno(turnoId: number): Promise<Pedido[]> {
  const db = await getDatabase();
  try {
    return await db.getAllAsync<Pedido>(
      `SELECT * FROM pedidos WHERE turno_id = ? AND estado != 'abierto'
       ORDER BY fecha_cierre DESC LIMIT 50`,
      [turnoId]
    );
  } catch (error) {
    console.error('obtenerPedidosCerradosTurno: error', error);
    throw error;
  }
}