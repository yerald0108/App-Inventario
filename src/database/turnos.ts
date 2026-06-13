import { getDatabase } from '../database/database';
import { sumaSegura, calcularTotalItemsBD } from '../utils';
import { Turno } from '../types';

export interface DiaTurno {
  id: number;
  turno_id: number;
  numero_dia: number;
  fecha_inicio: string;
  fecha_cierre: string | null;
  cerrado: number;
}

// Obtener el turno actualmente abierto
export async function obtenerTurnoAbierto(): Promise<Turno | null> {
  const db = getDatabase();
  return await db.getFirstAsync<Turno>(
    'SELECT * FROM turnos WHERE cerrado = 0 ORDER BY id DESC LIMIT 1'
  );
}

// Crear un nuevo turno
export async function crearTurno(diasPlanificados: number = 1): Promise<number> {
  const db = getDatabase();
  const turnoExistente = await obtenerTurnoAbierto();
  if (turnoExistente) {
    return turnoExistente.id;
  }

  const fechaInicio = new Date().toISOString();
  const resultado = await db.runAsync(
    'INSERT INTO turnos (fecha_inicio, cerrado, dias_planificados) VALUES (?, 0, ?)',
    [fechaInicio, diasPlanificados]
  );
  const nuevoTurnoId = resultado.lastInsertRowId;

  // Crear el primer día del turno
  await db.runAsync(
    `INSERT INTO dias_turno (turno_id, numero_dia, fecha_inicio, cerrado)
     VALUES (?, 1, ?, 0)`,
    [nuevoTurnoId, fechaInicio]
  );

  // Guardar snapshot del inventario en este momento
  const productosActuales = await db.getAllAsync<{
    id: number;
    nombre: string;
    existencia: number;
    alerta_minima: number;
  }>('SELECT id, nombre, existencia, alerta_minima FROM productos ORDER BY nombre ASC');

  for (const p of productosActuales) {
    await db.runAsync(
      `INSERT INTO inventario_inicial_turno
        (turno_id, producto_id, nombre, existencia, alerta_minima)
       VALUES (?, ?, ?, ?, ?)`,
      [nuevoTurnoId, p.id, p.nombre, p.existencia, p.alerta_minima]
    );
  }

  return nuevoTurnoId;
}

// Obtener el día activo (abierto) de un turno
export async function obtenerDiaActivo(turnoId: number): Promise<DiaTurno | null> {
  const db = getDatabase();
  return await db.getFirstAsync<DiaTurno>(
    `SELECT * FROM dias_turno 
     WHERE turno_id = ? AND cerrado = 0 
     ORDER BY numero_dia DESC LIMIT 1`,
    [turnoId]
  );
}

// Obtener todos los días de un turno
export async function obtenerDiasTurno(turnoId: number): Promise<DiaTurno[]> {
  const db = getDatabase();
  return await db.getAllAsync<DiaTurno>(
    `SELECT * FROM dias_turno WHERE turno_id = ? ORDER BY numero_dia ASC`,
    [turnoId]
  );
}

// Cerrar el día actual y crear el siguiente si corresponde
export async function cerrarDiaActual(
  turnoId: number,
  diaId: number,
  numeroDia: number,
  diasPlanificados: number
): Promise<'dia_cerrado' | 'turno_listo_para_cerrar'> {
  const db = getDatabase();
  const fechaCierre = new Date().toISOString();

  await db.runAsync(
    `UPDATE dias_turno SET cerrado = 1, fecha_cierre = ? WHERE id = ?`,
    [fechaCierre, diaId]
  );

  // Si quedan días por trabajar, crear el siguiente
  if (numeroDia < diasPlanificados) {
    const siguienteNumero = numeroDia + 1;
    await db.runAsync(
      `INSERT INTO dias_turno (turno_id, numero_dia, fecha_inicio, cerrado)
       VALUES (?, ?, ?, 0)`,
      [turnoId, siguienteNumero, new Date().toISOString()]
    );
    return 'dia_cerrado';
  }

  // Era el último día — el turno está listo para cerrar
  return 'turno_listo_para_cerrar';
}

// Obtener resumen de un día específico
export async function obtenerResumenDia(diaTurnoId: number, turnoId: number) {
  const db = getDatabase();

  const efectivo = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total), 0) as total 
     FROM movimientos 
     WHERE turno_id = ? AND dia_turno_id = ? AND tipo = 'venta' AND metodo_pago = 'efectivo'`,
    [turnoId, diaTurnoId]
  );

  const transferencia = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total), 0) as total 
     FROM movimientos 
     WHERE turno_id = ? AND dia_turno_id = ? AND tipo = 'venta' AND metodo_pago = 'transferencia'`,
    [turnoId, diaTurnoId]
  );

  const conteoVentas = await db.getFirstAsync<{ cantidad: number }>(
    `SELECT COUNT(DISTINCT venta_id) as cantidad
     FROM movimientos
     WHERE turno_id = ? AND dia_turno_id = ? AND tipo = 'venta'`,
    [turnoId, diaTurnoId]
  );

  const totalPropinas = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(propina_unica), 0) as total
     FROM (
       SELECT MAX(propina) as propina_unica
       FROM movimientos
       WHERE turno_id = ? AND dia_turno_id = ? AND tipo = 'venta' AND propina > 0
       GROUP BY venta_id

       UNION ALL

       SELECT propina as propina_unica
       FROM movimientos
       WHERE turno_id = ? AND dia_turno_id = ? AND tipo = 'propina' AND propina > 0
     )`,
    [turnoId, diaTurnoId, turnoId, diaTurnoId]
  );

  return {
    totalEfectivo: efectivo?.total ?? 0,
    totalTransferencia: transferencia?.total ?? 0,
    cantidadVentas: conteoVentas?.cantidad ?? 0,
    totalPropinas: totalPropinas?.total ?? 0,
  };
}

// Obtener resumen completo de un turno para el cierre
export async function obtenerResumenTurno(turnoId: number, diaTurnoId: number | null = null) {
  const db = getDatabase();
  // Total en efectivo (solo ventas no canceladas)
  const efectivo = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total), 0) as total 
     FROM movimientos 
     WHERE turno_id = ? 
       AND tipo = 'venta' 
       AND metodo_pago = 'efectivo'
       AND (? IS NULL OR dia_turno_id = ?)`,
    [turnoId, diaTurnoId, diaTurnoId]
  );

  // Total en transferencia (solo ventas no canceladas)
  const transferencia = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total), 0) as total 
     FROM movimientos 
     WHERE turno_id = ? 
       AND tipo = 'venta' 
       AND metodo_pago = 'transferencia'
       AND (? IS NULL OR dia_turno_id = ?)`,
    [turnoId, diaTurnoId, diaTurnoId]
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
      SELECT MAX(propina) as propina_unica
      FROM movimientos
      WHERE turno_id = ? 
        AND tipo = 'venta' 
        AND propina > 0
        AND (? IS NULL OR dia_turno_id = ?)
      GROUP BY venta_id

      UNION ALL

      SELECT propina as propina_unica
      FROM movimientos
      WHERE turno_id = ? 
        AND tipo = 'propina' 
        AND propina > 0
        AND (? IS NULL OR dia_turno_id = ?)
    )`,
    [turnoId, diaTurnoId, diaTurnoId, turnoId, diaTurnoId, diaTurnoId]
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
  const db = getDatabase();
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
  const db = getDatabase();
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
  const db = getDatabase();
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
  const db = getDatabase();
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
  const db = getDatabase();
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
  const db = getDatabase();
  const movimientos = await db.getAllAsync<{
    venta_id: string;
    fecha_hora: string;
    metodo_pago: 'efectivo' | 'transferencia';
    total: number;
    producto_id: number | null;
    nombre_producto: string | null;
    cantidad: number;
    precio_aplicado: number;
    propina: number;
    tipo: string;
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
      m.propina,
      m.tipo
    FROM movimientos m
    LEFT JOIN productos p ON m.producto_id = p.id
    WHERE m.turno_id = ? AND m.tipo IN ('venta', 'propina')
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
    if (mov.tipo === 'propina') {
      // Fila de propina de pedido 100% externo:
      // solo actualiza la propina en la entrada ya existente del mapa.
      // Si el venta_id aún no existe (no debería pasar), lo creamos vacío.
      if (!mapaVentas.has(mov.venta_id)) {
        mapaVentas.set(mov.venta_id, {
          venta_id: mov.venta_id,
          fecha_hora: mov.fecha_hora,
          metodo_pago: mov.metodo_pago,
          total: 0,
          propina: mov.propina ?? 0,
          items: [],
        });
      } else {
        const venta = mapaVentas.get(mov.venta_id)!;
        venta.propina = mov.propina ?? 0;
      }
      continue; // No agregar como item de producto
    }

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
      nombre_producto: mov.nombre_producto ?? '(producto eliminado)',
      cantidad: mov.cantidad,
      precio_aplicado: mov.precio_aplicado,
    });
  }

  // Recalcular totales desde los items (igual que cancelaciones.ts)
  // NO confiar en la columna `total` de BD, puede contener valores corruptos.
  for (const venta of mapaVentas.values()) {
    venta.total = calcularTotalItemsBD(venta.items);
  }

  return Array.from(mapaVentas.values());
}

// Obtener resumen completo de todos los días de un turno (para cierre)
export async function obtenerResumenTodosLosDias(turnoId: number): Promise<{
  dias: {
    diaTurnoId: number;
    numeroDia: number;
    fecha_inicio: string;
    fecha_cierre: string | null;
    totalEfectivo: number;
    totalTransferencia: number;
    cantidadVentas: number;
    totalPropinas: number;
  }[];
  totalGeneral: {
    totalEfectivo: number;
    totalTransferencia: number;
    cantidadVentas: number;
    totalPropinas: number;
  };
}> {
  const db = getDatabase();

  // Traer todos los días del turno
  const dias = await db.getAllAsync<DiaTurno>(
    `SELECT * FROM dias_turno WHERE turno_id = ? ORDER BY numero_dia ASC`,
    [turnoId]
  );

  const resumenDias = [];

  for (const dia of dias) {
    const efectivo = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(total), 0) as total 
       FROM movimientos 
       WHERE turno_id = ? AND dia_turno_id = ? AND tipo = 'venta' AND metodo_pago = 'efectivo'`,
      [turnoId, dia.id]
    );

    const transferencia = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(total), 0) as total 
       FROM movimientos 
       WHERE turno_id = ? AND dia_turno_id = ? AND tipo = 'venta' AND metodo_pago = 'transferencia'`,
      [turnoId, dia.id]
    );

    const conteoVentas = await db.getFirstAsync<{ cantidad: number }>(
      `SELECT COUNT(DISTINCT venta_id) as cantidad
       FROM movimientos
       WHERE turno_id = ? AND dia_turno_id = ? AND tipo = 'venta'`,
      [turnoId, dia.id]
    );

    const propinas = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(propina_unica), 0) as total
       FROM (
         SELECT MAX(propina) as propina_unica
         FROM movimientos
         WHERE turno_id = ? AND dia_turno_id = ? AND tipo = 'venta' AND propina > 0
         GROUP BY venta_id
         UNION ALL
         SELECT propina as propina_unica
         FROM movimientos
         WHERE turno_id = ? AND dia_turno_id = ? AND tipo = 'propina' AND propina > 0
       )`,
      [turnoId, dia.id, turnoId, dia.id]
    );

    resumenDias.push({
      diaTurnoId: dia.id,
      numeroDia: dia.numero_dia,
      fecha_inicio: dia.fecha_inicio,
      fecha_cierre: dia.fecha_cierre,
      totalEfectivo: efectivo?.total ?? 0,
      totalTransferencia: transferencia?.total ?? 0,
      cantidadVentas: conteoVentas?.cantidad ?? 0,
      totalPropinas: propinas?.total ?? 0,
    });
  }

  // Calcular totales generales sumando todos los días
  const totalGeneral = resumenDias.reduce(
    (acc, dia) => ({
      totalEfectivo: acc.totalEfectivo + dia.totalEfectivo,
      totalTransferencia: acc.totalTransferencia + dia.totalTransferencia,
      cantidadVentas: acc.cantidadVentas + dia.cantidadVentas,
      totalPropinas: acc.totalPropinas + dia.totalPropinas,
    }),
    { totalEfectivo: 0, totalTransferencia: 0, cantidadVentas: 0, totalPropinas: 0 }
  );

  return { dias: resumenDias, totalGeneral };
}

// Obtener pedidos abiertos de un turno (para advertir antes del cierre)
export async function obtenerPedidosAbiertosTurno(turnoId: number): Promise<{
  id: number;
  nombre: string;
  total: number;
}[]> {
  const db = getDatabase();
  return await db.getAllAsync<{ id: number; nombre: string; total: number }>(
    `SELECT id, nombre, total FROM pedidos 
     WHERE turno_id = ? AND estado = 'abierto'
     ORDER BY fecha_apertura ASC`,
    [turnoId]
  );
}

export async function obtenerInventarioInicialTurno(turnoId: number): Promise<{
  nombre: string;
  existencia: number;
  alerta_minima: number;
}[]> {
  const db = getDatabase();
  return await db.getAllAsync<{
    nombre: string;
    existencia: number;
    alerta_minima: number;
  }>(
    `SELECT nombre, existencia, alerta_minima
     FROM inventario_inicial_turno
     WHERE turno_id = ?
     ORDER BY nombre ASC`,
    [turnoId]
  );
}

/**
 * Elimina permanentemente un turno cerrado y todos sus datos asociados:
 * movimientos, ventas externas, ítems de ventas externas, pedidos,
 * ítems de pedidos y mermas del turno.
 * Solo se puede eliminar un turno que esté cerrado (cerrado = 1).
 */
export async function eliminarTurno(turnoId: number): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    // 1. Eliminar ítems de ventas externas del turno
    await db.runAsync(
      `DELETE FROM ventas_externas_items
       WHERE venta_externa_id IN (
         SELECT id FROM ventas_externas WHERE turno_id = ?
       )`,
      [turnoId]
    );

    // 2. Eliminar ventas externas del turno
    await db.runAsync(
      'DELETE FROM ventas_externas WHERE turno_id = ?',
      [turnoId]
    );

    // 3. Eliminar ítems de pedidos del turno
    await db.runAsync(
      `DELETE FROM pedidos_items
       WHERE pedido_id IN (
         SELECT id FROM pedidos WHERE turno_id = ?
       )`,
      [turnoId]
    );

    // 4. Eliminar pedidos del turno
    await db.runAsync(
      'DELETE FROM pedidos WHERE turno_id = ?',
      [turnoId]
    );

    // 5. Eliminar mermas del turno
    await db.runAsync(
      'DELETE FROM mermas WHERE turno_id = ?',
      [turnoId]
    );

    // 6. Eliminar movimientos del turno (ventas, entradas, etc.)
    await db.runAsync(
      'DELETE FROM movimientos WHERE turno_id = ?',
      [turnoId]
    );

    // 7. Eliminar el snapshot de inventario inicial del turno (si existe)
    await db.runAsync(
      'DELETE FROM inventario_inicial_turno WHERE turno_id = ?',
      [turnoId]
    ).catch(() => {
      // Si la tabla no existe todavía en algún dispositivo antiguo, ignorar
    });

    // 8. Finalmente, eliminar el turno en sí
    await db.runAsync(
      'DELETE FROM turnos WHERE id = ? AND cerrado = 1',
      [turnoId]
    );
  });
}