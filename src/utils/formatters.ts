import { ItemCesta } from '../types';

/**
 * Formatea un número como moneda CUP con 2 decimales.
 * Si el valor no es un número finito, devuelve "0.00".
 */
export function formatCUP(value: unknown): string {
  const num = typeof value === 'number' && isFinite(value) ? value : 0;
  return num.toFixed(2);
}

/**
 * Suma segura: ignora valores NaN o Infinity en el acumulador.
 */
export function sumaSegura(valores: number[]): number {
  return valores.reduce((acc, v) => {
    return acc + (typeof v === 'number' && isFinite(v) ? v : 0);
  }, 0);
}

/**
 * Variante A — Calcula el total de items provenientes de la base de datos.
 * Usado en cancelaciones.ts y turnos.ts donde los items tienen precio_aplicado.
 */
export function calcularTotalItemsBD(
  items: { precio_aplicado: number; cantidad: number }[]
): number {
  return sumaSegura(items.map(i => i.precio_aplicado * i.cantidad));
}

/**
 * Variante B — Calcula el total de items de la cesta activa en UI.
 * Usado en ModalCobro y CestaFlotante donde los items pueden tener
 * precioFinal (precio modificado por el usuario) o el precio original.
 */
export function calcularTotalItemsCesta(items: ItemCesta[]): number {
  return sumaSegura(
    items.map(i => (i.precioFinal ?? i.producto.precio) * i.cantidad)
  );
}