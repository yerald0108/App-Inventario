import { StyleSheet } from 'react-native';

// Estilos base compartidos por todas las secciones de PantallaDetalleTurno
export const estilosSeccion = StyleSheet.create({
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
  etiqueta: { fontSize: 14, color: '#718096' },
  valor: { fontSize: 14, fontWeight: '600', color: '#2d3748' },
  filaTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  etiquetaTotal: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e' },
  valorTotal: { fontSize: 18, fontWeight: '900', color: '#2b6cb0' },
  filaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    gap: 8,
  },
  nombreItem: { flex: 1, fontSize: 15, color: '#1a1a2e' },
  horaItem: { fontSize: 13, color: '#a0aec0', width: 48, textAlign: 'right' },
});