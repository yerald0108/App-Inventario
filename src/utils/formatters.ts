/**
 * Formatea un número como moneda CUP con 2 decimales.
 * Si el valor no es un número finito, devuelve "0.00" en lugar de "NaN".
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