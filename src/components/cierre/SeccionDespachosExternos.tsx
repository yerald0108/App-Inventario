import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ResumenDespacho } from '../../hooks/useCierreTurno';
import { formatCUP } from '../../utils';

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
    <View style={estilos.seccion}>
      <View style={estilos.cabeceraSeccion}>
        <Ionicons name="storefront-outline" size={20} color="#319795" />
        <Text style={estilos.tituloSeccion}>Ventas de despachos externos</Text>
      </View>

      <View style={estilos.alertaExterna}>
        <Ionicons name="information-circle-outline" size={16} color="#2c7a7b" />
        <Text style={estilos.textoAlertaExterna}>
          Este dinero <Text style={{ fontWeight: 'bold' }}>no pertenece a tu caja</Text>.
          Debes depositarlo a cada despacho por separado.
        </Text>
      </View>

      {despachos.map((d) => (
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

      <View style={estilos.filaTotal}>
        <Text style={estilos.etiquetaTotal}>Total a depositar:</Text>
        <Text style={[estilos.valorTotal, { color: '#319795' }]}>
          {formatCUP(totalExterno)} CUP
        </Text>
      </View>

      {/* Gran total del día */}
      <View style={[estilos.seccionGranTotal]}>
        <View style={estilos.cabeceraSeccion}>
          <Ionicons name="calculator-outline" size={20} color="#1a1a2e" />
          <Text style={estilos.tituloSeccion}>Gran total del día</Text>
        </View>
        <View style={estilos.filaResumen}>
          <Text style={estilos.etiquetaResumen}>Ventas propias:</Text>
          <Text style={estilos.valorResumen}>{formatCUP(totalGeneral)} CUP</Text>
        </View>
        <View style={estilos.filaResumen}>
          <Text style={estilos.etiquetaResumen}>Ventas de despachos:</Text>
          <Text style={estilos.valorResumen}>{formatCUP(totalExterno)} CUP</Text>
        </View>
        <View style={{ height: 1, backgroundColor: '#edf2f7', marginVertical: 8 }} />
        <View style={estilos.filaResumen}>
          <Text style={estilos.etiquetaTotal}>Total movido hoy:</Text>
          <Text style={[estilos.valorTotal, { color: '#1a1a2e' }]}>
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
  seccionGranTotal: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  cabeceraSeccion: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16, borderBottomWidth: 1,
    borderBottomColor: '#edf2f7', paddingBottom: 8,
  },
  tituloSeccion: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', flex: 1 },
  alertaExterna: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#e6fffa', borderWidth: 1, borderColor: '#81e6d9',
    borderRadius: 10, padding: 10, marginBottom: 14,
  },
  textoAlertaExterna: { flex: 1, fontSize: 13, color: '#2c7a7b', lineHeight: 18 },
  filaDespacho: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f4f8',
  },
  puntoColor: { width: 12, height: 12, borderRadius: 6 },
  nombreDespacho: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  detalleDespacho: { fontSize: 12, color: '#718096', marginTop: 1 },
  totalDespacho: { fontSize: 15, fontWeight: 'bold' },
  filaTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 8, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#edf2f7',
  },
  filaResumen: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  etiquetaResumen: { fontSize: 14, color: '#718096' },
  valorResumen: { fontSize: 14, fontWeight: '600', color: '#2d3748' },
  etiquetaTotal: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e' },
  valorTotal: { fontSize: 18, fontWeight: '900', color: '#2b6cb0' },
  notaGranTotal: {
    fontSize: 12, color: '#a0aec0', fontStyle: 'italic',
    marginTop: 10, textAlign: 'center', lineHeight: 18,
  },
});