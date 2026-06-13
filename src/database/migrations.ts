import * as SQLite from 'expo-sqlite';

// ─── Tipo de una migración individual ────────────────────────────────────────

interface Migration {
  version: number;
  description: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

// ─── Lista de migraciones ─────────────────────────────────────────────────────
//
// REGLAS:
//   1. Nunca modificar una migración ya aplicada en producción.
//   2. Siempre agregar al final con version = última + 1.
//   3. El motor actualiza schema_version automáticamente; no hace falta
//      hacerlo dentro de cada `up`.

const MIGRATIONS: Migration[] = [

  // ── v1: tabla movimientos ──────────────────────────────────────────────────
  {
    version: 1,
    description: 'tabla movimientos',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS movimientos (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo            TEXT    NOT NULL CHECK(tipo IN ('venta','entrada','cancelacion','salida_familiar')),
          fecha_hora      TEXT    NOT NULL,
          producto_id     INTEGER NOT NULL,
          cantidad        REAL    NOT NULL,
          precio_aplicado REAL,
          total           REAL,
          metodo_pago     TEXT    CHECK(metodo_pago IN ('efectivo','transferencia')),
          turno_id        INTEGER,
          venta_id        TEXT,
          FOREIGN KEY (producto_id) REFERENCES productos(id),
          FOREIGN KEY (turno_id)    REFERENCES turnos(id)
        );
      `);
    },
  },

  // ── v2: tablas de despachos ────────────────────────────────────────────────
  {
    version: 2,
    description: 'tablas de despachos externos',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS despachos (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre         TEXT    NOT NULL,
          descripcion    TEXT,
          color          TEXT    NOT NULL DEFAULT '#805ad5',
          activo         INTEGER DEFAULT 1,
          fecha_creacion TEXT    NOT NULL
        );
        CREATE TABLE IF NOT EXISTS productos_despacho (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          despacho_id INTEGER NOT NULL,
          nombre      TEXT    NOT NULL,
          precio      REAL    NOT NULL,
          activo      INTEGER DEFAULT 1,
          FOREIGN KEY (despacho_id) REFERENCES despachos(id)
        );
        CREATE TABLE IF NOT EXISTS ventas_externas (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          despacho_id INTEGER NOT NULL,
          turno_id    INTEGER NOT NULL,
          fecha_hora  TEXT    NOT NULL,
          metodo_pago TEXT    NOT NULL CHECK(metodo_pago IN ('efectivo','transferencia')),
          total       REAL    NOT NULL,
          venta_id    TEXT    NOT NULL,
          FOREIGN KEY (despacho_id) REFERENCES despachos(id),
          FOREIGN KEY (turno_id)    REFERENCES turnos(id)
        );
        CREATE TABLE IF NOT EXISTS ventas_externas_items (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          venta_externa_id    INTEGER NOT NULL,
          producto_despacho_id INTEGER,
          nombre_producto     TEXT    NOT NULL,
          precio_aplicado     REAL    NOT NULL,
          cantidad            REAL    NOT NULL,
          FOREIGN KEY (venta_externa_id) REFERENCES ventas_externas(id)
        );
      `);
    },
  },

  // ── v3: tablas de pedidos ──────────────────────────────────────────────────
  {
    version: 3,
    description: 'tablas de pedidos y pedidos_items',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS pedidos (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre        TEXT    NOT NULL,
          fecha_apertura TEXT   NOT NULL,
          fecha_cierre  TEXT,
          estado        TEXT    NOT NULL DEFAULT 'abierto'
                        CHECK(estado IN ('abierto','cerrado','cancelado')),
          turno_id      INTEGER NOT NULL,
          total         REAL    NOT NULL DEFAULT 0,
          FOREIGN KEY (turno_id) REFERENCES turnos(id)
        );
        CREATE TABLE IF NOT EXISTS pedidos_items (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          pedido_id       INTEGER NOT NULL,
          producto_id     INTEGER NOT NULL,
          nombre_producto TEXT    NOT NULL,
          precio_aplicado REAL    NOT NULL,
          cantidad        REAL    NOT NULL,
          subtotal        REAL    NOT NULL,
          FOREIGN KEY (pedido_id)   REFERENCES pedidos(id),
          FOREIGN KEY (producto_id) REFERENCES productos(id)
        );
      `);
    },
  },

  // ── v4: tabla de mermas ────────────────────────────────────────────────────
  {
    version: 4,
    description: 'tabla mermas',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS mermas (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          turno_id       INTEGER NOT NULL,
          fecha_hora     TEXT    NOT NULL,
          grupo_id       TEXT    NOT NULL,
          producto_id    INTEGER NOT NULL,
          cantidad       REAL    NOT NULL,
          motivo         TEXT    NOT NULL,
          motivo_detalle TEXT,
          FOREIGN KEY (turno_id)    REFERENCES turnos(id),
          FOREIGN KEY (producto_id) REFERENCES productos(id)
        );
      `);
    },
  },

  // ── v5: columna propina en movimientos ────────────────────────────────────
  {
    version: 5,
    description: 'columna propina en movimientos',
    up: async (db) => {
      await db.execAsync(
        `ALTER TABLE movimientos ADD COLUMN propina REAL DEFAULT 0;`
      );
    },
  },

  // ── v6: columnas de pedidos mixtos (propio + despacho) ───────────────────
  {
    version: 6,
    description: 'columnas origen/producto_despacho_id/despacho_id en pedidos_items',
    up: async (db) => {
      await db.execAsync(`
        ALTER TABLE pedidos_items ADD COLUMN origen               TEXT    NOT NULL DEFAULT 'propio';
        ALTER TABLE pedidos_items ADD COLUMN producto_despacho_id INTEGER;
        ALTER TABLE pedidos_items ADD COLUMN despacho_id          INTEGER;
      `);
    },
  },

  // ── v7: precio_costo en productos ─────────────────────────────────────────
  {
    version: 7,
    description: 'columna precio_costo en productos',
    up: async (db) => {
      await db.execAsync(
        `ALTER TABLE productos ADD COLUMN precio_costo REAL DEFAULT 0;`
      );
    },
  },

  // ── v8: reconstrucción de movimientos para admitir tipo 'propina' ─────────
  {
    version: 8,
    description: "tipo 'propina' en CHECK de movimientos",
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS movimientos_v8 (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo            TEXT    NOT NULL CHECK(tipo IN (
                            'venta','entrada','cancelacion','salida_familiar','propina'
                          )),
          fecha_hora      TEXT    NOT NULL,
          producto_id     INTEGER NOT NULL,
          cantidad        REAL    NOT NULL,
          precio_aplicado REAL,
          total           REAL,
          metodo_pago     TEXT    CHECK(metodo_pago IN ('efectivo','transferencia')),
          turno_id        INTEGER,
          venta_id        TEXT,
          propina         REAL    DEFAULT 0,
          FOREIGN KEY (producto_id) REFERENCES productos(id),
          FOREIGN KEY (turno_id)    REFERENCES turnos(id)
        );
        INSERT INTO movimientos_v8 (
          id, tipo, fecha_hora, producto_id, cantidad,
          precio_aplicado, total, metodo_pago, turno_id, venta_id, propina
        )
        SELECT
          id, tipo, fecha_hora, producto_id, cantidad,
          precio_aplicado, total, metodo_pago, turno_id, venta_id,
          COALESCE(propina, 0)
        FROM movimientos;
        DROP TABLE movimientos;
        ALTER TABLE movimientos_v8 RENAME TO movimientos;
      `);
    },
  },

  // ── v9: precio_costo en movimientos ───────────────────────────────────────
  {
    version: 9,
    description: 'columna precio_costo en movimientos',
    up: async (db) => {
      await db.execAsync(
        `ALTER TABLE movimientos ADD COLUMN precio_costo REAL DEFAULT 0;`
      );
    },
  },

  // ── v10: (deprecada) ──────────────────────────────────────────────────────
  {
    version: 10,
    description: '(deprecada — reservada para compatibilidad)',
    up: async (_db) => {
      // Sin operación. Este número de versión está quemado en dispositivos
      // que ejecutaron la v10 original; no puede reutilizarse.
    },
  },

  // ── v11: eliminar índice único incorrecto de propinas ─────────────────────
  {
    version: 11,
    description: 'eliminar índice idx_mov_venta_propina si existe',
    up: async (db) => {
      await db.execAsync(`DROP INDEX IF EXISTS idx_mov_venta_propina;`);
    },
  },

  // ── v12: snapshot de inventario al iniciar turno ──────────────────────────
  {
    version: 12,
    description: 'tabla inventario_inicial_turno',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS inventario_inicial_turno (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          turno_id     INTEGER NOT NULL,
          producto_id  INTEGER NOT NULL,
          nombre       TEXT    NOT NULL,
          existencia   REAL    NOT NULL,
          alerta_minima REAL   DEFAULT 5,
          FOREIGN KEY (turno_id) REFERENCES turnos(id)
        );
      `);
    },
  },

  // ── v13: (deprecada) ──────────────────────────────────────────────────────
  {
    version: 13,
    description: '(deprecada — reservada para compatibilidad)',
    up: async (_db) => {
      // Sin operación.
    },
  },

  // ── v14: producto_id nullable en movimientos ──────────────────────────────
  //   Permite registrar propinas de pedidos 100 % externos sin producto_id.
  {
    version: 14,
    description: 'producto_id nullable en movimientos (soporta tipo propina sin producto)',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS movimientos_v14 (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo            TEXT    NOT NULL CHECK(tipo IN (
                            'venta','entrada','cancelacion','salida_familiar','propina'
                          )),
          fecha_hora      TEXT    NOT NULL,
          producto_id     INTEGER,
          cantidad        REAL    NOT NULL,
          precio_aplicado REAL,
          precio_costo    REAL    DEFAULT 0,
          total           REAL,
          metodo_pago     TEXT    CHECK(metodo_pago IN ('efectivo','transferencia')),
          turno_id        INTEGER,
          venta_id        TEXT,
          propina         REAL    DEFAULT 0,
          FOREIGN KEY (producto_id) REFERENCES productos(id),
          FOREIGN KEY (turno_id)    REFERENCES turnos(id)
        );
        INSERT INTO movimientos_v14 (
          id, tipo, fecha_hora, producto_id, cantidad,
          precio_aplicado, precio_costo, total, metodo_pago,
          turno_id, venta_id, propina
        )
        SELECT
          id, tipo, fecha_hora,
          CASE WHEN producto_id = 0 THEN NULL ELSE producto_id END,
          cantidad,
          precio_aplicado,
          COALESCE(precio_costo, 0),
          total, metodo_pago, turno_id, venta_id,
          COALESCE(propina, 0)
        FROM movimientos;
        DROP TABLE movimientos;
        ALTER TABLE movimientos_v14 RENAME TO movimientos;
      `);
    },
  },

  // ── v15: tabla dias_turno ─────────────────────────────────────────────────
  {
    version: 15,
    description: 'tabla dias_turno para turnos multi-día',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS dias_turno (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          turno_id     INTEGER NOT NULL,
          numero_dia   INTEGER NOT NULL DEFAULT 1,
          fecha_inicio TEXT    NOT NULL,
          fecha_cierre TEXT,
          cerrado      INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (turno_id) REFERENCES turnos(id)
        );
      `);
    },
  },

  // ── v16: columna dia_turno_id en movimientos ──────────────────────────────
  {
    version: 16,
    description: 'columna dia_turno_id en movimientos',
    up: async (db) => {
      await db.execAsync(
        `ALTER TABLE movimientos ADD COLUMN dia_turno_id INTEGER;`
      );
    },
  },

  // ── v17: columna dias_planificados en turnos ──────────────────────────────
  {
    version: 17,
    description: 'columna dias_planificados en turnos',
    up: async (db) => {
      await db.execAsync(
        `ALTER TABLE turnos ADD COLUMN dias_planificados INTEGER NOT NULL DEFAULT 1;`
      );
    },
  },

  // ── v18: columna dia_turno_id en ventas_externas ──────────────────────────
  {
    version: 18,
    description: 'columna dia_turno_id en ventas_externas',
    up: async (db) => {
      await db.execAsync(
        `ALTER TABLE ventas_externas ADD COLUMN dia_turno_id INTEGER;`
      );
    },
  },

];

// ─── Motor de migraciones ─────────────────────────────────────────────────────
//
// Lee la versión actual desde la tabla `meta`, filtra las migraciones
// pendientes y las ejecuta en orden, cada una dentro de su propia
// transacción. Si una falla, hace rollback y relanza el error.

export async function aplicarMigraciones(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM meta WHERE clave = 'schema_version'"
  );
  const versionActual = versionRow ? parseInt(versionRow.valor, 10) : 0;

  const pendientes = MIGRATIONS.filter((m) => m.version > versionActual);

  if (pendientes.length === 0) return;

  for (const migration of pendientes) {
    console.log(`Ejecutando migración v${migration.version}: ${migration.description}...`);
    try {
      await db.withTransactionAsync(async () => {
        await migration.up(db);
        await db.runAsync(
          "INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema_version', ?)",
          [migration.version.toString()]
        );
      });
      console.log(`Migración v${migration.version} completada.`);
    } catch (error) {
      console.error(`Migración v${migration.version} falló:`, error);
      throw error;
    }
  }
}