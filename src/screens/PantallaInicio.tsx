import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { obtenerTurnoAbierto } from '../database/turnos';
import { Turno } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Inicio'>;
};

export default function PantallaInicio({ navigation }: Props) {
  const [turnoActual, setTurnoActual] = useState<Turno | null>(null);

  useFocusEffect(
    useCallback(() => {
      obtenerTurnoAbierto().then(setTurnoActual).catch(console.error);
    }, [])
  );

  function formatearFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-CU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <View style={estilos.inner}>
        <Text style={estilos.titulo}>MiCaja</Text>

        <View style={[
          estilos.indicadorTurno,
          turnoActual ? estilos.turnoAbierto : estilos.turnoCerrado
        ]}>
          <Text style={estilos.textoIndicador}>
            {turnoActual
              ? `🟢 Turno desde ${formatearFecha(turnoActual.fecha_inicio)}`
              : '🔴 Sin turno abierto'}
          </Text>
        </View>

        <TouchableOpacity style={[estilos.boton, estilos.botonVenta]} onPress={() => navigation.navigate('Venta')}>
          <Text style={estilos.textoBoton}>🛒 NUEVA VENTA</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[estilos.boton, estilos.botonEntrada]} onPress={() => navigation.navigate('Entrada')}>
          <Text style={estilos.textoBoton}>📥 ENTRADA MERCANCÍA</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[estilos.boton, estilos.botonUltimasVentas]} onPress={() => navigation.navigate('UltimasVentas')}>
          <Text style={estilos.textoBoton}>🧾 ÚLTIMAS VENTAS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[estilos.boton, estilos.botonInventario]} onPress={() => navigation.navigate('Inventario')}>
          <Text style={estilos.textoBoton}>📦 INVENTARIO</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[estilos.boton, estilos.botonHistorial]} onPress={() => navigation.navigate('Historial')}>
          <Text style={estilos.textoBoton}>📊 HISTORIAL</Text>
        </TouchableOpacity>

        {turnoActual && (
          <TouchableOpacity style={[estilos.boton, estilos.botonCerrar]} onPress={() => navigation.navigate('CierreTurno')}>
            <Text style={estilos.textoBoton}>🔒 CERRAR TURNO</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f0f4f8' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  titulo: { fontSize: 36, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  indicadorTurno: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 8 },
  turnoAbierto: { backgroundColor: '#c6f6d5' },
  turnoCerrado: { backgroundColor: '#fed7d7' },
  textoIndicador: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
  boton: { borderRadius: 14, padding: 18, width: '100%', alignItems: 'center', elevation: 3 },
  botonVenta: { backgroundColor: '#38a169' },
  botonEntrada: { backgroundColor: '#d69e2e' },
  botonUltimasVentas: { backgroundColor: '#805ad5' },
  botonInventario: { backgroundColor: '#2b6cb0' },
  botonHistorial: { backgroundColor: '#4a5568' },
  botonCerrar: { backgroundColor: '#e53e3e' },
  textoBoton: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});