import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { Turno } from '../types';
import { obtenerTurnosCerrados } from '../database/turnos';
import Skeleton, { SkeletonTurno } from '../components/Skeleton';
import EstadoVacio from '../components/EstadoVacio';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Historial'>;
};

export default function PantallaHistorial({ navigation }: Props) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

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

  // Calcular duración del turno (Task 7)
  function calcularDuracion(inicio: string, cierre: string | null): string {
    if (!cierre) return '';
    const dInicio = new Date(inicio);
    const dCierre = new Date(cierre);
    const diffMs = dCierre.getTime() - dInicio.getTime();
    
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours === 0) return `${mins} min`;
    return `${hours} h ${mins} min`;
  }

  const turnosFiltrados = filtroBusqueda.trim() === ''
    ? turnos
    : turnos.filter(turno => {
        if (!turno.fecha_cierre) return false;
        const fecha = new Date(turno.fecha_cierre);
        // Busca en formato dd/mm/yyyy — permite buscar "05/2025", "12/05", etc.
        const fechaTexto = fecha.toLocaleDateString('es-CU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        return fechaTexto.includes(filtroBusqueda.trim());
      });

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
        <SkeletonTurno key={i} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      {!cargando && (
        <>
          <View style={estilos.encabezado}>
            <Text style={estilos.textoEncabezado}>
              {turnosFiltrados.length} {turnosFiltrados.length === 1 ? 'turno' : 'turnos'}
              {filtroBusqueda !== '' ? ` para "${filtroBusqueda}"` : ' cerrados'}
            </Text>
          </View>
          <View style={estilos.contenedorFiltro}>
            <Ionicons name="calendar-outline" size={18} color="#718096" />
            <TextInput
              style={estilos.inputFiltro}
              placeholder="Filtrar por fecha (ej: 05/2025)"
              placeholderTextColor="#a0aec0"
              value={filtroBusqueda}
              onChangeText={setFiltroBusqueda}
              keyboardType="numeric"
            />
            {filtroBusqueda !== '' && (
              <TouchableOpacity onPress={() => setFiltroBusqueda('')}>
                <Ionicons name="close-circle" size={20} color="#a0aec0" />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {cargando ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={turnosFiltrados}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const totalVendido =
              (item.total_esperado_efectivo ?? 0) +
              (item.total_esperado_transferencia ?? 0);
            const cuadre = estadoCuadre(item);
            const duracion = calcularDuracion(item.fecha_inicio, item.fecha_cierre);

            return (
              <TouchableOpacity
                style={estilos.tarjeta}
                onPress={() => navigation.navigate('DetalleTurno', { 
                  turnoId: item.id,
                  fechaCierre: item.fecha_cierre ?? undefined
                })}
              >
                <View style={estilos.filaSuperior}>
                  <View>
                    <Text style={estilos.fecha}>
                      {item.fecha_cierre ? formatearFecha(item.fecha_cierre) : '—'}
                    </Text>
                    {duracion !== '' && (
                      <View style={estilos.filaDuracion}>
                        <Ionicons name="time-outline" size={12} color="#a0aec0" />
                        <Text style={estilos.textoDuracion}>Duración: {duracion}</Text>
                      </View>
                    )}
                  </View>
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
  filaDuracion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  textoDuracion: {
    fontSize: 12,
    color: '#a0aec0',
    fontWeight: '500',
  },
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
  contenedorFiltro: {
  flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    gap: 8,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputFiltro: {
    flex: 1,
    fontSize: 15,
    color: '#2d3748',
  },
});