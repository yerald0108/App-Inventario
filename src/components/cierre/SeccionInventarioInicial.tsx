import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { estilosSeccion } from '../shared/estilosSeccion';

interface ItemInventario {
  nombre: string;
  existencia: number;
  alerta_minima: number;
}

interface Props {
  inventario: ItemInventario[];
}

export default function SeccionInventarioInicial({ inventario }: Props) {
  if (inventario.length === 0) return null;

  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="archive-outline" size={20} color="#2b6cb0" />
        <Text style={estilosSeccion.tituloSeccion}>Inventario al inicio del turno</Text>
      </View>
      {inventario.map((item, index) => {
        const colorStock =
          item.existencia < item.alerta_minima ? '#e53e3e' : '#38a169';
        return (
          <View key={index} style={estilosSeccion.filaInventario}>
            <Text style={estilosSeccion.nombreInventario} numberOfLines={1}>
              {item.nombre}
            </Text>
            <Text style={[estilosSeccion.stockInventario, { color: colorStock }]}>
              {item.existencia} unid.
            </Text>
          </View>
        );
      })}
    </View>
  );
}