import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ItemMovimiento {
  nombre: string;
  cantidad: number;
  fecha_hora: string;
}

interface Props {
  entradas: ItemMovimiento[];
  salidasFamiliares: ItemMovimiento[];
}

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  return fecha.toLocaleTimeString('es-CU', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function SeccionMovimientos({ entradas, salidasFamiliares }: Props) {
  if (entradas.length === 0 && salidasFamiliares.length === 0) return null;

  return (
    <>
      {entradas.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="download-outline" size={20} color="#2b6cb0" />
            <Text style={estilos.tituloSeccion}>Entradas del turno</Text>
          </View>
          {entradas.map((entrada, index) => (
            <View key={index} style={estilos.filaItem}>
              <Text style={estilos.nombreItem}>{entrada.nombre}</Text>
              <Text style={estilos.cantidadEntrada}>+{entrada.cantidad} unid.</Text>
              <Text style={estilos.horaItem}>{formatearFecha(entrada.fecha_hora)}</Text>
            </View>
          ))}
        </View>
      )}

      {salidasFamiliares.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="people-outline" size={20} color="#ed64a6" />
            <Text style={estilos.tituloSeccion}>Consumo familiar</Text>
          </View>
          {salidasFamiliares.map((salida, index) => (
            <View key={index} style={estilos.filaItem}>
              <Text style={estilos.nombreItem}>{salida.nombre}</Text>
              <Text style={[estilos.cantidadEntrada, { color: '#ed64a6' }]}>
                -{salida.cantidad} unid.
              </Text>
              <Text style={estilos.horaItem}>{formatearFecha(salida.fecha_hora)}</Text>
            </View>
          ))}
        </View>
      )}
    </>
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
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16, borderBottomWidth: 1,
    borderBottomColor: '#edf2f7', paddingBottom: 8,
  },
  tituloSeccion: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', flex: 1 },
  filaItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8', gap: 8,
  },
  nombreItem: { flex: 1, fontSize: 15, color: '#1a1a2e' },
  cantidadEntrada: { fontSize: 15, fontWeight: '600', color: '#38a169' },
  horaItem: { fontSize: 13, color: '#a0aec0', width: 48, textAlign: 'right' },
});