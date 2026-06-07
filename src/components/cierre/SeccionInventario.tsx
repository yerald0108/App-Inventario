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

export default function SeccionInventario({ inventario }: Props) {
  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="cube-outline" size={20} color="#805ad5" />
        <Text style={estilosSeccion.tituloSeccion}>Inventario para el próximo turno</Text>
      </View>
      {inventario.map((item, index) => {
        const colorStock = item.existencia < item.alerta_minima ? '#e53e3e' : '#38a169';
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