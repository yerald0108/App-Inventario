import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { estilosSeccion } from '../shared/estilosSeccion';

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
        <View style={estilosSeccion.seccion}>
          <View style={estilosSeccion.cabeceraSeccion}>
            <Ionicons name="download-outline" size={20} color="#2b6cb0" />
            <Text style={estilosSeccion.tituloSeccion}>Entradas del turno</Text>
          </View>
          {entradas.map((entrada, index) => (
            <View key={index} style={estilosSeccion.filaItem}>
              <Text style={estilosSeccion.nombreItem}>{entrada.nombre}</Text>
              <Text style={estilos.cantidadEntrada}>+{entrada.cantidad} unid.</Text>
              <Text style={estilosSeccion.horaItem}>{formatearFecha(entrada.fecha_hora)}</Text>
            </View>
          ))}
        </View>
      )}

      {salidasFamiliares.length > 0 && (
        <View style={estilosSeccion.seccion}>
          <View style={estilosSeccion.cabeceraSeccion}>
            <Ionicons name="people-outline" size={20} color="#ed64a6" />
            <Text style={estilosSeccion.tituloSeccion}>Consumo familiar</Text>
          </View>
          {salidasFamiliares.map((salida, index) => (
            <View key={index} style={estilosSeccion.filaItem}>
              <Text style={estilosSeccion.nombreItem}>{salida.nombre}</Text>
              <Text style={[estilos.cantidadEntrada, { color: '#ed64a6' }]}>
                -{salida.cantidad} unid.
              </Text>
              <Text style={estilosSeccion.horaItem}>{formatearFecha(salida.fecha_hora)}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const estilos = StyleSheet.create({
  cantidadEntrada: { fontSize: 15, fontWeight: '600', color: '#38a169' },
  horaItem: { fontSize: 13, color: '#a0aec0', width: 48, textAlign: 'right' },
});