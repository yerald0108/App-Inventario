import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ScrollView
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
  const [filtroMes, setFiltroMes] = useState<number | null>(null);   // 0-11 (como Date)
  const [filtroAnio, setFiltroAnio] = useState<number | null>(null);
  const [selectorVisible, setSelectorVisible] = useState(false);

  // Obtener años disponibles dinámicamente de los turnos
  const aniosDisponibles = useMemo(() => {
    const set = new Set<number>();
    turnos.forEach(t => {
      if (t.fecha_cierre) set.add(new Date(t.fecha_cierre).getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a); // más reciente primero
  }, [turnos]);

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

  // Calcular duración del turno
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

  // Filtrar turnos por mes y año
  const turnosFiltrados = (filtroMes === null && filtroAnio === null)
    ? turnos
    : turnos.filter(turno => {
        if (!turno.fecha_cierre) return false;
        const fecha = new Date(turno.fecha_cierre);
        const mesCoincide = filtroMes === null || fecha.getMonth() === filtroMes;
        const anioCoincide = filtroAnio === null || fecha.getFullYear() === filtroAnio;
        return mesCoincide && anioCoincide;
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
              {(filtroMes !== null || filtroAnio !== null)
                ? ` · ${filtroMes !== null
                    ? new Date(2000, filtroMes).toLocaleString('es-CU', { month: 'long' })
                    : ''}${filtroMes !== null && filtroAnio !== null ? ' ' : ''}${filtroAnio ?? ''}`
                : ' cerrados'}
            </Text>
          </View>
          
          {/* Filtros por mes y año */}
          <View style={estilos.contenedorFiltros}>
            {/* Chips de mes */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.scrollChips}
            >
              {/* Chip "Todos" para limpiar el filtro de mes */}
              <TouchableOpacity
                style={[estilos.chip, filtroMes === null && estilos.chipActivo]}
                onPress={() => setFiltroMes(null)}
              >
                <Text style={[estilos.textoChip, filtroMes === null && estilos.textoChipActivo]}>
                  Todos
                </Text>
              </TouchableOpacity>

              {/* Chips de meses que tienen turnos */}
              {Array.from(
                new Set(
                  turnos
                    .filter(t => t.fecha_cierre)
                    .map(t => new Date(t.fecha_cierre!).getMonth())
                )
              )
                .sort((a, b) => a - b)
                .map(mes => (
                  <TouchableOpacity
                    key={mes}
                    style={[estilos.chip, filtroMes === mes && estilos.chipActivo]}
                    onPress={() => setFiltroMes(filtroMes === mes ? null : mes)}
                  >
                    <Text style={[estilos.textoChip, filtroMes === mes && estilos.textoChipActivo]}>
                      {new Date(2000, mes).toLocaleString('es-CU', { month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Chips de año */}
            {aniosDisponibles.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={estilos.scrollChips}
              >
                <TouchableOpacity
                  style={[estilos.chip, filtroAnio === null && estilos.chipActivo]}
                  onPress={() => setFiltroAnio(null)}
                >
                  <Text style={[estilos.textoChip, filtroAnio === null && estilos.textoChipActivo]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {aniosDisponibles.map(anio => (
                  <TouchableOpacity
                    key={anio}
                    style={[estilos.chip, filtroAnio === anio && estilos.chipActivo]}
                    onPress={() => setFiltroAnio(filtroAnio === anio ? null : anio)}
                  >
                    <Text style={[estilos.textoChip, filtroAnio === anio && estilos.textoChipActivo]}>
                      {anio}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
  contenedorFiltros: {
    paddingBottom: 4,
  },
  scrollChips: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  chipActivo: {
    backgroundColor: '#1a1a2e',
    borderColor: '#1a1a2e',
  },
  textoChip: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '600',
  },
  textoChipActivo: {
    color: '#ffffff',
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
});