import { StyleSheet } from 'react-native';

/**
 * Estilos base compartidos por todas las secciones (tarjetas) de la app.
 *
 * Antes vivían duplicados en cada componente de /cierre y en
 * detalleTurno/estilosSeccion.ts. Ahora hay una sola fuente de verdad.
 *
 * Cada componente puede tener estilos locales adicionales para sus
 * elementos específicos (badges, inputs, chips, etc.).
 */
export const estilosSeccion = StyleSheet.create({
  // ═══ Tarjeta (card) ═══
  seccion: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cabeceraSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingBottom: 8,
  },
  tituloSeccion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
  },

  // ═══ Filas genéricas ═══
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filaIcono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    gap: 8,
  },
  filaTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },

  // ═══ Texto genérico ═══
  etiqueta: { fontSize: 14, color: '#718096' },
  valor: { fontSize: 14, fontWeight: '600', color: '#2d3748' },
  etiquetaTotal: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e' },
  valorTotal: { fontSize: 18, fontWeight: '900', color: '#2b6cb0' },
  nombreItem: { flex: 1, fontSize: 15, color: '#1a1a2e' },
  horaItem: { fontSize: 13, color: '#a0aec0', width: 48, textAlign: 'right' },

  // ═══ Inventario (compartido entre cierre y detalleTurno) ═══
  filaInventario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  nombreInventario: { flex: 1, fontSize: 15, color: '#1a1a2e', marginRight: 8 },
  stockInventario: { fontSize: 15, fontWeight: '600' },

  // ═══ Despachos (compartido entre cierre y detalleTurno) ═══
  alertaExterna: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#e6fffa',
    borderWidth: 1,
    borderColor: '#81e6d9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  textoAlertaExterna: { flex: 1, fontSize: 13, color: '#2c7a7b', lineHeight: 18 },
  filaDespacho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  puntoColor: { width: 12, height: 12, borderRadius: 6 },
  nombreDespacho: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  detalleDespacho: { fontSize: 12, color: '#718096', marginTop: 1 },
  totalDespacho: { fontSize: 15, fontWeight: 'bold' },
});
