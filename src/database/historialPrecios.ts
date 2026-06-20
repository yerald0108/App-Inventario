import { getDatabase } from './database';

export interface CambioPrecio {
  id: number;
  producto_id: number;
  nombre_producto: string;
  precio_anterior: number;
  precio_nuevo: number;
  fecha_hora: string;
  cantidadVendidaPrecioAnterior: number;
  cantidadVendidaPrecioNuevo: number;
}

export async function obtenerCambiosPrecioTurno(turnoId: number): Promise<CambioPrecio[]> {
  const db = getDatabase();

  const cambios = await db.getAllAsync<{
    id: number;
    producto_id: number;
    nombre_producto: string;
    precio_anterior: number;
    precio_nuevo: number;
    fecha_hora: string;
  }>(
    `SELECT id, producto_id, nombre_producto, precio_anterior, precio_nuevo, fecha_hora
     FROM historial_precios
     WHERE turno_id = ?
     ORDER BY fecha_hora ASC`,
    [turnoId]
  );

  const resultado: CambioPrecio[] = [];

  for (const cambio of cambios) {
    const vendidoAntes = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(cantidad), 0) as total
       FROM movimientos
       WHERE turno_id = ?
         AND producto_id = ?
         AND tipo = 'venta'
         AND ROUND(precio_aplicado, 2) = ROUND(?, 2)
         AND fecha_hora <= ?`,
      [turnoId, cambio.producto_id, cambio.precio_anterior, cambio.fecha_hora]
    );

    const vendidoDespues = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(cantidad), 0) as total
       FROM movimientos
       WHERE turno_id = ?
         AND producto_id = ?
         AND tipo = 'venta'
         AND ROUND(precio_aplicado, 2) = ROUND(?, 2)
         AND fecha_hora > ?`,
      [turnoId, cambio.producto_id, cambio.precio_nuevo, cambio.fecha_hora]
    );

    resultado.push({
      ...cambio,
      cantidadVendidaPrecioAnterior: vendidoAntes?.total ?? 0,
      cantidadVendidaPrecioNuevo: vendidoDespues?.total ?? 0,
    });
  }

  return resultado;
}