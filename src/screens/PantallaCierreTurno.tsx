import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { obtenerTurnoAbierto, obtenerResumenTurno, cerrarTurno } from '../database/turnos';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CierreTurno'>;
};

export default function PantallaCierreTurno({ navigation }: Props) {
  const [cargando, setCargando] = useState(true);
  const [turnoId, setTurnoId] = useState<number | null>(null);
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalTransferencia, setTotalTransferencia] = useState(0);
  const [entradas, setEntradas] = useState<{ nombre: string; cantidad: number; fecha_hora: string }[]>([]);
  const [inventario, setInventario] = useState<{ nombre: string; existencia: number; alerta_minima: number }[]>([]);
  const [efectivoReal, setEfectivoReal] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarResumen();
  }, []);

  async function cargarResumen() {
    setCargando(true);
    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        Alert.alert('Sin turno', 'No hay un turno abierto actualmente.');
        navigation.goBack();
        return;
      }
      setTurnoId(turno.id);
      const resumen = await obtenerResumenTurno(turno.id);
      setTotalEfectivo(resumen.totalEfectivo);
      setTotalTransferencia(resumen.totalTransferencia);
      setEntradas(resumen.entradas);
      setInventario(resumen.inventario);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el resumen del turno.');
      console.error(error);
    } finally {
      setCargando(false);
    }
  }

  // Calcular diferencia entre efectivo esperado y real
  function calcularDiferencia(): { diferencia: number; mensaje: string; color: string } | null {
    const real = parseFloat(efectivoReal);
    if (isNaN(real)) return null;
    const diferencia = totalEfectivo - real;
    if (diferencia === 0) return { diferencia: 0, mensaje: 'Caja cuadrada ✅', color: '#38a169' };
    if (diferencia > 0) return { diferencia, mensaje: `Faltante: ${diferencia.toFixed(2)} CUP ⚠️`, color: '#e53e3e' };
    return { diferencia, mensaje: `Sobrante: ${Math.abs(diferencia).toFixed(2)} CUP ℹ️`, color: '#d69e2e' };
  }

  function handleCerrarTurno() {
    const real = parseFloat(efectivoReal);
    if (isNaN(real) || real < 0) {
      Alert.alert('Error', 'Ingresa el efectivo físico contado para cerrar el turno.');
      return;
    }

    const resultado = calcularDiferencia();

    Alert.alert(
      'Cerrar turno',
      `${resultado?.mensaje}\n\n¿Confirmas el cierre del turno?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar turno', style: 'destructive', onPress: confirmarCierre },
      ]
    );
  }

  async function confirmarCierre() {
    if (!turnoId || procesando) return;
    setProcesando(true);
    try {
      const real = parseFloat(efectivoReal);
      await cerrarTurno(turnoId, totalEfectivo, totalTransferencia, real);
      Alert.alert('✅ Turno cerrado', 'El turno fue cerrado exitosamente.', [
        { text: 'OK', onPress: () => navigation.navigate('Inicio') },
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar el turno.');
      console.error(error);
    } finally {
      setProcesando(false);
    }
  }

  // Formatear fecha legible
  function formatearFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' });
  }

  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedor}>
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#2b6cb0" />
        </View>
      </SafeAreaView>
    );
  }

  const totalGeneral = totalEfectivo + totalTransferencia;
  const resultadoCuadre = calcularDiferencia();

  return (
    <SafeAreaView style={estilos.contenedor}>
      <ScrollView style={estilos.scroll} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Resumen de ventas */}
      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>💰 Resumen de ventas</Text>

        <View style={estilos.filaResumen}>
          <Text style={estilos.etiquetaResumen}>Efectivo:</Text>
          <Text style={estilos.valorResumen}>{totalEfectivo.toFixed(2)} CUP</Text>
        </View>
        <View style={estilos.filaResumen}>
          <Text style={estilos.etiquetaResumen}>Transferencia:</Text>
          <Text style={estilos.valorResumen}>{totalTransferencia.toFixed(2)} CUP</Text>
        </View>
        <View style={[estilos.filaResumen, estilos.filaTotal]}>
          <Text style={estilos.etiquetaTotal}>Total general:</Text>
          <Text style={estilos.valorTotal}>{totalGeneral.toFixed(2)} CUP</Text>
        </View>
      </View>

      {/* Cuadre de caja */}
      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>🧾 Cuadre de caja</Text>
        <Text style={estilos.etiquetaCuadre}>Efectivo físico contado (CUP)</Text>
        <TextInput
          style={estilos.inputEfectivo}
          value={efectivoReal}
          onChangeText={setEfectivoReal}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor="#a0aec0"
        />

        {resultadoCuadre && (
          <View style={[estilos.resultadoCuadre, { borderColor: resultadoCuadre.color }]}>
            <Text style={[estilos.textoResultado, { color: resultadoCuadre.color }]}>
              {resultadoCuadre.mensaje}
            </Text>
            <Text style={estilos.detalleResultado}>
              Esperado: {totalEfectivo.toFixed(2)} CUP · Real: {parseFloat(efectivoReal).toFixed(2)} CUP
            </Text>
          </View>
        )}
      </View>

      {/* Entradas del turno */}
      {entradas.length > 0 && (
        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>📥 Entradas del turno</Text>
          {entradas.map((entrada, index) => (
            <View key={index} style={estilos.filaEntrada}>
              <Text style={estilos.nombreEntrada}>{entrada.nombre}</Text>
              <Text style={estilos.cantidadEntrada}>+{entrada.cantidad} unid.</Text>
              <Text style={estilos.horaEntrada}>{formatearFecha(entrada.fecha_hora)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Inventario final */}
      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>📦 Inventario para el próximo turno</Text>
        {inventario.map((item, index) => {
          const colorStock = item.existencia < item.alerta_minima ? '#e53e3e' : '#38a169';
          return (
            <View key={index} style={estilos.filaInventario}>
              <Text style={estilos.nombreInventario} numberOfLines={1}>{item.nombre}</Text>
              <Text style={[estilos.stockInventario, { color: colorStock }]}>
                {item.existencia} unid.
              </Text>
            </View>
          );
        })}
      </View>

      {/* Botón cerrar turno */}
      <TouchableOpacity
        style={[estilos.botonCerrar, procesando && estilos.botonDeshabilitado]}
        onPress={handleCerrarTurno}
        disabled={procesando}
      >
        <Text style={estilos.textoBotonCerrar}>
          {procesando ? 'Cerrando turno...' : '🔒 CERRAR TURNO'}
        </Text>
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  seccion: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    elevation: 2,
  },
  tituloSeccion: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 14,
  },
  filaResumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  etiquetaResumen: {
    fontSize: 16,
    color: '#4a5568',
  },
  valorResumen: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  filaTotal: {
    borderBottomWidth: 0,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
  },
  etiquetaTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  valorTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2b6cb0',
  },
  etiquetaCuadre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  inputEfectivo: {
    borderWidth: 1.5,
    borderColor: '#cbd5e0',
    borderRadius: 10,
    padding: 14,
    fontSize: 24,
    color: '#1a1a2e',
    backgroundColor: '#f7fafc',
    textAlign: 'center',
  },
  resultadoCuadre: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  textoResultado: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detalleResultado: {
    fontSize: 13,
    color: '#718096',
  },
  filaEntrada: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    gap: 8,
  },
  nombreEntrada: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a2e',
  },
  cantidadEntrada: {
    fontSize: 15,
    fontWeight: '600',
    color: '#38a169',
  },
  horaEntrada: {
    fontSize: 13,
    color: '#a0aec0',
    width: 48,
    textAlign: 'right',
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
  botonCerrar: {
    backgroundColor: '#e53e3e',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginTop: 20,
    alignItems: 'center',
    elevation: 3,
  },
  botonDeshabilitado: {
    backgroundColor: '#a0aec0',
  },
  textoBotonCerrar: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});