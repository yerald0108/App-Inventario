import db from './database';
import { VentaAgrupada } from '../types';

// Obtener todas las ventas del turno actual agrupadas por venta_id
export async function obtenerVentasTurnoActual(turnoId: number): Promise<VentaAgrupada[]> {
  // Traer todos los movimientos de venta del turno actual (no cancelados)
  const movimientos = await db.getAllAsync<{
    venta_id: string;
    fecha_hora: string;
    metodo_pago: 'efectivo' | 'transferencia';
    total: number;
    producto_id: number;
    nombre_producto: string;
    cantidad: number;
    precio_aplicado: number;
  }>(
    `SELECT 
      m.venta_id,
      m.fecha_hora,
      m.metodo_pago,
      m.total,
      m.producto_id,
      p.nombre AS nombre_producto,
      m.cantidad,
      m.precio_aplicado
     FROM movimientos m
     JOIN productos p ON m.producto_id = p.id
     WHERE m.turno_id = ? AND m.tipo = 'venta'
     ORDER BY m.fecha_hora DESC`,
    [turnoId]
  );

  // Agrupar por venta_id
  const mapaVentas = new Map<string, VentaAgrupada>();

  for (const mov of movimientos) {
    if (!mapaVentas.has(mov.venta_id)) {
      mapaVentas.set(mov.venta_id, {
        venta_id: mov.venta_id,
        fecha_hora: mov.fecha_hora,
        metodo_pago: mov.metodo_pago,
        total: 0,
        items: [],
      });
    }

    const venta = mapaVentas.get(mov.venta_id)!;
    // Asegurar que el total sea un número válido (Bug 1)
    const totalMovimiento = (typeof mov.total === 'number' && isFinite(mov.total)) ? mov.total : 0;
    venta.total += totalMovimiento;
    venta.items.push({
      producto_id: mov.producto_id,
      nombre_producto: mov.nombre_producto,
      cantidad: mov.cantidad,
      precio_aplicado: mov.precio_aplicado,
    });
  }

  return Array.from(mapaVentas.values());
}

// Obtener todas las anulaciones del turno actual agrupadas por venta_id
export async function obtenerAnulacionesTurno(turnoId: number): Promise<VentaAgrupada[]> {
  const movimientos = await db.getAllAsync<{
    venta_id: string;
    fecha_hora: string;
    metodo_pago: 'efectivo' | 'transferencia';
    total: number;
    producto_id: number;
    nombre_producto: string;
    cantidad: number;
    precio_aplicado: number;
  }>(
    `SELECT 
      m.venta_id,
      m.fecha_hora,
      m.metodo_pago,
      m.total,
      m.producto_id,
      p.nombre AS nombre_producto,
      m.cantidad,
      m.precio_aplicado
     FROM movimientos m
     JOIN productos p ON m.producto_id = p.id
     WHERE m.turno_id = ? AND m.tipo = 'cancelacion'
     ORDER BY m.fecha_hora DESC`,
    [turnoId]
  );

  const mapaVentas = new Map<string, VentaAgrupada>();

  for (const mov of movimientos) {
    if (!mapaVentas.has(mov.venta_id)) {
      mapaVentas.set(mov.venta_id, {
        venta_id: mov.venta_id,
        fecha_hora: mov.fecha_hora,
        metodo_pago: mov.metodo_pago,
        total: 0,
        items: [],
      });
    }

    const venta = mapaVentas.get(mov.venta_id)!;
    // Asegurar que el total sea un número válido (Bug 1)
    const totalMovimiento = (typeof mov.total === 'number' && isFinite(mov.total)) ? mov.total : 0;
    venta.total += totalMovimiento;
    venta.items.push({
      producto_id: mov.producto_id,
      nombre_producto: mov.nombre_producto,
      cantidad: mov.cantidad,
      precio_aplicado: mov.precio_aplicado,
    });
  }

  return Array.from(mapaVentas.values());
}

// Cancelar una venta completa por su venta_id
export async function cancelarVenta(ventaId: string): Promise<void> {
  // Obtener todos los movimientos de esa venta
  const movimientos = await db.getAllAsync<{
    producto_id: number;
    cantidad: number;
  }>(
    `SELECT producto_id, cantidad FROM movimientos 
     WHERE venta_id = ? AND tipo = 'venta'`,
    [ventaId]
  );

  // Marcar todos los movimientos de esa venta como cancelacion
  await db.runAsync(
    `UPDATE movimientos SET tipo = 'cancelacion' WHERE venta_id = ? AND tipo = 'venta'`,
    [ventaId]
  );

  // Devolver las cantidades al inventario
  for (const mov of movimientos) {
    await db.runAsync(
      'UPDATE productos SET existencia = existencia + ? WHERE id = ?',
      [mov.cantidad, mov.producto_id]
    );
  }
}