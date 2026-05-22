import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Turno } from '../types';
import { obtenerTurnosCerrados } from '../database/turnos';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Historial'>;
};

export default function PantallaHistorial({ navigation }: Props) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      cargarHistorial();
    }, [])
  );

  async function cargarHistorial() {
    setCargando(true);
    const lista = await obtenerTurnosCerrados();
    setTurnos(lista);
    setCargando(false);
  }

  // Formatear fecha legible
  function formatearFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleDateString('es-CU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Calcular si el turno cuadró
  function estadoCuadre(turno: Turno): { texto: string; color: string } {
    if (turno.efectivo_real == null || turno.total_esperado_efectivo == null) {
      return { texto: 'Sin datos', color: '#a0aec0' };
    }
    const diferencia = turno.total_esperado_efectivo - turno.efectivo_real;
    if (diferencia === 0) return { texto: 'Cuadrado ✅', color: '#38a169' };
    if (diferencia > 0) return { texto: `Faltante: ${diferencia.toFixed(2)} CUP ⚠️`, color: '#e53e3e' };
    return { texto: `Sobrante: ${Math.abs(diferencia).toFixed(2)} CUP ℹ️`, color: '#d69e2e' };
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

  return (
    <SafeAreaView style={estilos.contenedor}>
      <View style={estilos.encabezado}>
        <Text style={estilos.textoEncabezado}>
          {turnos.length} {turnos.length === 1 ? 'turno cerrado' : 'turnos cerrados'}
        </Text>
      </View>

      <FlatList
        data={turnos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const totalVendido =
            (item.total_esperado_efectivo ?? 0) +
            (item.total_esperado_transferencia ?? 0);
          const cuadre = estadoCuadre(item);

          return (
            <TouchableOpacity
              style={estilos.tarjeta}
              onPress={() => navigation.navigate('DetalleTurno', { turnoId: item.id })}
            >
              <View style={estilos.filaSuperior}>
                <Text style={estilos.fecha}>
                  {item.fecha_cierre ? formatearFecha(item.fecha_cierre) : '—'}
                </Text>
                <Text style={estilos.total}>{totalVendido.toFixed(2)} CUP</Text>
              </View>
              <View style={estilos.filaInferior}>
                <Text style={estilos.textoDetalle}>
                  💵 {(item.total_esperado_efectivo ?? 0).toFixed(2)} · 
                  📱 {(item.total_esperado_transferencia ?? 0).toFixed(2)}
                </Text>
                <Text style={[estilos.estadoCuadre, { color: cuadre.color }]}>
                  {cuadre.texto}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={estilos.centrado}>
            <Text style={estilos.textoVacio}>No hay turnos cerrados aún.</Text>
            <Text style={estilos.textoVacioSub}>Los turnos cerrados aparecerán aquí.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
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
    padding: 40,
  },
  encabezado: {
    backgroundColor: '#1a1a2e',
    padding: 12,
    alignItems: 'center',
  },
  textoEncabezado: {
    color: '#a0aec0',
    fontSize: 14,
  },
  tarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 2,
  },
  filaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fecha: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2b6cb0',
  },
  filaInferior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textoDetalle: {
    fontSize: 13,
    color: '#718096',
    flex: 1,
    marginRight: 8,
  },
  estadoCuadre: {
    fontSize: 13,
    fontWeight: '600',
  },
  textoVacio: {
    fontSize: 18,
    color: '#4a5568',
    marginBottom: 8,
    textAlign: 'center',
  },
  textoVacioSub: {
    fontSize: 14,
    color: '#a0aec0',
    textAlign: 'center',
  },
});