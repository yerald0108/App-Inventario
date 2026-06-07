import * as SQLite from 'expo-sqlite';
import { crearEsquemaBase } from './schema';
import { aplicarMigraciones } from './migrations';

// La instancia vive dentro de este closure — nadie fuera puede mutarla
let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Devuelve la instancia de la base de datos.
 * Lanza un error descriptivo si se llama antes de inicializarDB().
 * El nombre con guión bajo indica que es privada por convención.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (_db === null) {
    throw new Error(
      '[MiCaja] getDatabase() fue llamado antes de inicializarDB(). ' +
      'Asegúrate de que App.tsx haya completado la inicialización.'
    );
  }
  return _db;
}

/**
 * Indica si la base de datos ya fue inicializada.
 * Útil para guards en tests o utilidades que no deben crashear.
 */
export function isDatabaseReady(): boolean {
  return _db !== null;
}

export async function inicializarDB(): Promise<void> {
  // Evitar doble inicialización si se llama más de una vez
  if (_db !== null) {
    console.warn('[MiCaja] inicializarDB() llamado más de una vez. Ignorando.');
    return;
  }

  try {
    const instancia = await SQLite.openDatabaseAsync('micaja.db');

    // WAL: más seguro y eficiente para apps POS con escrituras frecuentes.
    await instancia.execAsync('PRAGMA journal_mode = WAL;');
    await instancia.execAsync('PRAGMA synchronous = NORMAL;');

    await crearEsquemaBase(instancia);
    await aplicarMigraciones(instancia);

    // Solo asignamos después de que todo el setup fue exitoso.
    // Si cualquier paso anterior falla, _db queda en null
    // y el error se propaga hacia App.tsx correctamente.
    _db = instancia;

  } catch (error) {
    console.error('[MiCaja] inicializarDB: fallo crítico', error);
    _db = null;
    throw error;
  }
}