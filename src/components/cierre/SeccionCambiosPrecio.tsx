import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CambioPrecio } from '../../database/historialPrecios';
import { formatCUP } from '../../utils';
import { estilosSeccion } from '../shared/estilosSeccion';

interface Props {
  cambios: CambioPrecio[];
}

export default function SeccionCambiosPrecio({ cambios }: Props) {
  if (cambios.length === 0) return null;

  function formatearHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="pricetag-outline" size={20} color="#dd6b20" />
        <Text style={estilosSeccion.tituloSeccion}>Cambios de precio del turno</Text>
      </View>

      {cambios.map((c) => (
        <View key={c.id} style={estilos.tarjeta}>
          <View style={estilos.cabecera}>
            <Text style={estilos.nombre} numberOfLines={1}>{c.nombre_producto}</Text>
            <Text style={estilos.hora}>{formatearHora(c.fecha_hora)}</Text>
          </View>
          <View style={estilos.filaPrecio}>
            <Text style={estilos.precioAnterior}>{formatCUP(c.precio_anterior)} CUP</Text>
            <Ionicons name="arrow-forward" size={14} color="#a0aec0" />
            <Text style={estilos.precioNuevo}>{formatCUP(c.precio_nuevo)} CUP</Text>
          </View>
          <View style={estilos.filaVentas}>
            <Text style={estilos.textoVentas}>
              Vendido a {formatCUP(c.precio_anterior)}: <Text style={estilos.bold}>{c.cantidadVendidaPrecioAnterior}</Text> unid.
            </Text>
            <Text style={estilos.textoVentas}>
              Vendido a {formatCUP(c.precio_nuevo)}: <Text style={estilos.bold}>{c.cantidadVendidaPrecioNuevo}</Text> unid.
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#fffaf0', borderWidth: 1, borderColor: '#f6ad55',
    borderRadius: 12, padding: 12, marginBottom: 10,
  },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  nombre: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  hora: { fontSize: 13, color: '#a0aec0' },
  filaPrecio: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  precioAnterior: { fontSize: 14, color: '#e53e3e', textDecorationLine: 'line-through' },
  precioNuevo: { fontSize: 15, color: '#38a169', fontWeight: '700' },
  filaVentas: { gap: 2 },
  textoVentas: { fontSize: 13, color: '#744210' },
  bold: { fontWeight: '800' },
});