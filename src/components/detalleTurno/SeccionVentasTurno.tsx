import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VentaAgrupada } from '../../types';
import { formatCUP } from '../../utils';
import { estilosSeccion } from '../shared/estilosSeccion';

interface Props {
  ventas: VentaAgrupada[];
  ventasExpandidas: Set<string>;
  onToggle: (ventaId: string) => void;
  formatearHora: (iso: string) => string;
}

export default function SeccionVentasTurno({
  ventas, ventasExpandidas, onToggle, formatearHora,
}: Props) {
  if (ventas.length === 0) return null;

  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="receipt-outline" size={20} color="#805ad5" />
        <Text style={estilosSeccion.tituloSeccion}>Ventas ({ventas.length})</Text>
      </View>

      {ventas.map((venta) => {
        const expandida = ventasExpandidas.has(venta.venta_id);
        return (
          <TouchableOpacity
            key={venta.venta_id}
            style={estilos.filaVenta}
            onPress={() => onToggle(venta.venta_id)}
            activeOpacity={0.7}
          >
            <View style={estilos.filaVentaCabecera}>
              <Text style={estilos.horaVenta}>{formatearHora(venta.fecha_hora)}</Text>
              <View style={[
                estilos.etiquetaMetodo,
                venta.metodo_pago === 'efectivo'
                  ? { backgroundColor: '#f0fff4', borderColor: '#38a169' }
                  : { backgroundColor: '#ebf8ff', borderColor: '#2b6cb0' },
              ]}>
                <Text style={[
                  estilos.textoMetodo,
                  { color: venta.metodo_pago === 'efectivo' ? '#2f855a' : '#2b6cb0' },
                ]}>
                  {venta.metodo_pago === 'efectivo' ? 'Efectivo' : 'Transfer.'}
                </Text>
              </View>
              <Text style={estilos.totalVenta}>{formatCUP(venta.total)} CUP</Text>
              <Ionicons name={expandida ? 'chevron-up' : 'chevron-down'} size={16} color="#a0aec0" />
            </View>

            {expandida && (
              <View style={estilos.itemsVenta}>
                {venta.items.map((item, idx) => (
                  <Text key={idx} style={estilos.textoItemVenta}>
                    {item.cantidad}x {item.nombre_producto} — {formatCUP(item.cantidad * item.precio_aplicado)} CUP
                  </Text>
                ))}
                {venta.propina > 0 && (
                  <View style={estilos.filaPropina}>
                    <Ionicons name="star" size={12} color="#b7791f" />
                    <Text style={estilos.textoPropina}>Propina: {formatCUP(venta.propina)} CUP</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  filaVenta: { borderBottomWidth: 1, borderBottomColor: '#f0f4f8', paddingVertical: 10 },
  filaVentaCabecera: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  horaVenta: { fontSize: 15, fontWeight: 'bold', color: '#1a1a2e', width: 48 },
  etiquetaMetodo: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, flex: 1,
  },
  textoMetodo: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  totalVenta: { fontSize: 14, fontWeight: '700', color: '#2d3748' },
  itemsVenta: { marginTop: 8, paddingLeft: 8, gap: 4 },
  textoItemVenta: { fontSize: 13, color: '#718096' },
  filaPropina: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#fefcbf',
  },
  textoPropina: { fontSize: 12, fontWeight: '700', color: '#b7791f' },
});