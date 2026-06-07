import { useState, useCallback } from 'react';

/**
 * Hook reutilizable para manejar conjuntos de IDs expandidos/colapsados.
 *
 * Centraliza la lógica de toggle que antes estaba duplicada en:
 * - SeccionMermas (estado interno)
 * - useDetalleTurno (mermasExpandidas + ventasExpandidas)
 */
export function useExpandable() {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setExpandidos(prev => {
      const nueva = new Set(prev);
      if (nueva.has(id)) {
        nueva.delete(id);
      } else {
        nueva.add(id);
      }
      return nueva;
    });
  }, []);

  return { expandidos, toggle };
}
