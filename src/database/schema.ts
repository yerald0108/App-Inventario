import * as SQLite from 'expo-sqlite';

/**
 * Crea las tablas base de la aplicación.
 * Solo se definen aquí las tablas fundamentales que siempre deben existir.
 * El resto de las tablas o columnas añadidas posteriormente se manejan en migraciones.
 */
export async function crearEsquemaBase(db: SQLite.SQLiteDatabase): Promise<void> {
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
}
