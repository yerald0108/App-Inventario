import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCUP } from '../../utils';
import { estilosSeccion } from '../shared/estilosSeccion';

interface Props {
  cantidadVentas: number;
  cantidadAnulaciones: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalPropinas: number;
}

export default function SeccionResumenVentasTurno({
  cantidadVentas,
  cantidadAnulaciones,
  totalEfectivo,
  totalTransferencia,
  totalPropinas,
}: Props) {
  const totalGeneral = totalEfectivo + totalTransferencia;

  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="stats-chart-outline" size={20} color="#38a169" />
        <Text style={estilosSeccion.tituloSeccion}>Resumen de ventas</Text>
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

      <View style={estilosSeccion.fila}>
        <View style={estilosSeccion.filaIcono}>
          <Ionicons name="cash-outline" size={16} color="#718096" />
          <Text style={estilosSeccion.etiqueta}>Efectivo:</Text>
        </View>
        <Text style={estilosSeccion.valor}>{formatCUP(totalEfectivo)} CUP</Text>
      </View>

      <View style={estilosSeccion.fila}>
        <View style={estilosSeccion.filaIcono}>
          <Ionicons name="card-outline" size={16} color="#718096" />
          <Text style={estilosSeccion.etiqueta}>Transferencia:</Text>
        </View>
        <Text style={estilosSeccion.valor}>{formatCUP(totalTransferencia)} CUP</Text>
      </View>

      <View style={[estilosSeccion.fila, estilosSeccion.filaTotal]}>
        <Text style={estilosSeccion.etiquetaTotal}>Total general:</Text>
        <Text style={estilosSeccion.valorTotal}>{formatCUP(totalGeneral)} CUP</Text>
      </View>

      {totalPropinas > 0 && (
        <View style={[estilosSeccion.fila, estilos.filaPropina]}>
          <View style={estilosSeccion.filaIcono}>
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
  filasConteo: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  chipConteo: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fff4', borderWidth: 1, borderColor: '#9ae6b4',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  chipConteoAnulacion: { backgroundColor: '#fff5f5', borderColor: '#feb2b2' },
  textoChipConteo: { fontSize: 13, fontWeight: '700', color: '#2f855a' },
  filaPropina: { marginTop: 4, paddingTop: 6 },
  etiquetaPropina: { fontSize: 14, color: '#b7791f', fontWeight: '600' },
  valorPropina: { fontSize: 15, fontWeight: 'bold', color: '#b7791f' },
});