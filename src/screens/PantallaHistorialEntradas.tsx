// src/screens/PantallaHistorialEntradas.tsx
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
  obtenerEntradasTurno, actualizarEntrada,
  eliminarEntrada, EntradaItem
} from '../database/entradas';
import { useProductos } from '../context/ProductosContext';
import ModalEditarMovimiento from '../components/cierre/ModalEditarMovimiento';
import EstadoVacio from '../components/EstadoVacio';

export default function PantallaHistorialEntradas() {
  const [entradas, setEntradas] = useState<EntradaItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [itemEditando, setItemEditando] = useState<EntradaItem | null>(null);
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
      if (!turno) { setEntradas([]); return; }
      const lista = await obtenerEntradasTurno(turno.id);
      setEntradas(lista);
    } finally {
      setCargando(false);
    }
  }

  async function handleGuardar(cantidad: number, _persona: string | null) {
    if (!itemEditando) return;
    if (cantidad <= 0) {
      await handleEliminar();
      return;
    }
    await actualizarEntrada(itemEditando.id, cantidad);
    setItemEditando(null);
    await cargarProductos();
    await cargar();
    Toast.show({ type: 'success', text1: 'Entrada actualizada', position: 'top' });
  }

  async function handleEliminar() {
    if (!itemEditando) return;
    try {
      await eliminarEntrada(itemEditando.id);
      setItemEditando(null);
      await cargarProductos();
      await cargar();
      Toast.show({ type: 'info', text1: 'Entrada eliminada', position: 'top' });
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
          <ActivityIndicator size="large" color="#2b6cb0" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      <View style={estilos.banner}>
        <Ionicons name="download-outline" size={15} color="#2b6cb0" />
        <Text style={estilos.textoBanner}>
          Toca cualquier entrada para editarla o eliminarla
        </Text>
      </View>

      <FlatList
        data={entradas}
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
              <Text style={estilos.horaItem}>{formatearHora(item.fecha_hora)}</Text>
            </View>
            <View style={estilos.derechaItem}>
              <Text style={estilos.cantidadItem}>+{item.cantidad} unid.</Text>
              <Ionicons name="pencil-outline" size={16} color="#a0aec0" />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EstadoVacio
            icono="download-outline"
            titulo="Sin entradas en este turno"
            descripcion="Las entradas que registres aparecerán aquí."
          />
        }
      />

      <ModalEditarMovimiento
        visible={itemEditando !== null}
        titulo="Editar entrada"
        nombreProducto={itemEditando?.nombre_producto ?? ''}
        cantidadActual={itemEditando?.cantidad ?? 0}
        mostrarPersona={false}
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
    backgroundColor: '#ebf8ff', borderBottomWidth: 1,
    borderBottomColor: '#bee3f8', paddingHorizontal: 16, paddingVertical: 10,
  },
  textoBanner: { fontSize: 13, color: '#2b6cb0', fontWeight: '600' },
  tarjeta: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    elevation: 1, borderWidth: 1, borderColor: '#edf2f7',
    borderLeftWidth: 4, borderLeftColor: '#2b6cb0',
  },
  infoItem: { flex: 1 },
  nombreItem: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 },
  horaItem: { fontSize: 13, color: '#a0aec0' },
  derechaItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cantidadItem: { fontSize: 15, fontWeight: '700', color: '#2b6cb0' },
});