import db from './database';

// ─── Tipos locales ────────────────────────────────────────────────────────────

export interface Despacho {
  id: number;
  nombre: string;
  descripcion: string | null;
  color: string; // hex color para identificar visualmente
  activo: number; // 1 = activo, 0 = archivado
  fecha_creacion: string;
}

export interface ProductoDespacho {
  id: number;
  despacho_id: number;
  nombre: string;
  precio: number;
  activo: number;
}

export interface VentaExterna {
  id: number;
  despacho_id: number;
  turno_id: number;
  fecha_hora: string;
  metodo_pago: 'efectivo' | 'transferencia';
  total: number;
  venta_id: string;
}

export interface VentaExternaItem {
  id: number;
  venta_externa_id: number;
  producto_despacho_id: number | null; // null si fue venta libre
  nombre_producto: string;
  precio_aplicado: number;
  cantidad: number;
}

export interface VentaExternaAgrupada {
  venta_id: string;
  despacho_id: number;
  despacho_nombre: string;
  despacho_color: string;
  fecha_hora: string;
  metodo_pago: 'efectivo' | 'transferencia';
  total: number;
  items: {
    nombre_producto: string;
    cantidad: number;
    precio_aplicado: number;
  }[];
}

// ─── Inicialización de tablas ─────────────────────────────────────────────────



// ─── CRUD Despachos ───────────────────────────────────────────────────────────

export async function obtenerDespachos(): Promise<Despacho[]> {
  return await db.getAllAsync<Despacho>(
    'SELECT * FROM despachos WHERE activo = 1 ORDER BY nombre ASC'
  );
}

export async function crearDespacho(
  nombre: string,
  descripcion: string | null,
  color: string
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO despachos (nombre, descripcion, color, activo, fecha_creacion) VALUES (?, ?, ?, 1, ?)',
    [nombre, descripcion, color, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function actualizarDespacho(
  id: number,
  nombre: string,
  descripcion: string | null,
  color: string
): Promise<void> {
  await db.runAsync(
    'UPDATE despachos SET nombre = ?, descripcion = ?, color = ? WHERE id = ?',
    [nombre, descripcion, color, id]
  );
}

export async function eliminarDespacho(id: number): Promise<void> {
  // Soft delete
  await db.runAsync('UPDATE despachos SET activo = 0 WHERE id = ?', [id]);
}

// ─── CRUD Productos del Despacho ──────────────────────────────────────────────

export async function obtenerProductosDespacho(despachoId: number): Promise<ProductoDespacho[]> {
  return await db.getAllAsync<ProductoDespacho>(
    'SELECT * FROM productos_despacho WHERE despacho_id = ? AND activo = 1 ORDER BY nombre ASC',
    [despachoId]
  );
}

export async function crearProductoDespacho(
  despachoId: number,
  nombre: string,
  precio: number
): Promise<void> {
  await db.runAsync(
    'INSERT INTO productos_despacho (despacho_id, nombre, precio, activo) VALUES (?, ?, ?, 1)',
    [despachoId, nombre, precio]
  );
}

export async function actualizarProductoDespacho(
  id: number,
  nombre: string,
  precio: number
): Promise<void> {
  await db.runAsync(
    'UPDATE productos_despacho SET nombre = ?, precio = ? WHERE id = ?',
    [nombre, precio, id]
  );
}

export async function eliminarProductoDespacho(id: number): Promise<void> {
  await db.runAsync('UPDATE productos_despacho SET activo = 0 WHERE id = ?', [id]);
}

// ─── Ventas externas ──────────────────────────────────────────────────────────

export async function registrarVentaExterna(
  items: { productoId: number | null; nombre: string; precio: number; cantidad: number }[],
  metodoPago: 'efectivo' | 'transferencia',
  despachoId: number,
  turnoId: number
): Promise<void> {
  const ventaId = `EXT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const fechaHora = new Date().toISOString();
  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      'INSERT INTO ventas_externas (despacho_id, turno_id, fecha_hora, metodo_pago, total, venta_id) VALUES (?, ?, ?, ?, ?, ?)',
      [despachoId, turnoId, fechaHora, metodoPago, total, ventaId]
    );
    const ventaExternaId = result.lastInsertRowId;

    for (const item of items) {
      await db.runAsync(
        'INSERT INTO ventas_externas_items (venta_externa_id, producto_despacho_id, nombre_producto, precio_aplicado, cantidad) VALUES (?, ?, ?, ?, ?)',
        [ventaExternaId, item.productoId, item.nombre, item.precio, item.cantidad]
      );
    }
  });
}

export async function cancelarVentaExterna(ventaId: string): Promise<void> {
  // Para ventas externas la cancelación simplemente elimina los registros
  // ya que no hay inventario propio que restaurar
  await db.withTransactionAsync(async () => {
    const venta = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM ventas_externas WHERE venta_id = ?',
      [ventaId]
    );
    if (!venta) return;

    await db.runAsync('DELETE FROM ventas_externas_items WHERE venta_externa_id = ?', [venta.id]);
    await db.runAsync('DELETE FROM ventas_externas WHERE id = ?', [venta.id]);
  });
}

export async function obtenerVentasExternasTurno(turnoId: number): Promise<VentaExternaAgrupada[]> {
  const rows = await db.getAllAsync<{
    venta_id: string;
    despacho_id: number;
    despacho_nombre: string;
    despacho_color: string;
    fecha_hora: string;
    metodo_pago: 'efectivo' | 'transferencia';
    nombre_producto: string;
    cantidad: number;
    precio_aplicado: number;
  }>(
    `SELECT 
      ve.venta_id,
      ve.despacho_id,
      d.nombre AS despacho_nombre,
      d.color AS despacho_color,
      ve.fecha_hora,
      ve.metodo_pago,
      vei.nombre_producto,
      vei.cantidad,
      vei.precio_aplicado
     FROM ventas_externas ve
     JOIN despachos d ON ve.despacho_id = d.id
     JOIN ventas_externas_items vei ON vei.venta_externa_id = ve.id
     WHERE ve.turno_id = ?
     ORDER BY ve.fecha_hora DESC`,
    [turnoId]
  );

  const mapa = new Map<string, VentaExternaAgrupada>();

  for (const row of rows) {
    if (!mapa.has(row.venta_id)) {
      mapa.set(row.venta_id, {
        venta_id: row.venta_id,
        despacho_id: row.despacho_id,
        despacho_nombre: row.despacho_nombre,
        despacho_color: row.despacho_color,
        fecha_hora: row.fecha_hora,
        metodo_pago: row.metodo_pago,
        total: 0,
        items: [],
      });
    }
    const venta = mapa.get(row.venta_id)!;
    venta.items.push({
      nombre_producto: row.nombre_producto,
      cantidad: row.cantidad,
      precio_aplicado: row.precio_aplicado,
    });
  }

  // Recalcular totales
  for (const venta of mapa.values()) {
    venta.total = venta.items.reduce((acc, i) => acc + i.precio_aplicado * i.cantidad, 0);
  }

  return Array.from(mapa.values());
}

// Resumen por despacho para el cierre de turno
export async function obtenerResumenExternoPorDespacho(turnoId: number): Promise<{
  despacho_id: number;
  despacho_nombre: string;
  despacho_color: string;
  total_efectivo: number;
  total_transferencia: number;
  cantidad_ventas: number;
}[]> {
  return await db.getAllAsync(
    `SELECT 
      d.id AS despacho_id,
      d.nombre AS despacho_nombre,
      d.color AS despacho_color,
      COALESCE(SUM(CASE WHEN ve.metodo_pago = 'efectivo' THEN ve.total ELSE 0 END), 0) AS total_efectivo,
      COALESCE(SUM(CASE WHEN ve.metodo_pago = 'transferencia' THEN ve.total ELSE 0 END), 0) AS total_transferencia,
      COUNT(ve.id) AS cantidad_ventas
     FROM despachos d
     LEFT JOIN ventas_externas ve ON ve.despacho_id = d.id AND ve.turno_id = ?
     WHERE d.activo = 1
     GROUP BY d.id
     HAVING cantidad_ventas > 0
     ORDER BY d.nombre ASC`,
    [turnoId]
  );
}

// Resumen de ventas externas de un turno cerrado (para PantallaDetalleTurno)
export async function obtenerResumenExternoDetalleTurno(turnoId: number): Promise<{
  despacho_id: number;
  despacho_nombre: string;
  despacho_color: string;
  total_efectivo: number;
  total_transferencia: number;
  cantidad_ventas: number;
}[]> {
  return await db.getAllAsync(
    `SELECT 
      d.id AS despacho_id,
      d.nombre AS despacho_nombre,
      d.color AS despacho_color,
      COALESCE(SUM(CASE WHEN ve.metodo_pago = 'efectivo' THEN ve.total ELSE 0 END), 0) AS total_efectivo,
      COALESCE(SUM(CASE WHEN ve.metodo_pago = 'transferencia' THEN ve.total ELSE 0 END), 0) AS total_transferencia,
      COUNT(ve.id) AS cantidad_ventas
     FROM despachos d
     LEFT JOIN ventas_externas ve ON ve.despacho_id = d.id AND ve.turno_id = ?
     WHERE d.activo = 1
     GROUP BY d.id
     HAVING cantidad_ventas > 0
     ORDER BY d.nombre ASC`,
    [turnoId]
  );
}

/**
 * Devuelve el total de ventas externas para cada turno indicado.
 * El resultado es un Map<turnoId, total>.
 */
export async function obtenerTotalesExternosPorTurnos(
  turnoIds: number[]
): Promise<Map<number, number>> {
  if (turnoIds.length === 0) return new Map();

  // SQLite no soporta parámetros array directamente; construimos los placeholders.
  const placeholders = turnoIds.map(() => '?').join(', ');

  const filas = await db.getAllAsync<{ turno_id: number; total: number }>(
    `SELECT turno_id, COALESCE(SUM(total), 0) AS total
     FROM ventas_externas
     WHERE turno_id IN (${placeholders})
     GROUP BY turno_id`,
    turnoIds
  );

  const mapa = new Map<number, number>();
  for (const fila of filas) {
    mapa.set(fila.turno_id, fila.total);
  }
  return mapa;
}