import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { obtenerTurnoAbierto } from '../database/turnos';
import {
  obtenerSalidasFamiliaresTurno,
  actualizarSalidaFamiliar,
  eliminarSalidaFamiliar,
  SalidaFamiliarItem
} from '../database/salidas_familiares';
import { useProductos } from '../context/ProductosContext';
import ModalEditarMovimiento from '../components/cierre/ModalEditarMovimiento';
import EstadoVacio from '../components/EstadoVacio';

export default function PantallaHistorialSalidasFamiliares() {
  const [salidas, setSalidas] = useState<SalidaFamiliarItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [itemEditando, setItemEditando] = useState<SalidaFamiliarItem | null>(null);
  const { cargarProductos } = useProductos();

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [])
  );

  async function cargar() {
    setCargando(true);
    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) { setSalidas([]); return; }
      const lista = await obtenerSalidasFamiliaresTurno(turno.id);
      setSalidas(lista);
    } finally {
      setCargando(false);
    }
  }

  async function handleGuardar(cantidad: number, persona: string | null) {
    if (!itemEditando) return;
    if (cantidad <= 0) {
      await handleEliminar();
      return;
    }
    await actualizarSalidaFamiliar(itemEditando.id, cantidad, persona);
    setItemEditando(null);
    await cargarProductos();
    await cargar();
    Toast.show({ type: 'success', text1: 'Salida actualizada', position: 'top' });
  }

  async function handleEliminar() {
    if (!itemEditando) return;
    try {
      await eliminarSalidaFamiliar(itemEditando.id);
      setItemEditando(null);
      await cargarProductos();
      await cargar();
      Toast.show({ type: 'info', text1: 'Salida eliminada', position: 'top' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message, position: 'top' });
    }
  }

  function formatearHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CU', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#ed64a6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      <View style={estilos.banner}>
        <Ionicons name="people-outline" size={15} color="#ed64a6" />
        <Text style={estilos.textoBanner}>
          Toca cualquier salida para editarla o eliminarla
        </Text>
      </View>

      <FlatList
        data={salidas}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={estilos.tarjeta}
            onPress={() => setItemEditando(item)}
          >
            <View style={estilos.infoItem}>
              <Text style={estilos.nombreItem} numberOfLines={1}>
                {item.nombre_producto}
              </Text>
              {item.persona && (
                <Text style={estilos.personaItem}>
                  👤 {item.persona}
                </Text>
              )}
              <Text style={estilos.horaItem}>{formatearHora(item.fecha_hora)}</Text>
            </View>
            <View style={estilos.derechaItem}>
              <Text style={estilos.cantidadItem}>-{item.cantidad} unid.</Text>
              <Ionicons name="pencil-outline" size={16} color="#a0aec0" />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EstadoVacio
            icono="people-outline"
            titulo="Sin salidas familiares en este turno"
            descripcion="Las salidas que registres aparecerán aquí."
          />
        }
      />

      <ModalEditarMovimiento
        visible={itemEditando !== null}
        titulo="Editar salida familiar"
        nombreProducto={itemEditando?.nombre_producto ?? ''}
        cantidadActual={itemEditando?.cantidad ?? 0}
        mostrarPersona={true}
        personaActual={itemEditando?.persona ?? null}
        onGuardar={handleGuardar}
        onEliminar={handleEliminar}
        onCancelar={() => setItemEditando(null)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f7fafc' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff5f7', borderBottomWidth: 1,
    borderBottomColor: '#fed7e2', paddingHorizontal: 16, paddingVertical: 10,
  },
  textoBanner: { fontSize: 13, color: '#ed64a6', fontWeight: '600' },
  tarjeta: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    elevation: 1, borderWidth: 1, borderColor: '#edf2f7',
    borderLeftWidth: 4, borderLeftColor: '#ed64a6',
  },
  infoItem: { flex: 1 },
  nombreItem: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 },
  personaItem: { fontSize: 13, color: '#ed64a6', fontWeight: '600', marginBottom: 2 },
  horaItem: { fontSize: 13, color: '#a0aec0' },
  derechaItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cantidadItem: { fontSize: 15, fontWeight: '700', color: '#ed64a6' },
});