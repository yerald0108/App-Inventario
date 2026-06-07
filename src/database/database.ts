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

import { crearEsquemaBase } from './schema';
import { aplicarMigraciones } from './migrations';

// Inicializar tablas y esquema base
export async function inicializarDB(): Promise<void> {
  try {
    // Abrir la base de datos AQUÍ, no antes
    db = await SQLite.openDatabaseAsync('micaja.db');

    // 1. Tablas core siempre presentes
    await crearEsquemaBase(db);

    // 2. Migraciones
    await aplicarMigraciones(db);

  } catch (error) {
    console.error('inicializarDB: fallo crítico al inicializar la base de datos', error);
    db = null;
    throw error;
  }
}