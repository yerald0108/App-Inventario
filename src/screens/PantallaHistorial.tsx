import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { Turno } from '../types';
import { obtenerTurnosCerrados } from '../database/turnos';
import { obtenerTotalesExternosPorTurnos } from '../database/despachos';
import { SkeletonTurno } from '../components/Skeleton';
import EstadoVacio from '../components/EstadoVacio';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Historial'>;
};

const PAGE_SIZE = 20;

export default function PantallaHistorial({ navigation }: Props) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [totalesExternos, setTotalesExternos] = useState<Map<number, number>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas] = useState(true);
  const [filtroMes, setFiltroMes] = useState<number | null>(null);
  const [filtroAnio, setFiltroAnio] = useState<number | null>(null);

  // Usamos un ref para el offset para evitar closures obsoletos en onEndReached
  const offsetRef = useRef(0);

  // ── Años disponibles (calculados sobre los turnos ya cargados) ──────────
  const aniosDisponibles = useMemo(() => {
    const set = new Set<number>();
    turnos.forEach(t => {
      if (t.fecha_cierre) set.add(new Date(t.fecha_cierre).getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [turnos]);

  // ── Carga inicial (o al volver a la pantalla) ───────────────────────────
  useFocusEffect(
    useCallback(() => {
      cargarDesdeElPrincipio();
    }, [])
  );

  async function cargarDesdeElPrincipio() {
    setCargando(true);
    setHayMas(true);
    offsetRef.current = 0;

    const lista = await obtenerTurnosCerrados(PAGE_SIZE, 0);
    const ids = lista.map(t => t.id);
    const mapaExternos = await obtenerTotalesExternosPorTurnos(ids);

    setTurnos(lista);
    setTotalesExternos(mapaExternos);
    offsetRef.current = lista.length;
    setHayMas(lista.length === PAGE_SIZE);
    setCargando(false);
  }

  // ── Cargar página siguiente ─────────────────────────────────────────────
  async function cargarMas() {
    if (cargandoMas || !hayMas) return;
    setCargandoMas(true);

    const siguientePagina = await obtenerTurnosCerrados(PAGE_SIZE, offsetRef.current);

    if (siguientePagina.length > 0) {
      const ids = siguientePagina.map(t => t.id);
      const mapaExternos = await obtenerTotalesExternosPorTurnos(ids);

      setTurnos(prev => [...prev, ...siguientePagina]);
      setTotalesExternos(prev => {
        const nuevo = new Map(prev);
        mapaExternos.forEach((v, k) => nuevo.set(k, v));
        return nuevo;
      });
      offsetRef.current += siguientePagina.length;
    }

    setHayMas(siguientePagina.length === PAGE_SIZE);
    setCargandoMas(false);
  }

  // ── Filtrado local sobre los turnos ya cargados ─────────────────────────
  const turnosFiltrados = useMemo(() => {
    if (filtroMes === null && filtroAnio === null) return turnos;
    return turnos.filter(t => {
      if (!t.fecha_cierre) return false;
      const f = new Date(t.fecha_cierre);
      const mesOk  = filtroMes  === null || f.getMonth()     === filtroMes;
      const anioOk = filtroAnio === null || f.getFullYear()  === filtroAnio;
      return mesOk && anioOk;
    });
  }, [turnos, filtroMes, filtroAnio]);

  // ── Helpers de formato ──────────────────────────────────────────────────
  function formatearFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  function calcularDuracion(inicio: string, cierre: string | null): string {
    if (!cierre) return '';
    const diffMin = Math.floor(
      (new Date(cierre).getTime() - new Date(inicio).getTime()) / 60000
    );
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return h === 0 ? `${m} min` : `${h} h ${m} min`;
  }

  function estadoCuadre(turno: Turno): { texto: string; color: string; icono: any } {
    if (turno.efectivo_real == null || turno.total_esperado_efectivo == null) {
      return { texto: 'Sin datos', color: '#a0aec0', icono: 'help-circle' };
    }
    const diferencia = turno.total_esperado_efectivo - turno.efectivo_real;
    if (diferencia === 0)
      return { texto: 'Cuadrado', color: '#38a169', icono: 'checkmark-circle' };
    if (diferencia > 0)
      return { texto: `Faltante: ${diferencia.toFixed(2)} CUP`, color: '#e53e3e', icono: 'warning' };
    return {
      texto: `Sobrante: ${Math.abs(diferencia).toFixed(2)} CUP`,
      color: '#d69e2e',
      icono: 'information-circle',
    };
  }

  // ── Footer de la lista ──────────────────────────────────────────────────
  function renderFooter() {
    if (!cargandoMas) return null;
    return (
      <View style={estilos.footerCarga}>
        <ActivityIndicator size="small" color="#2b6cb0" />
        <Text style={estilos.textoFooterCarga}>Cargando más turnos...</Text>
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4].map(i => <SkeletonTurno key={i} />)}
    </View>
  );

  const mesesConTurnos = useMemo(() =>
    Array.from(
      new Set(
        turnos
          .filter(t => t.fecha_cierre)
          .map(t => new Date(t.fecha_cierre!).getMonth())
      )
    ).sort((a, b) => a - b),
  [turnos]);

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
              {hayMas && filtroMes === null && filtroAnio === null
                ? ' (mostrando primeros)'
                : ''}
            </Text>
          </View>

          {/* Filtros */}
          <View style={estilos.contenedorFiltros}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.scrollChips}
            >
              <TouchableOpacity
                style={[estilos.chip, filtroMes === null && estilos.chipActivo]}
                onPress={() => setFiltroMes(null)}
              >
                <Text style={[estilos.textoChip, filtroMes === null && estilos.textoChipActivo]}>
                  Todos
                </Text>
              </TouchableOpacity>

              {mesesConTurnos.map(mes => (
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
          keyExtractor={item => item.id.toString()}
          onEndReached={
            // Solo paginar si no hay filtros activos; con filtros
            // trabajamos sobre los datos ya cargados
            filtroMes === null && filtroAnio === null ? cargarMas : undefined
          }
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          renderItem={({ item }) => {
            const totalPropio =
              (item.total_esperado_efectivo ?? 0) +
              (item.total_esperado_transferencia ?? 0);
            const totalExterno = totalesExternos.get(item.id) ?? 0;
            const totalVendido = totalPropio + totalExterno;
            const cuadre = estadoCuadre(item);
            const duracion = calcularDuracion(item.fecha_inicio, item.fecha_cierre);

            return (
              <TouchableOpacity
                style={estilos.tarjeta}
                onPress={() => navigation.navigate('DetalleTurno', {
                  turnoId: item.id,
                  fechaCierre: item.fecha_cierre ?? undefined,
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
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={estilos.total}>{totalVendido.toFixed(2)} CUP</Text>
                    {totalExterno > 0 && (
                      <Text style={estilosLocal.desgloseTotal}>
                        {totalPropio.toFixed(2)} propio · {totalExterno.toFixed(2)} ext.
                      </Text>
                    )}
                  </View>
                </View>

                <View style={estilos.filaInferior}>
                  <View style={estilos.metodosPago}>
                    <Ionicons name="cash-outline" size={14} color="#718096" />
                    <Text style={estilos.textoDetalle}>
                      {(item.total_esperado_efectivo ?? 0).toFixed(2)}
                    </Text>
                    <Text style={estilos.separador}>·</Text>
                    <Ionicons name="card-outline" size={14} color="#718096" />
                    <Text style={estilos.textoDetalle}>
                      {(item.total_esperado_transferencia ?? 0).toFixed(2)}
                    </Text>
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
  encabezado: {
    backgroundColor: '#1a1a2e', padding: 12, alignItems: 'center',
  },
  textoEncabezado: { fontSize: 14, color: '#a0aec0', fontWeight: '600' },
  contenedorFiltros: { paddingBottom: 4 },
  scrollChips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  chipActivo: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  textoChip: { fontSize: 14, color: '#4a5568', fontWeight: '600' },
  textoChipActivo: { color: '#ffffff' },
  tarjeta: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 12,
    padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#edf2f7',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  filaSuperior: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12,
  },
  fecha: { fontSize: 15, fontWeight: '700', color: '#2d3748' },
  filaDuracion: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  textoDuracion: { fontSize: 12, color: '#a0aec0', fontWeight: '500' },
  total: { fontSize: 16, fontWeight: '900', color: '#1a1a2e' },
  filaInferior: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f7fafc',
  },
  metodosPago: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  textoDetalle: { fontSize: 13, color: '#718096', fontWeight: '500' },
  separador: { marginHorizontal: 4, color: '#cbd5e0' },
  contenedorEstado: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  estadoCuadre: { fontSize: 13, fontWeight: '700' },
  footerCarga: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 20,
  },
  textoFooterCarga: { fontSize: 14, color: '#718096' },
});

const estilosLocal = StyleSheet.create({
  desgloseTotal: {
    fontSize: 11, color: '#a0aec0', marginTop: 2, fontStyle: 'italic',
  },
});