import db from './database';
import { Turno } from '../types';

// Obtener el turno actualmente abierto
export async function obtenerTurnoAbierto(): Promise<Turno | null> {
  return await db.getFirstAsync<Turno>(
    'SELECT * FROM turnos WHERE cerrado = 0 ORDER BY id DESC LIMIT 1'
  );
}

// Crear un nuevo turno
export async function crearTurno(): Promise<number> {
  const fechaInicio = new Date().toISOString();
  const resultado = await db.runAsync(
    'INSERT INTO turnos (fecha_inicio, cerrado) VALUES (?, 0)',
    [fechaInicio]
  );
  return resultado.lastInsertRowId;
}

// Obtener resumen completo de un turno para el cierre
export async function obtenerResumenTurno(turnoId: number) {
  // Total en efectivo (solo ventas no canceladas)
  const efectivo = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total), 0) as total 
     FROM movimientos 
     WHERE turno_id = ? AND tipo = 'venta' AND metodo_pago = 'efectivo'`,
    [turnoId]
  );

  // Total en transferencia (solo ventas no canceladas)
  const transferencia = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total), 0) as total 
     FROM movimientos 
     WHERE turno_id = ? AND tipo = 'venta' AND metodo_pago = 'transferencia'`,
    [turnoId]
  );

  // Lista de entradas del turno
  const entradas = await db.getAllAsync<{
    nombre: string;
    cantidad: number;
    fecha_hora: string;
  }>(
    `SELECT p.nombre, m.cantidad, m.fecha_hora
     FROM movimientos m
     JOIN productos p ON m.producto_id = p.id
     WHERE m.turno_id = ? AND m.tipo = 'entrada'
     ORDER BY m.fecha_hora ASC`,
    [turnoId]
  );

  // Lista de salidas familiares (Bug 9)
  const salidasFamiliares = await db.getAllAsync<{
    nombre: string;
    cantidad: number;
    fecha_hora: string;
  }>(
    `SELECT p.nombre, m.cantidad, m.fecha_hora
     FROM movimientos m
     JOIN productos p ON m.producto_id = p.id
     WHERE m.turno_id = ? AND m.tipo = 'salida_familiar'
     ORDER BY m.fecha_hora ASC`,
    [turnoId]
  );

  // Inventario actual de todos los productos
  const inventario = await db.getAllAsync<{
    nombre: string;
    existencia: number;
    alerta_minima: number;
  }>(
    'SELECT nombre, existencia, alerta_minima FROM productos ORDER BY nombre ASC'
  );

  return {
    totalEfectivo: efectivo?.total ?? 0,
    totalTransferencia: transferencia?.total ?? 0,
    entradas,
    salidasFamiliares,
    inventario,
  };
}

// Cerrar el turno guardando los totales y el efectivo real contado
export async function cerrarTurno(
  turnoId: number,
  totalEfectivo: number,
  totalTransferencia: number,
  efectivoReal: number
): Promise<void> {
  const fechaCierre = new Date().toISOString();
  await db.runAsync(
    `UPDATE turnos SET
      cerrado = 1,
      fecha_cierre = ?,
      total_esperado_efectivo = ?,
      total_esperado_transferencia = ?,
      efectivo_real = ?
     WHERE id = ?`,
    [fechaCierre, totalEfectivo, totalTransferencia, efectivoReal, turnoId]
  );
}

// Obtener todos los turnos cerrados ordenados por fecha (más reciente primero)
export async function obtenerTurnosCerrados(): Promise<Turno[]> {
  return await db.getAllAsync<Turno>(
    'SELECT * FROM turnos WHERE cerrado = 1 ORDER BY fecha_cierre DESC'
  );
}

// Obtener el resumen de un turno cerrado (solo lectura)
export async function obtenerDetalleTurno(turnoId: number) {
  const turno = await db.getFirstAsync<Turno>(
    'SELECT * FROM turnos WHERE id = ?',
    [turnoId]
  );

  if (!turno) return null;

  const resumen = await obtenerResumenTurno(turnoId);

  return { turno, ...resumen };
}

// Obtener ventas agrupadas de un turno cerrado
export async function obtenerVentasDetalleTurno(turnoId: number) {
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

  const mapaVentas = new Map<string, {
    venta_id: string;
    fecha_hora: string;
    metodo_pago: 'efectivo' | 'transferencia';
    total: number;
    items: { nombre_producto: string; cantidad: number; precio_aplicado: number }[];
  }>();

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
    venta.total += mov.total ?? 0;
    venta.items.push({
      nombre_producto: mov.nombre_producto,
      cantidad: mov.cantidad,
      precio_aplicado: mov.precio_aplicado,
    });
  }

  return Array.from(mapaVentas.values());
}