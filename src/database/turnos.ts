import { getDatabase } from '../database/database';
import { sumaSegura } from '../utils';
import { Turno } from '../types';

// Obtener el turno actualmente abierto
export async function obtenerTurnoAbierto(): Promise<Turno | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Turno>(
    'SELECT * FROM turnos WHERE cerrado = 0 ORDER BY id DESC LIMIT 1'
  );
}

// Crear un nuevo turno
export async function crearTurno(): Promise<number> {
  const db = await getDatabase();
  // Verificar que no haya un turno abierto antes de crear uno nuevo.
  // Esto es una segunda línea de defensa contra el doble tap u otras
  // condiciones de carrera.
  const turnoExistente = await obtenerTurnoAbierto();
  if (turnoExistente) {
    // Si ya existe un turno abierto, devolver su ID en lugar de crear otro.
    // El comportamiento es idempotente: la operación es segura de llamar dos veces.
    return turnoExistente.id;
  }

  const fechaInicio = new Date().toISOString();
  const resultado = await db.runAsync(
    'INSERT INTO turnos (fecha_inicio, cerrado) VALUES (?, 0)',
    [fechaInicio]
  );
  return resultado.lastInsertRowId;
}

// Obtener resumen completo de un turno para el cierre
export async function obtenerResumenTurno(turnoId: number) {
  const db = await getDatabase();
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

  // Contar ventas únicas (agrupadas por venta_id, no canceladas)
  const conteoVentas = await db.getFirstAsync<{ cantidad: number }>(
    `SELECT COUNT(DISTINCT venta_id) as cantidad
     FROM movimientos
     WHERE turno_id = ? AND tipo = 'venta'`,
    [turnoId]
  );

  // Contar anulaciones únicas
  const conteoAnulaciones = await db.getFirstAsync<{ cantidad: number }>(
    `SELECT COUNT(DISTINCT venta_id) as cantidad
     FROM movimientos
     WHERE turno_id = ? AND tipo = 'cancelacion'`,
    [turnoId]
  );

  // Conteo de propinas del turno
  // Se agrupa por venta_id para no sumar la propina N veces
  // (una venta con 3 productos tiene 3 filas con la misma propina)
  const totalPropinas = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(propina_unica), 0) as total
    FROM (
       -- Propinas de ventas normales (agrupadas para no duplicar)
      SELECT MAX(propina) as propina_unica
      FROM movimientos
      WHERE turno_id = ? AND tipo = 'venta' AND propina > 0
      GROUP BY venta_id

      UNION ALL

      -- Propinas de pedidos 100% de despacho (un registro por venta_id)
      SELECT propina as propina_unica
      FROM movimientos
      WHERE turno_id = ? AND tipo = 'propina'
    )`,
    [turnoId, turnoId]
  );

  return {
    totalEfectivo: efectivo?.total ?? 0,
    totalTransferencia: transferencia?.total ?? 0,
    entradas,
    salidasFamiliares,
    inventario,
    cantidadVentas: conteoVentas?.cantidad ?? 0,
    cantidadAnulaciones: conteoAnulaciones?.cantidad ?? 0,
    totalPropinas: totalPropinas?.total ?? 0,
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
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    // 1. Cancelar los pedidos abiertos que pertenecen a este turno
    await db.runAsync(
      `UPDATE pedidos
       SET estado = 'cancelado', fecha_cierre = ?
       WHERE turno_id = ? AND estado = 'abierto'`,
      [fechaCierre, turnoId]
    );

    // 2. Cerrar el turno
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
  });
}

// Obtener todos los turnos cerrados ordenados por fecha (más reciente primero)
export async function obtenerTurnosCerrados(
  limite: number = 20,
  offset: number = 0
): Promise<Turno[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Turno>(
    `SELECT * FROM turnos
     WHERE cerrado = 1
     ORDER BY fecha_cierre DESC
     LIMIT ? OFFSET ?`,
    [limite, offset]
  );
}

// Obtener turnos cerrados aplicando filtros por mes/año desde la base de datos
export async function obtenerTurnosCerradosFiltrados(
  mes: number | null,
  anio: number | null,
  limite: number = 20,
  offset: number = 0
): Promise<Turno[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM turnos WHERE cerrado = 1';
  const params: any[] = [];

  if (anio !== null && mes !== null) {
    const mesStr = (mes + 1).toString().padStart(2, '0');
    query += ' AND strftime("%Y-%m", fecha_cierre) = ?';
    params.push(`${anio}-${mesStr}`);
  } else if (anio !== null) {
    query += ' AND strftime("%Y", fecha_cierre) = ?';
    params.push(`${anio}`);
  } else if (mes !== null) {
    const mesStr = (mes + 1).toString().padStart(2, '0');
    query += ' AND strftime("%m", fecha_cierre) = ?';
    params.push(`${mesStr}`);
  }

  query += ' ORDER BY fecha_cierre DESC LIMIT ? OFFSET ?';
  params.push(limite, offset);

  return await db.getAllAsync<Turno>(query, params);
}

// Obtener meses y años disponibles para los filtros
export async function obtenerFiltrosDisponiblesHistorial(): Promise<{
  meses: number[];
  anios: number[];
}> {
  const db = await getDatabase();
  const resultados = await db.getAllAsync<{ mes: string, anio: string }>(
    `SELECT DISTINCT strftime("%m", fecha_cierre) as mes, strftime("%Y", fecha_cierre) as anio
     FROM turnos WHERE cerrado = 1 AND fecha_cierre IS NOT NULL`
  );
  
  const mesesSet = new Set<number>();
  const aniosSet = new Set<number>();
  
  resultados.forEach(r => {
    if (r.mes) mesesSet.add(parseInt(r.mes, 10) - 1);
    if (r.anio) aniosSet.add(parseInt(r.anio, 10));
  });
  
  return {
    meses: Array.from(mesesSet).sort((a, b) => a - b),
    anios: Array.from(aniosSet).sort((a, b) => b - a),
  };
}

// Obtener el resumen de un turno cerrado (solo lectura)
export async function obtenerDetalleTurno(turnoId: number) {
  const db = await getDatabase();
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
  const db = await getDatabase();
  const movimientos = await db.getAllAsync<{
    venta_id: string;
    fecha_hora: string;
    metodo_pago: 'efectivo' | 'transferencia';
    total: number;
    producto_id: number;
    nombre_producto: string;
    cantidad: number;
    precio_aplicado: number;
    propina: number;           
  }>(
    `SELECT
      m.venta_id,
      m.fecha_hora,
      m.metodo_pago,
      m.total,
      m.producto_id,
      p.nombre AS nombre_producto,
      m.cantidad,
      m.precio_aplicado,
      m.propina                
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
    propina: number;
    items: { nombre_producto: string; cantidad: number; precio_aplicado: number }[];
  }>();

  for (const mov of movimientos) {
    if (!mapaVentas.has(mov.venta_id)) {
      mapaVentas.set(mov.venta_id, {
        venta_id: mov.venta_id,
        fecha_hora: mov.fecha_hora,
        metodo_pago: mov.metodo_pago,
        total: 0,
        propina: mov.propina ?? 0,
        items: [],
      });
    }
    const venta = mapaVentas.get(mov.venta_id)!;
    venta.items.push({
      nombre_producto: mov.nombre_producto,
      cantidad: mov.cantidad,
      precio_aplicado: mov.precio_aplicado,
    });
  }

  // Recalcular totales desde los items (igual que cancelaciones.ts)
  // NO confiar en la columna `total` de BD, puede contener valores corruptos.
  for (const venta of mapaVentas.values()) {
    venta.total = sumaSegura(venta.items.map(i => i.precio_aplicado * i.cantidad));
  }

  return Array.from(mapaVentas.values());
}

// Obtener pedidos abiertos de un turno (para advertir antes del cierre)
export async function obtenerPedidosAbiertosTurno(turnoId: number): Promise<{
  id: number;
  nombre: string;
  total: number;
}[]> {
  const db = await getDatabase();
  return await db.getAllAsync<{ id: number; nombre: string; total: number }>(
    `SELECT id, nombre, total FROM pedidos 
     WHERE turno_id = ? AND estado = 'abierto'
     ORDER BY fecha_apertura ASC`,
    [turnoId]
  );
}