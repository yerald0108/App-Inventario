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
      tipo TEXT NOT NULL CHECK(tipo IN ('venta', 'entrada', 'cancelacion')),
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

  const resultado = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM productos'
  );

  if (resultado && resultado.count === 0) {
    await db.execAsync(`
      INSERT INTO productos (nombre, precio, existencia, alerta_minima) VALUES
        ('Cerveza 260ml', 45, 24, 5),
        ('Cerveza 500ml', 70, 18, 5),
        ('Refresco Cola', 30, 10, 5),
        ('Agua Natural', 20, 3, 5),
        ('Jugo de Mango', 25, 8, 5);
    `);
  }
}

// Exportar la instancia de la base de datos para usarla en toda la app
export default db;