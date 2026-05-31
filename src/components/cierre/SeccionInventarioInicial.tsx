import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    <View style={estilos.seccion}>
      <View style={estilos.cabeceraSeccion}>
        <Ionicons name="archive-outline" size={20} color="#2b6cb0" />
        <Text style={estilos.tituloSeccion}>Inventario al inicio del turno</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingBottom: 8,
  },
  tituloSeccion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    flex: 1,
  },
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