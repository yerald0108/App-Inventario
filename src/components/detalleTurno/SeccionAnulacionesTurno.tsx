import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VentaAgrupada } from '../../types';
import { formatCUP } from '../../utils';
import { estilosSeccion } from './estilosSeccion';

interface Props {
  anulaciones: VentaAgrupada[];
  formatearHora: (iso: string) => string;
}

export default function SeccionAnulacionesTurno({ anulaciones, formatearHora }: Props) {
  if (anulaciones.length === 0) return null;

  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="trash-outline" size={20} color="#e53e3e" />
        <Text style={estilosSeccion.tituloSeccion}>Anulaciones ({anulaciones.length})</Text>
      </View>

      {anulaciones.map((venta) => (
        <View key={venta.venta_id} style={[estilos.filaHistorial, { opacity: 0.6 }]}>
          <View style={estilos.cabeceraFila}>
            <Text style={[estilos.horaVenta, { textDecorationLine: 'line-through' }]}>
              {formatearHora(venta.fecha_hora)}
            </Text>
            <Text style={estilos.totalVenta}>{formatCUP(venta.total)} CUP</Text>
          </View>
          <View>
            {venta.items.map((item, idx) => (
              <Text key={idx} style={[estilos.textoItem, { textDecorationLine: 'line-through' }]}>
                {item.cantidad}x {item.nombre_producto}
              </Text>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  filaHistorial: {
    marginBottom: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f4f8',
  },
  cabeceraFila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  horaVenta: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e' },
  totalVenta: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e', marginLeft: 'auto' },
  textoItem: { fontSize: 13, color: '#718096' },
});