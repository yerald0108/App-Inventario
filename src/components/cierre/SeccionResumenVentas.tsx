import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCUP } from '../../utils';

interface Props {
  cantidadVentas: number;
  cantidadAnulaciones: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalPropinas: number;
  cargando: boolean;
  onRefrescar: () => void;
}

export default function SeccionResumenVentas({
  cantidadVentas,
  cantidadAnulaciones,
  totalEfectivo,
  totalTransferencia,
  totalPropinas,
  cargando,
  onRefrescar,
}: Props) {
  const totalGeneral = totalEfectivo + totalTransferencia;

  return (
    <View style={estilos.seccion}>
      <View style={estilos.cabeceraSeccion}>
        <Ionicons name="stats-chart-outline" size={20} color="#38a169" />
        <Text style={estilos.tituloSeccion}>Resumen de ventas</Text>
        <TouchableOpacity onPress={onRefrescar} style={estilos.botonRefrescar} disabled={cargando}>
          <Ionicons name="refresh" size={18} color={cargando ? '#cbd5e0' : '#2b6cb0'} />
        </TouchableOpacity>
      </View>

      <View style={estilos.filasConteo}>
        <View style={estilos.chipConteo}>
          <Ionicons name="checkmark-circle" size={14} color="#38a169" />
          <Text style={estilos.textoChipConteo}>
            {cantidadVentas} {cantidadVentas === 1 ? 'venta' : 'ventas'}
          </Text>
        </View>
        {cantidadAnulaciones > 0 && (
          <View style={[estilos.chipConteo, estilos.chipConteoAnulacion]}>
            <Ionicons name="close-circle" size={14} color="#e53e3e" />
            <Text style={[estilos.textoChipConteo, { color: '#e53e3e' }]}>
              {cantidadAnulaciones} anulada{cantidadAnulaciones > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={estilos.filaResumen}>
        <View style={estilos.filaIcono}>
          <Ionicons name="cash-outline" size={16} color="#718096" />
          <Text style={estilos.etiquetaResumen}>Efectivo:</Text>
        </View>
        <Text style={estilos.valorResumen}>{formatCUP(totalEfectivo)} CUP</Text>
      </View>

      <View style={estilos.filaResumen}>
        <View style={estilos.filaIcono}>
          <Ionicons name="card-outline" size={16} color="#718096" />
          <Text style={estilos.etiquetaResumen}>Transferencia:</Text>
        </View>
        <Text style={estilos.valorResumen}>{formatCUP(totalTransferencia)} CUP</Text>
      </View>

      <View style={[estilos.filaResumen, estilos.filaTotal]}>
        <Text style={estilos.etiquetaTotal}>Total general:</Text>
        <Text style={estilos.valorTotal}>{formatCUP(totalGeneral)} CUP</Text>
      </View>

      {totalPropinas > 0 && (
        <View style={[estilos.filaResumen, estilos.filaPropina]}>
          <View style={estilos.filaIcono}>
            <Ionicons name="star" size={14} color="#b7791f" />
            <Text style={estilos.etiquetaPropina}>Propinas recibidas:</Text>
          </View>
          <Text style={estilos.valorPropina}>{formatCUP(totalPropinas)} CUP</Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
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
  tituloSeccion: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', flex: 1 },
  botonRefrescar: { padding: 4 },
  filasConteo: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  chipConteo: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fff4', borderWidth: 1, borderColor: '#9ae6b4',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  chipConteoAnulacion: { backgroundColor: '#fff5f5', borderColor: '#feb2b2' },
  textoChipConteo: { fontSize: 13, fontWeight: '700', color: '#2f855a' },
  filaResumen: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  filaIcono: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etiquetaResumen: { fontSize: 14, color: '#718096' },
  valorResumen: { fontSize: 14, fontWeight: '600', color: '#2d3748' },
  filaTotal: {
    marginTop: 8, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#edf2f7',
  },
  etiquetaTotal: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e' },
  valorTotal: { fontSize: 18, fontWeight: '900', color: '#2b6cb0' },
  filaPropina: { marginTop: 4, paddingTop: 6 },
  etiquetaPropina: { fontSize: 14, color: '#b7791f', fontWeight: '600' },
  valorPropina: { fontSize: 15, fontWeight: 'bold', color: '#b7791f' },
});