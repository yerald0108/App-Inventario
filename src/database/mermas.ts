import { getDatabase } from '../database/database';


// ─── Tipos ────────────────────────────────────────────────────────────────────

export type MotivoMerma = 'vencimiento' | 'daño' | 'robo' | 'otro';

export const MOTIVOS_MERMA: { valor: MotivoMerma; etiqueta: string; icono: string }[] = [
  { valor: 'vencimiento', etiqueta: 'Vencimiento',  icono: 'time-outline'      },
  { valor: 'daño',        etiqueta: 'Daño',         icono: 'warning-outline'   },
  { valor: 'robo',        etiqueta: 'Robo',         icono: 'alert-circle-outline' },
  { valor: 'otro',        etiqueta: 'Otro',         icono: 'ellipsis-horizontal-outline' },
];

export interface ItemMerma {
  productoId: number;
  nombreProducto: string;
  cantidad: number;
}

export interface MermaAgrupada {
  grupo_id: string;
  fecha_hora: string;
  motivo: MotivoMerma;
  motivo_detalle: string | null;
  items: {
    id: number;            
    producto_id: number;
    nombre_producto: string;
    cantidad: number;
  }[];
}

// ─── Registrar merma ──────────────────────────────────────────────────────────

export async function registrarMerma(
  items: ItemMerma[],
  motivo: MotivoMerma,
  motivoDetalle: string | null,
  turnoId: number,
  _diaTurnoId: number | null = null
): Promise<void> {
  const grupoId = `MERMA-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const fechaHora = new Date().toISOString();

  try {
    const db = getDatabase();
    await db.withTransactionAsync(async () => {
      for (const item of items) {

        // ── NUEVO: Validar stock real antes de descontar ──────────────────
        const stockActual = await db.getFirstAsync<{ existencia: number }>(
          'SELECT existencia FROM productos WHERE id = ?',
          [item.productoId]
        );

        if (!stockActual) {
          throw new Error(
            `El producto "${item.nombreProducto}" ya no existe en el inventario.`
          );
        }

        if (stockActual.existencia < item.cantidad) {
          throw new Error(
            `Stock insuficiente para "${item.nombreProducto}".\n` +
            `Disponible: ${stockActual.existencia} · Intentas dar de baja: ${item.cantidad}`
          );
        }
        // ─────────────────────────────────────────────────────────────────

        await db.runAsync(
          `INSERT INTO mermas 
            (turno_id, fecha_hora, grupo_id, producto_id, cantidad, motivo, motivo_detalle)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [turnoId, fechaHora, grupoId, item.productoId, item.cantidad, motivo, motivoDetalle]
        );

        await db.runAsync(
          'UPDATE productos SET existencia = existencia - ? WHERE id = ?',
          [item.cantidad, item.productoId]
        );
      }
    });
  } catch (error) {
    console.error('registrarMerma: error en transacción', error);
    throw error;
  }
}

// ─── Obtener mermas de un turno agrupadas por grupo_id ────────────────────────

export async function obtenerMermasTurno(turnoId: number): Promise<MermaAgrupada[]> {
  const db = getDatabase();
  const filas = await db.getAllAsync<{
    grupo_id: string;
    fecha_hora: string;
    motivo: MotivoMerma;
    motivo_detalle: string | null;
    id: number;               
    producto_id: number;
    nombre_producto: string;
    cantidad: number;
  }>(
    `SELECT 
      m.grupo_id,
      m.fecha_hora,
      m.motivo,
      m.motivo_detalle,
      m.id,
      m.producto_id,
      p.nombre AS nombre_producto,
      m.cantidad
     FROM mermas m
     JOIN productos p ON m.producto_id = p.id
     WHERE m.turno_id = ?
     ORDER BY m.fecha_hora DESC`,
    [turnoId]
  );

  const mapa = new Map<string, MermaAgrupada>();

  for (const fila of filas) {
    if (!mapa.has(fila.grupo_id)) {
      mapa.set(fila.grupo_id, {
        grupo_id: fila.grupo_id,
        fecha_hora: fila.fecha_hora,
        motivo: fila.motivo,
        motivo_detalle: fila.motivo_detalle,
        items: [],
      });
    }
    const grupo = mapa.get(fila.grupo_id)!;
    grupo.items.push({
      id: fila.id,               // ← NUEVO
      producto_id: fila.producto_id,
      nombre_producto: fila.nombre_producto,
      cantidad: fila.cantidad,
    });
  }

  return Array.from(mapa.values());
}

// ─── Etiqueta legible del motivo ──────────────────────────────────────────────

export function etiquetaMotivo(motivo: MotivoMerma, detalle: string | null): string {
  const encontrado = MOTIVOS_MERMA.find(m => m.valor === motivo);
  const base = encontrado?.etiqueta ?? motivo;
  if (motivo === 'otro' && detalle) return `Otro: ${detalle}`;
  return base;
}

export async function actualizarCantidadMerma(
  id: number,
  nuevaCantidad: number
): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    const actual = await db.getFirstAsync<{ producto_id: number; cantidad: number }>(
      'SELECT producto_id, cantidad FROM mermas WHERE id = ?',
      [id]
    );
    if (!actual) throw new Error('Registro de merma no encontrado.');

    if (nuevaCantidad <= 0) {
      await db.runAsync('DELETE FROM mermas WHERE id = ?', [id]);
      await db.runAsync(
        'UPDATE productos SET existencia = existencia + ? WHERE id = ?',
        [actual.cantidad, actual.producto_id]
      );
      return;
    }

    const delta = nuevaCantidad - actual.cantidad;
    if (delta > 0) {
      const stock = await db.getFirstAsync<{ existencia: number }>(
        'SELECT existencia FROM productos WHERE id = ?',
        [actual.producto_id]
      );
      if ((stock?.existencia ?? 0) < delta) {
        throw new Error('Stock insuficiente para aumentar esta merma.');
      }
    }

    await db.runAsync(
      'UPDATE productos SET existencia = existencia - ? WHERE id = ?',
      [delta, actual.producto_id]
    );
    await db.runAsync('UPDATE mermas SET cantidad = ? WHERE id = ?', [nuevaCantidad, id]);
  });
}

export async function eliminarMerma(id: number): Promise<void> {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    const actual = await db.getFirstAsync<{ producto_id: number; cantidad: number }>(
      'SELECT producto_id, cantidad FROM mermas WHERE id = ?',
      [id]
    );
    if (!actual) return;
    await db.runAsync('DELETE FROM mermas WHERE id = ?', [id]);
    await db.runAsync(
      'UPDATE productos SET existencia = existencia + ? WHERE id = ?',
      [actual.cantidad, actual.producto_id]
    );
  });
}