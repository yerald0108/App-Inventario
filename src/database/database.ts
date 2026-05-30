import * as SQLite from 'expo-sqlite';

// Guardamos la base de datos aquí, pero NO la abrimos todavía
let db: SQLite.SQLiteDatabase | null = null;

// Esta función devuelve la base de datos ya abierta
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('La base de datos no está inicializada. Llama a inicializarDB() primero.');
  }
  return db;
}

// Inicializar tablas y esquema base
export async function inicializarDB(): Promise<void> {
  try {
    // Abrir la base de datos AQUÍ, no antes
    db = await SQLite.openDatabaseAsync('micaja.db');

    // 1. Tablas core siempre presentes
    await db.execAsync(`

      CREATE TABLE IF NOT EXISTS meta (
        clave TEXT PRIMARY KEY,
        valor TEXT
      );

      CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        existencia REAL NOT NULL,
        alerta_minima REAL DEFAULT 5
      );

      CREATE TABLE IF NOT EXISTS turnos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha_inicio TEXT NOT NULL,
        fecha_cierre TEXT,
        total_esperado_efectivo REAL,
        total_esperado_transferencia REAL,
        efectivo_real REAL,
        cerrado INTEGER DEFAULT 0
      );
    `);

    // 2. Migraciones
    await aplicarMigraciones();

  } catch (error) {
    console.error('inicializarDB: fallo crítico al inicializar la base de datos', error);
    db = null;
    throw error;
  }
}

async function aplicarMigraciones() {
  if (!db) throw new Error('DB no inicializada');
  
  try {
    const versionRow = await db.getFirstAsync<{ valor: string }>(
      "SELECT valor FROM meta WHERE clave = 'schema_version'"
    );
    const version = versionRow ? parseInt(versionRow.valor) : 0;

    // ── v1: tabla movimientos ──────────────────────────────────────────────
    if (version < 1) {
      console.log('Ejecutando migración v1: tabla movimientos...');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS movimientos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo TEXT NOT NULL CHECK(tipo IN ('venta', 'entrada', 'cancelacion', 'salida_familiar')),
          fecha_hora TEXT NOT NULL,
          producto_id INTEGER NOT NULL,
          cantidad REAL NOT NULL,
          precio_aplicado REAL,
          total REAL,
          metodo_pago TEXT CHECK(metodo_pago IN ('efectivo', 'transferencia')),
          turno_id INTEGER,
          venta_id TEXT,
          FOREIGN KEY (producto_id) REFERENCES productos(id),
          FOREIGN KEY (turno_id) REFERENCES turnos(id)
        );
      `);
      await db.runAsync(
        "INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema_version', '1')"
      );
      console.log('Migración v1 completada.');
    }

    // ── Rescate: dispositivos que ya tenían v1 sin la tabla ───────────────
    if (version >= 1) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS movimientos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo TEXT NOT NULL CHECK(tipo IN ('venta', 'entrada', 'cancelacion', 'salida_familiar')),
          fecha_hora TEXT NOT NULL,
          producto_id INTEGER NOT NULL,
          cantidad REAL NOT NULL,
          precio_aplicado REAL,
          total REAL,
          metodo_pago TEXT CHECK(metodo_pago IN ('efectivo', 'transferencia')),
          turno_id INTEGER,
          venta_id TEXT,
          FOREIGN KEY (producto_id) REFERENCES productos(id),
          FOREIGN KEY (turno_id) REFERENCES turnos(id)
        );
      `);
    }

    // ── v2: tablas de despachos ───────────────────────────────────────────
    if (version < 2) {
      console.log('Ejecutando migración v2: tablas de despachos...');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS despachos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          color TEXT NOT NULL DEFAULT '#805ad5',
          activo INTEGER DEFAULT 1,
          fecha_creacion TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS productos_despacho (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          despacho_id INTEGER NOT NULL,
          nombre TEXT NOT NULL,
          precio REAL NOT NULL,
          activo INTEGER DEFAULT 1,
          FOREIGN KEY (despacho_id) REFERENCES despachos(id)
        );
        CREATE TABLE IF NOT EXISTS ventas_externas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          despacho_id INTEGER NOT NULL,
          turno_id INTEGER NOT NULL,
          fecha_hora TEXT NOT NULL,
          metodo_pago TEXT NOT NULL CHECK(metodo_pago IN ('efectivo', 'transferencia')),
          total REAL NOT NULL,
          venta_id TEXT NOT NULL,
          FOREIGN KEY (despacho_id) REFERENCES despachos(id),
          FOREIGN KEY (turno_id) REFERENCES turnos(id)
        );
        CREATE TABLE IF NOT EXISTS ventas_externas_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          venta_externa_id INTEGER NOT NULL,
          producto_despacho_id INTEGER,
          nombre_producto TEXT NOT NULL,
          precio_aplicado REAL NOT NULL,
          cantidad REAL NOT NULL,
          FOREIGN KEY (venta_externa_id) REFERENCES ventas_externas(id)
        );
      `);
      await db.runAsync(
        "INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema_version', '2')"
      );
      console.log('Migración v2 completada.');
    }

    // ── v3: tablas de pedidos ─────────────────────────────────────────────
    if (version < 3) {
      console.log('Ejecutando migración v3: tablas de pedidos...');
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
      await db.runAsync(
        "INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema_version', '3')"
      );
      console.log('Migración v3 completada.');
    }

    // ── v4: tabla de mermas ───────────────────────────────────────────────
    if (version < 4) {
      console.log('Ejecutando migración v4: tabla de mermas...');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS mermas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          turno_id INTEGER NOT NULL,
          fecha_hora TEXT NOT NULL,
          grupo_id TEXT NOT NULL,
          producto_id INTEGER NOT NULL,
          cantidad REAL NOT NULL,
          motivo TEXT NOT NULL,
          motivo_detalle TEXT,
          FOREIGN KEY (turno_id) REFERENCES turnos(id),
          FOREIGN KEY (producto_id) REFERENCES productos(id)
        );
      `);
      await db.runAsync(
        "INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema_version', '4')"
      );
      console.log('Migración v4 completada.');
    }

    // ── v5: campo propina en movimientos ──────────────────────────────────
    if (version < 5) {
      console.log('Ejecutando migración v5: campo propina en movimientos...');
      await db.execAsync(`
        ALTER TABLE movimientos ADD COLUMN propina REAL DEFAULT 0;
      `);
      await db.runAsync(
        "INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema_version', '5')"
      );
      console.log('Migración v5 completada.');
    }

    // ── v6: pedidos_items mixtos ──────────────────────────────────────────
    if (version < 6) {
      console.log('Ejecutando migración v6: pedidos_items mixtos...');
      await db.execAsync(`
        ALTER TABLE pedidos_items ADD COLUMN origen TEXT NOT NULL DEFAULT 'propio';
        ALTER TABLE pedidos_items ADD COLUMN producto_despacho_id INTEGER;
        ALTER TABLE pedidos_items ADD COLUMN despacho_id INTEGER;
      `);
      await db.runAsync(
        "INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema_version', '6')"
      );
      console.log('Migración v6 completada.');
    }

    // ── v7: precio_costo en productos ─────────────────────────────────────
    if (version < 7) {
      console.log('Ejecutando migración v7: precio_costo en productos...');
      await db.execAsync(`
        ALTER TABLE productos ADD COLUMN precio_costo REAL DEFAULT 0;
      `);
      await db.runAsync(
        "INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema_version', '7')"
      );
      console.log('Migración v7 completada.');
    }

    // ── v8: tipo 'propina' en movimientos ─────────────────────────────────────────
    if (version < 8) {
      console.log('Ejecutando migración v8: soporte propina en movimientos...');
      await db.execAsync(`
        -- SQLite no permite modificar CHECK constraints directamente.
        -- La solución es recrear la tabla con el nuevo constraint.

        -- 1. Crear tabla nueva con el constraint actualizado
        CREATE TABLE IF NOT EXISTS movimientos_v8 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo TEXT NOT NULL CHECK(tipo IN (
            'venta', 'entrada', 'cancelacion', 'salida_familiar', 'propina'
          )),
          fecha_hora TEXT NOT NULL,
          producto_id INTEGER NOT NULL,
          cantidad REAL NOT NULL,
          precio_aplicado REAL,
          total REAL,
          metodo_pago TEXT CHECK(metodo_pago IN ('efectivo', 'transferencia')),
          turno_id INTEGER,
          venta_id TEXT,
          propina REAL DEFAULT 0,
          FOREIGN KEY (producto_id) REFERENCES productos(id),
          FOREIGN KEY (turno_id) REFERENCES turnos(id)
        );

        -- 2. Copiar todos los datos existentes
        INSERT INTO movimientos_v8
          SELECT * FROM movimientos;

        -- 3. Eliminar la tabla vieja
        DROP TABLE movimientos;

        -- 4. Renombrar la nueva
        ALTER TABLE movimientos_v8 RENAME TO movimientos;
      `);
      await db.runAsync(
        "INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema_version', '8')"
      );
      console.log('Migración v8 completada.');
    }

    // ── v9: precio_costo en movimientos ──────────────────────────────────────────
    if (version < 9) {
      console.log('Ejecutando migración v9: precio_costo en movimientos...');
      await db.execAsync(`
        ALTER TABLE movimientos ADD COLUMN precio_costo REAL DEFAULT 0;
      `);
      await db.runAsync(
        "INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema_version', '9')"
      );
      console.log('Migración v9 completada.');
    }

  } catch (error) {
    console.error('Fallo crítico en migración:', error);
    if (db) {
      await db.execAsync('DROP TABLE IF EXISTS movimientos_new;').catch(() => {});
    }
    throw error;
  }
}