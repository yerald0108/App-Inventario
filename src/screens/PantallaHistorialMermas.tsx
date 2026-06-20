// src/screens/PantallaHistorialMermas.tsx
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
  obtenerMermasTurno, actualizarCantidadMerma,
  eliminarMerma, MermaAgrupada, etiquetaMotivo
} from '../database/mermas';
import { useProductos } from '../context/ProductosContext';
import ModalEditarMovimiento from '../components/cierre/ModalEditarMovimiento';
import EstadoVacio from '../components/EstadoVacio';

export default function PantallaHistorialMermas() {
  const [mermas, setMermas] = useState<MermaAgrupada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [itemEditando, setItemEditando] = useState<{
    id: number; nombre_producto: string; cantidad: number;
  } | null>(null);
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
      if (!turno) { setMermas([]); return; }
      const lista = await obtenerMermasTurno(turno.id);
      setMermas(lista);
    } finally {
      setCargando(false);
    }
  }

  async function handleGuardar(cantidad: number, _persona: string | null) {
    if (!itemEditando) return;
    try {
      await actualizarCantidadMerma(itemEditando.id, cantidad);
      setItemEditando(null);
      await cargarProductos();
      await cargar();
      const msg = cantidad <= 0 ? 'Merma eliminada' : 'Merma actualizada';
      Toast.show({ type: cantidad <= 0 ? 'info' : 'success', text1: msg, position: 'top' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message, position: 'top' });
    }
  }

  async function handleEliminar() {
    if (!itemEditando) return;
    try {
      await eliminarMerma(itemEditando.id);
      setItemEditando(null);
      await cargarProductos();
      await cargar();
      Toast.show({ type: 'info', text1: 'Merma eliminada', position: 'top' });
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
          <ActivityIndicator size="large" color="#c05621" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      <View style={estilos.banner}>
        <Ionicons name="trash-outline" size={15} color="#c05621" />
        <Text style={estilos.textoBanner}>
          Toca cualquier item para editarlo o eliminarlo
        </Text>
      </View>

      <FlatList
        data={mermas}
        keyExtractor={(g) => g.grupo_id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item: grupo }) => (
          <View style={estilos.grupo}>
            <View style={estilos.cabeceraGrupo}>
              <View style={estilos.badgeMotivo}>
                <Text style={estilos.textoMotivo}>
                  {etiquetaMotivo(grupo.motivo, grupo.motivo_detalle)}
                </Text>
              </View>
              <Text style={estilos.horaGrupo}>{formatearHora(grupo.fecha_hora)}</Text>
            </View>

            {grupo.items.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={estilos.tarjetaItem}
                onPress={() => setItemEditando({
                  id: item.id,
                  nombre_producto: item.nombre_producto,
                  cantidad: item.cantidad,
                })}
              >
                <View style={estilos.infoItem}>
                  <Text style={estilos.nombreItem} numberOfLines={1}>
                    {item.nombre_producto}
                  </Text>
                </View>
                <View style={estilos.derechaItem}>
                  <Text style={estilos.cantidadItem}>-{item.cantidad} unid.</Text>
                  <Ionicons name="pencil-outline" size={16} color="#a0aec0" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <EstadoVacio
            icono="trash-outline"
            titulo="Sin mermas en este turno"
            descripcion="Las mermas que registres aparecerán aquí."
          />
        }
      />

      <ModalEditarMovimiento
        visible={itemEditando !== null}
        titulo="Editar merma"
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
    backgroundColor: '#fffaf0', borderBottomWidth: 1,
    borderBottomColor: '#fbd38d', paddingHorizontal: 16, paddingVertical: 10,
  },
  textoBanner: { fontSize: 13, color: '#c05621', fontWeight: '600' },
  grupo: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#edf2f7',
  },
  cabeceraGrupo: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  badgeMotivo: {
    backgroundColor: '#fffaf0', borderWidth: 1, borderColor: '#f6ad55',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  textoMotivo: { fontSize: 13, fontWeight: '700', color: '#c05621' },
  horaGrupo: { fontSize: 13, color: '#a0aec0' },
  tarjetaItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#feebc8',
  },
  infoItem: { flex: 1 },
  nombreItem: { fontSize: 15, color: '#1a1a2e', fontWeight: '600' },
  derechaItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cantidadItem: { fontSize: 15, fontWeight: '700', color: '#c05621' },
});