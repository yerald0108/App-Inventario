import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCUP } from '../../utils';
import { estilosSeccion } from '../shared/estilosSeccion';
import { ResumenDespachoDetalle } from '../../hooks/useDetalleTurno';

interface Props {
  resumenDespachos: ResumenDespachoDetalle[];
}

export default function SeccionDespachosDetalle({ resumenDespachos }: Props) {
  if (resumenDespachos.length === 0) return null;

  const totalExterno = resumenDespachos.reduce(
    (acc, d) => acc + d.total_efectivo + d.total_transferencia, 0
  );

  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="storefront-outline" size={20} color="#319795" />
        <Text style={estilosSeccion.tituloSeccion}>Ventas de despachos externos</Text>
      </View>

      <View style={estilos.alertaExterna}>
        <Ionicons name="information-circle-outline" size={16} color="#2c7a7b" />
        <Text style={estilos.textoAlerta}>
          Este dinero <Text style={{ fontWeight: 'bold' }}>no pertenece a tu caja</Text>.
          Fue depositado a cada despacho por separado.
        </Text>
      </View>

      {resumenDespachos.map((d) => (
        <View key={d.despacho_id} style={estilos.filaDespacho}>
          <View style={[estilos.puntoColor, { backgroundColor: d.despacho_color }]} />
          <View style={{ flex: 1 }}>
            <Text style={estilos.nombreDespacho}>{d.despacho_nombre}</Text>
            <Text style={estilos.detalleDespacho}>
              {d.cantidad_ventas} venta{d.cantidad_ventas !== 1 ? 's' : ''}
              {d.total_efectivo > 0 ? `  ·  Ef: ${formatCUP(d.total_efectivo)}` : ''}
              {d.total_transferencia > 0 ? `  ·  Tr: ${formatCUP(d.total_transferencia)}` : ''}
            </Text>
          </View>
          <Text style={[estilos.totalDespacho, { color: d.despacho_color }]}>
            {formatCUP(d.total_efectivo + d.total_transferencia)} CUP
          </Text>
        </View>
      ))}

      <View style={[estilosSeccion.fila, estilosSeccion.filaTotal, { marginTop: 12 }]}>
        <Text style={estilosSeccion.etiquetaTotal}>Total externo:</Text>
        <Text style={[estilosSeccion.valorTotal, { color: '#319795' }]}>
          {formatCUP(totalExterno)} CUP
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  alertaExterna: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#e6fffa', borderWidth: 1, borderColor: '#81e6d9',
    borderRadius: 10, padding: 10, marginBottom: 14,
  },
  textoAlerta: { flex: 1, fontSize: 13, color: '#2c7a7b', lineHeight: 18 },
  filaDespacho: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f4f8',
  },
  puntoColor: { width: 12, height: 12, borderRadius: 6 },
  nombreDespacho: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  detalleDespacho: { fontSize: 12, color: '#718096', marginTop: 1 },
  totalDespacho: { fontSize: 15, fontWeight: 'bold' },
});