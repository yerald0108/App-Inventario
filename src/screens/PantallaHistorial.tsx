import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { Turno } from '../types';
import { obtenerTurnosCerrados } from '../database/turnos';
import Skeleton from '../components/Skeleton';
import EstadoVacio from '../components/EstadoVacio';

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
    if (turnos.length === 0) setCargando(true);
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
  function estadoCuadre(turno: Turno): { texto: string; color: string; icono: any } {
    if (turno.efectivo_real == null || turno.total_esperado_efectivo == null) {
      return { texto: 'Sin datos', color: '#a0aec0', icono: 'help-circle' };
    }
    const diferencia = turno.total_esperado_efectivo - turno.efectivo_real;
    if (diferencia === 0) return { texto: 'Cuadrado', color: '#38a169', icono: 'checkmark-circle' };
    if (diferencia > 0) return { texto: `Faltante: ${diferencia.toFixed(2)} CUP`, color: '#e53e3e', icono: 'warning' };
    return { texto: `Sobrante: ${Math.abs(diferencia).toFixed(2)} CUP`, color: '#d69e2e', icono: 'information-circle' };
  }

  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={estilos.skeletonCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            <Skeleton width="40%" height={20} />
            <Skeleton width="30%" height={20} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f7fafc' }}>
            <Skeleton width="40%" height={15} />
            <Skeleton width="30%" height={15} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      {!cargando && (
        <View style={estilos.encabezado}>
          <Text style={estilos.textoEncabezado}>
            {turnos.length} {turnos.length === 1 ? 'turno cerrado' : 'turnos cerrados'}
          </Text>
        </View>
      )}

      {cargando ? (
        renderSkeleton()
      ) : (
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
                  <View style={estilos.metodosPago}>
                    <Ionicons name="cash-outline" size={14} color="#718096" />
                    <Text style={estilos.textoDetalle}>{(item.total_esperado_efectivo ?? 0).toFixed(2)}</Text>
                    <Text style={estilos.separador}>·</Text>
                    <Ionicons name="card-outline" size={14} color="#718096" />
                    <Text style={estilos.textoDetalle}>{(item.total_esperado_transferencia ?? 0).toFixed(2)}</Text>
                  </View>
                  <View style={estilos.contenedorEstado}>
                    <Ionicons name={cuadre.icono} size={14} color={cuadre.color} />
                    <Text style={[estilos.estadoCuadre, { color: cuadre.color }]}>
                      {cuadre.texto}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EstadoVacio 
              icono="calendar-outline" 
              titulo="Historial vacío" 
              descripcion="Aquí aparecerán los turnos una vez que los hayas cerrado." 
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f7fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  encabezado: { 
    backgroundColor: '#1a1a2e', 
    padding: 12, 
    alignItems: 'center' 
  },
  textoEncabezado: { 
    fontSize: 14, 
    color: '#a0aec0', 
    fontWeight: '600' 
  },
  tarjeta: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edf2f7',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filaSuperior: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  fecha: { fontSize: 15, fontWeight: '700', color: '#2d3748' },
  total: { fontSize: 16, fontWeight: '900', color: '#1a1a2e' },
  filaInferior: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f7fafc'
  },
  metodosPago: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  textoDetalle: { fontSize: 13, color: '#718096', fontWeight: '500' },
  separador: { marginHorizontal: 4, color: '#cbd5e0' },
  contenedorEstado: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  estadoCuadre: { fontSize: 13, fontWeight: '700' },
  textoVacio: { fontSize: 16, color: '#a0aec0', textAlign: 'center' },
  skeletonCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
});