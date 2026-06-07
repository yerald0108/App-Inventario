import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('La base de datos no está inicializada. Llama a inicializarDB() primero.');
  }
  return db;
}

import { crearEsquemaBase } from './schema';
import { aplicarMigraciones } from './migrations';

export async function inicializarDB(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync('micaja.db');

    // WAL (Write-Ahead Log): más seguro y eficiente para apps POS con escrituras frecuentes.
    // - Reduce el riesgo de corrupción si el proceso muere durante una escritura (Android).
    // - Permite que lecturas y escrituras ocurran sin bloquearse mutuamente.
    // - Se activa una vez por apertura de BD; SQLite recuerda el modo entre sesiones.
    await db.execAsync('PRAGMA journal_mode = WAL;');

    // Sincronización normal: WAL garantiza durabilidad sin necesidad del modo más lento (FULL).
    await db.execAsync('PRAGMA synchronous = NORMAL;');

    await crearEsquemaBase(db);
    await aplicarMigraciones(db);

  } catch (error) {
    console.error('inicializarDB: fallo crítico al inicializar la base de datos', error);
    db = null;
    throw error;
  }
}