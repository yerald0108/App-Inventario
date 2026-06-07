import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ResumenDespacho } from '../../hooks/useCierreTurno';
import { formatCUP } from '../../utils';
import { estilosSeccion } from '../shared/estilosSeccion';

interface Props {
  despachos: ResumenDespacho[];
  totalGeneral: number;
}

export default function SeccionDespachosExternos({ despachos, totalGeneral }: Props) {
  if (despachos.length === 0) return null;

  const totalExterno = despachos.reduce(
    (acc, d) => acc + d.total_efectivo + d.total_transferencia, 0
  );

  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="storefront-outline" size={20} color="#319795" />
        <Text style={estilosSeccion.tituloSeccion}>Ventas de despachos externos</Text>
      </View>

      <View style={estilosSeccion.alertaExterna}>
        <Ionicons name="information-circle-outline" size={16} color="#2c7a7b" />
        <Text style={estilosSeccion.textoAlertaExterna}>
          Este dinero <Text style={{ fontWeight: 'bold' }}>no pertenece a tu caja</Text>.
          Debes depositarlo a cada despacho por separado.
        </Text>
      </View>

      {despachos.map((d) => (
        <View key={d.despacho_id} style={estilosSeccion.filaDespacho}>
          <View style={[estilosSeccion.puntoColor, { backgroundColor: d.despacho_color }]} />
          <View style={{ flex: 1 }}>
            <Text style={estilosSeccion.nombreDespacho}>{d.despacho_nombre}</Text>
            <Text style={estilosSeccion.detalleDespacho}>
              {d.cantidad_ventas} venta{d.cantidad_ventas !== 1 ? 's' : ''}
              {d.total_efectivo > 0 ? `  ·  Ef: ${formatCUP(d.total_efectivo)}` : ''}
              {d.total_transferencia > 0 ? `  ·  Tr: ${formatCUP(d.total_transferencia)}` : ''}
            </Text>
          </View>
          <Text style={[estilosSeccion.totalDespacho, { color: d.despacho_color }]}>
            {formatCUP(d.total_efectivo + d.total_transferencia)} CUP
          </Text>
        </View>
      ))}

      <View style={[estilosSeccion.fila, estilosSeccion.filaTotal]}>
        <Text style={estilosSeccion.etiquetaTotal}>Total a depositar:</Text>
        <Text style={[estilosSeccion.valorTotal, { color: '#319795' }]}>
          {formatCUP(totalExterno)} CUP
        </Text>
      </View>

      {/* Gran total del día */}
      <View style={[estilos.seccionGranTotal]}>
        <View style={estilosSeccion.cabeceraSeccion}>
          <Ionicons name="calculator-outline" size={20} color="#1a1a2e" />
          <Text style={estilosSeccion.tituloSeccion}>Gran total del día</Text>
        </View>
        <View style={estilosSeccion.fila}>
          <Text style={estilosSeccion.etiqueta}>Ventas propias:</Text>
          <Text style={estilosSeccion.valor}>{formatCUP(totalGeneral)} CUP</Text>
        </View>
        <View style={estilosSeccion.fila}>
          <Text style={estilosSeccion.etiqueta}>Ventas de despachos:</Text>
          <Text style={estilosSeccion.valor}>{formatCUP(totalExterno)} CUP</Text>
        </View>
        <View style={{ height: 1, backgroundColor: '#edf2f7', marginVertical: 8 }} />
        <View style={estilosSeccion.fila}>
          <Text style={estilosSeccion.etiquetaTotal}>Total movido hoy:</Text>
          <Text style={[estilosSeccion.valorTotal, { color: '#1a1a2e' }]}>
            {formatCUP(totalGeneral + totalExterno)} CUP
          </Text>
        </View>
        <Text style={estilos.notaGranTotal}>
          * Las ventas de despachos no son tuyas. Tu dinero real es {formatCUP(totalGeneral)} CUP.
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  seccionGranTotal: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  notaGranTotal: {
    fontSize: 12, color: '#a0aec0', fontStyle: 'italic',
    marginTop: 10, textAlign: 'center', lineHeight: 18,
  },
});