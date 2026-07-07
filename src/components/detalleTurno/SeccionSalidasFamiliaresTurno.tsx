import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { estilosSeccion } from '../shared/estilosSeccion';

interface SalidaFamiliarItem {
  nombre: string;
  cantidad: number;
  fecha_hora: string;
  persona?: string | null;
}

interface Props {
  salidas: SalidaFamiliarItem[];
}

export default function SeccionSalidasFamiliaresTurno({ salidas }: Props) {
  if (salidas.length === 0) return null;

  const totalUnidades = salidas.reduce((acc, s) => acc + s.cantidad, 0);

  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="people-outline" size={20} color="#b83280" />
        <Text style={estilosSeccion.tituloSeccion}>
          Salidas familiares ({salidas.length} registro{salidas.length !== 1 ? 's' : ''})
        </Text>
      </View>

      {salidas.map((item, idx) => (
        <View key={idx} style={estilosSeccion.filaItem}>
          <View style={{ flex: 1 }}>
            <Text style={estilosSeccion.nombreItem}>{item.nombre}</Text>
            {item.persona ? (
              <Text style={estilos.personaItem}>👤 {item.persona}</Text>
            ) : null}
            <Text style={estilos.horaItem}>
              {new Date(item.fecha_hora).toLocaleTimeString('es-CU', {
                hour: '2-digit', minute: '2-digit', hour12: true,
              })}
            </Text>
          </View>
          <Text style={estilos.cantidadItem}>-{item.cantidad} unid.</Text>
        </View>
      ))}

      <View style={estilos.totalSalidas}>
        <Text style={estilos.textoTotal}>
          Total: {totalUnidades} unidad{totalUnidades !== 1 ? 'es' : ''}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  personaItem: { fontSize: 13, color: '#b83280', fontWeight: '600', marginTop: 2 },
  horaItem: { fontSize: 12, color: '#a0aec0', marginTop: 2 },
  cantidadItem: { fontSize: 15, fontWeight: '700', color: '#b83280' },
  totalSalidas: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#fed7e2',
    alignItems: 'flex-end',
  },
  textoTotal: { fontSize: 14, fontWeight: 'bold', color: '#b83280' },
});
