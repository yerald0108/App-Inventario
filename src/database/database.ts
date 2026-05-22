import * as SQLite from 'expo-sqlite';

// Abrir (o crear) la base de datos local
const db = SQLite.openDatabaseSync('micaja.db');

// Inicializar tablas y datos de ejemplo
export async function inicializarDB(): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      existencia REAL NOT NULL,
      alerta_minima REAL DEFAULT 5
    );

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
      FOREIGN KEY (producto_id) REFERENCES productos(id)
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

  // Migración manual para el CHECK constraint de 'movimientos'
  // SQLite no permite ALTER TABLE para cambiar CHECK, hay que recrear si es necesario
  try {
    const tableInfo = await db.getAllAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='movimientos'"
    );
    
    if (tableInfo.length > 0 && !tableInfo[0].sql.includes('salida_familiar')) {
      console.log('Migrando tabla movimientos para soportar salida_familiar...');
      await db.execAsync(`
        BEGIN TRANSACTION;
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
        COMMIT;
      `);
      console.log('Migración completada con éxito.');
    }
  } catch (error) {
    console.error('Error en la migración:', error);
    await db.execAsync('ROLLBACK;').catch(() => {});
  }

  // La base de datos se inicializa vacía para uso real
}

// Exportar la instancia de la base de datos para usarla en toda la app
export default db;