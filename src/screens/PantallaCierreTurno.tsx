import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Alert, ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
  const [salidasFamiliares, setSalidasFamiliares] = useState<{ nombre: string; cantidad: number; fecha_hora: string }[]>([]);
  const [inventario, setInventario] = useState<{ nombre: string; existencia: number; alerta_minima: number }[]>([]);
  const [efectivoReal, setEfectivoReal] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargarResumen();
    }, [])
  );

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
      setSalidasFamiliares(resumen.salidasFamiliares);
      setInventario(resumen.inventario);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el resumen del turno.');
      console.error(error);
    } finally {
      setCargando(false);
    }
  }

  async function handleRefresh() {
    setRefrescando(true);
    await cargarResumen();
    setRefrescando(false);
  }

  // Calcular diferencia entre efectivo esperado y real
  function calcularDiferencia(): { diferencia: number; mensaje: string; color: string; icono: any } | null {
    const real = parseFloat(efectivoReal);
    if (isNaN(real)) return null;
    const diferencia = totalEfectivo - real;
    if (diferencia === 0) return { diferencia: 0, mensaje: 'Caja cuadrada', color: '#38a169', icono: 'checkmark-circle' };
    if (diferencia > 0) return { diferencia, mensaje: `Faltante: ${diferencia.toFixed(2)} CUP`, color: '#e53e3e', icono: 'warning' };
    return { diferencia, mensaje: `Sobrante: ${Math.abs(diferencia).toFixed(2)} CUP`, color: '#d69e2e', icono: 'information-circle' };
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
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#2b6cb0" />
        </View>
      </SafeAreaView>
    );
  }

  const totalGeneral = totalEfectivo + totalTransferencia;
  const resultadoCuadre = calcularDiferencia();

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      <ScrollView 
        style={estilos.scroll} 
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={handleRefresh} tintColor="#2b6cb0" />
        }
      >

      {/* Resumen de ventas */}
      <View style={estilos.seccion}>
        <View style={estilos.cabeceraSeccion}>
          <Ionicons name="stats-chart-outline" size={20} color="#38a169" />
          <Text style={estilos.tituloSeccion}>Resumen de ventas</Text>
          <TouchableOpacity 
            onPress={cargarResumen} 
            style={estilos.botonRefrescar}
            disabled={cargando}
          >
            <Ionicons 
              name="refresh" 
              size={18} 
              color={cargando ? "#cbd5e0" : "#2b6cb0"} 
            />
          </TouchableOpacity>
        </View>

        <View style={estilos.filaResumen}>
          <View style={estilos.filaIcono}>
            <Ionicons name="cash-outline" size={16} color="#718096" />
            <Text style={estilos.etiquetaResumen}>Efectivo:</Text>
          </View>
          <Text style={estilos.valorResumen}>{totalEfectivo.toFixed(2)} CUP</Text>
        </View>
        <View style={estilos.filaResumen}>
          <View style={estilos.filaIcono}>
            <Ionicons name="card-outline" size={16} color="#718096" />
            <Text style={estilos.etiquetaResumen}>Transferencia:</Text>
          </View>
          <Text style={estilos.valorResumen}>{totalTransferencia.toFixed(2)} CUP</Text>
        </View>
        <View style={[estilos.filaResumen, estilos.filaTotal]}>
          <Text style={estilos.etiquetaTotal}>Total general:</Text>
          <Text style={estilos.valorTotal}>{totalGeneral.toFixed(2)} CUP</Text>
        </View>
      </View>

      {/* Cuadre de caja */}
      <View style={estilos.seccion}>
        <View style={estilos.cabeceraSeccion}>
          <Ionicons name="receipt-outline" size={20} color="#d69e2e" />
          <Text style={estilos.tituloSeccion}>Cuadre de caja</Text>
        </View>
        
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
            <View style={estilos.filaResultado}>
              <Ionicons name={resultadoCuadre.icono} size={20} color={resultadoCuadre.color} />
              <Text style={[estilos.textoResultado, { color: resultadoCuadre.color }]}>
                {resultadoCuadre.mensaje}
              </Text>
            </View>
            <Text style={estilos.detalleResultado}>
              Esperado: {totalEfectivo.toFixed(2)} CUP · Real: {parseFloat(efectivoReal).toFixed(2)} CUP
            </Text>
          </View>
        )}
      </View>

      {/* Entradas del turno */}
      {entradas.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="download-outline" size={20} color="#2b6cb0" />
            <Text style={estilos.tituloSeccion}>Entradas del turno</Text>
          </View>
          {entradas.map((entrada, index) => (
            <View key={index} style={estilos.filaEntrada}>
              <Text style={estilos.nombreEntrada}>{entrada.nombre}</Text>
              <Text style={estilos.cantidadEntrada}>+{entrada.cantidad} unid.</Text>
              <Text style={estilos.horaEntrada}>{formatearFecha(entrada.fecha_hora)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Salidas familiares (Bug 9) */}
      {salidasFamiliares.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="people-outline" size={20} color="#ed64a6" />
            <Text style={estilos.tituloSeccion}>Consumo familiar</Text>
          </View>
          {salidasFamiliares.map((salida, index) => (
            <View key={index} style={estilos.filaEntrada}>
              <Text style={estilos.nombreEntrada}>{salida.nombre}</Text>
              <Text style={[estilos.cantidadEntrada, { color: '#ed64a6' }]}>
                -{salida.cantidad} unid.
              </Text>
              <Text style={estilos.horaEntrada}>{formatearFecha(salida.fecha_hora)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Inventario final */}
      <View style={estilos.seccion}>
        <View style={estilos.cabeceraSeccion}>
          <Ionicons name="cube-outline" size={20} color="#805ad5" />
          <Text style={estilos.tituloSeccion}>Inventario para el próximo turno</Text>
        </View>
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
          {procesando ? 'Cerrando turno...' : 'CERRAR TURNO'}
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
  botonRefrescar: {
    padding: 4,
  },
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
  filaResumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filaIcono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etiquetaResumen: {
    fontSize: 14,
    color: '#718096',
  },
  valorResumen: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  filaTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  etiquetaTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  valorTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2b6cb0',
  },
  etiquetaCuadre: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputEfectivo: {
    borderWidth: 1.5,
    borderColor: '#cbd5e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: '#2d3748',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  resultadoCuadre: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#f8fafc',
  },
  filaResultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  textoResultado: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detalleResultado: {
    fontSize: 13,
    color: '#718096',
    marginLeft: 28,
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