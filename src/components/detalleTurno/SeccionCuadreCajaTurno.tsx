import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCUP } from '../../utils';
import { estilosSeccion } from './estilosSeccion';

interface Props {
  totalEfectivo: number;
  efectivoReal: number;
  cuadreTexto: string;
  cuadreColor: string;
  cuadreIcono: any;
}

export default function SeccionCuadreCajaTurno({
  totalEfectivo,
  efectivoReal,
  cuadreTexto,
  cuadreColor,
  cuadreIcono,
}: Props) {
  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="receipt-outline" size={20} color="#d69e2e" />
        <Text style={estilosSeccion.tituloSeccion}>Cuadre de caja</Text>
      </View>

      <View style={estilosSeccion.fila}>
        <Text style={estilosSeccion.etiqueta}>Esperado:</Text>
        <Text style={estilosSeccion.valor}>{formatCUP(totalEfectivo)} CUP</Text>
      </View>
      <View style={estilosSeccion.fila}>
        <Text style={estilosSeccion.etiqueta}>Real contado:</Text>
        <Text style={estilosSeccion.valor}>{formatCUP(efectivoReal)} CUP</Text>
      </View>

      <View style={[estilos.resultadoCuadre, { borderColor: cuadreColor }]}>
        <Ionicons name={cuadreIcono} size={18} color={cuadreColor} />
        <Text style={[estilos.textoCuadre, { color: cuadreColor }]}>{cuadreTexto}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  resultadoCuadre: {
    marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1.5,
    backgroundColor: '#f8fafc', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  textoCuadre: { fontSize: 15, fontWeight: 'bold' },
});