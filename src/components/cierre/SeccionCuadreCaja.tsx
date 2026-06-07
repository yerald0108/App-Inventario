import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { estilosSeccion } from '../shared/estilosSeccion';
import { ResultadoCuadre } from '../../hooks/useCierreTurno';
import { formatCUP } from '../../utils';

interface Props {
  efectivoReal: string;
  totalEfectivo: number;
  resultadoCuadre: ResultadoCuadre | null;
  onCambioEfectivo: (texto: string) => void;
  onBlurEfectivo: () => void;
}

export default function SeccionCuadreCaja({
  efectivoReal,
  totalEfectivo,
  resultadoCuadre,
  onCambioEfectivo,
  onBlurEfectivo,
}: Props) {
  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="receipt-outline" size={20} color="#d69e2e" />
        <Text style={estilosSeccion.tituloSeccion}>Cuadre de caja</Text>
      </View>

      <Text style={estilos.etiquetaCuadre}>Efectivo físico contado (CUP)</Text>
      <TextInput
        style={[
          estilos.inputEfectivo,
          efectivoReal !== '' && !isNaN(parseFloat(efectivoReal)) && {
            borderColor:
              resultadoCuadre?.diferencia === 0
                ? '#38a169'
                : (resultadoCuadre?.diferencia ?? 0) > 0
                ? '#e53e3e'
                : '#d69e2e',
          },
        ]}
        value={efectivoReal}
        onChangeText={onCambioEfectivo}
        onBlur={onBlurEfectivo}
        keyboardType="numeric"
        placeholder="0.00"
        placeholderTextColor="#a0aec0"
      />

      {resultadoCuadre && (
        <View style={[estilos.resultadoCuadre, { borderColor: resultadoCuadre.color }]}>
          <View style={estilos.filaResultado}>
            <Ionicons name={resultadoCuadre.icono} size={20} color={resultadoCuadre.color} />
            <Text style={[estilos.textoResultado, { color: resultadoCuadre.color }]}>
              {resultadoCuadre.mensaje}
            </Text>
          </View>
          <Text style={estilos.detalleResultado}>
            Esperado: {formatCUP(totalEfectivo)} CUP · Real: {formatCUP(parseFloat(efectivoReal))} CUP
          </Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  etiquetaCuadre: { fontSize: 14, color: '#4a5568', marginBottom: 8, fontWeight: '600' },
  inputEfectivo: {
    borderWidth: 1.5, borderColor: '#cbd5e0', borderRadius: 12,
    padding: 14, fontSize: 18, color: '#2d3748',
    backgroundColor: '#f8fafc', marginBottom: 16,
  },
  resultadoCuadre: {
    padding: 16, borderRadius: 12, borderWidth: 1.5, backgroundColor: '#f8fafc',
  },
  filaResultado: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  textoResultado: { fontSize: 16, fontWeight: 'bold' },
  detalleResultado: { fontSize: 13, color: '#718096', marginLeft: 28 },
});