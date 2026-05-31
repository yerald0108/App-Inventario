import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { estilosSeccion } from './estilosSeccion';
import { ItemInventario } from '../../hooks/useDetalleTurno';

interface Props {
  inventario: ItemInventario[];
}

export default function SeccionInventarioInicialTurno({ inventario }: Props) {
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
          <View key={index} style={estilos.filaInventario}>
            <Text style={estilos.nombreInventario} numberOfLines={1}>
              {item.nombre}
            </Text>
            <Text style={[estilos.stockInventario, { color: colorStock }]}>
              {item.existencia} unid.
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  filaInventario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  nombreInventario: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a2e',
    marginRight: 8,
  },
  stockInventario: {
    fontSize: 15,
    fontWeight: '600',
  },
});