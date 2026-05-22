import * as SQLite from 'expo-sqlite';

// Abrir (o crear) la base de datos local
const db = SQLite.openDatabaseSync('micaja.db');

// Inicializar tablas y esquema base
export async function inicializarDB(): Promise<void> {
  // 1. Tablas core siempre presentes
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

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

  // 2. Tabla movimientos (podría requerir migración)
  await aplicarMigraciones();
}

async function aplicarMigraciones() {
  try {
    // Verificar versión actual
    const versionRow = await db.getFirstAsync<{ valor: string }>(
      "SELECT valor FROM meta WHERE clave = 'schema_version'"
    );
    const version = versionRow ? parseInt(versionRow.valor) : 0;

    // Migración 1: Crear tabla movimientos con soporte para salida_familiar
    if (version < 1) {
      console.log('Ejecutando migración v1: Crear tabla movimientos...');
      
      // Intentar detectar si ya existe una tabla movimientos antigua (sin el CHECK correcto)
      const tableInfo = await db.getAllAsync<{ sql: string }>(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='movimientos'"
      );

      if (tableInfo.length > 0 && !tableInfo[0].sql.includes('salida_familiar')) {
        // Migrar datos de tabla antigua
        await db.withTransactionAsync(async () => {
          await db.execAsync(`
            CREATE TABLE movimientos_new (
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
              FOREIGN KEY (producto_id) REFERENCES productos(id)
            );
            INSERT INTO movimientos_new SELECT * FROM movimientos;
            DROP TABLE movimientos;
            ALTER TABLE movimientos_new RENAME TO movimientos;
          `);
        });
      } else if (tableInfo.length === 0) {
        // Crear desde cero si no existe
        await db.execAsync(`
          CREATE TABLE movimientos (
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
            FOREIGN KEY (producto_id) REFERENCES productos(id)
          );
        `);
      }

      // Actualizar versión
      await db.runAsync(
        "INSERT OR REPLACE INTO meta (clave, valor) VALUES ('schema_version', '1')"
      );
      console.log('Migración v1 completada.');
    }
  } catch (error) {
    console.error('Fallo crítico en migración:', error);
    // No relanzamos para permitir que la app intente arrancar si es posible,
    // o al menos no crashee en el splash screen infinitamente.
    // Limpieza de emergencia si quedó una tabla temporal
    await db.execAsync('DROP TABLE IF EXISTS movimientos_new;').catch(() => {});
  }
}

// Exportar la instancia de la base de datos para usarla en toda la app
export default db;