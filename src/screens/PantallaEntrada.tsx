import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, TextInput, Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Producto } from '../types';
import { obtenerProductos } from '../database/productos';
import { registrarEntrada } from '../database/entradas';
import { obtenerOCrearTurno } from '../database/turnos';

export default function PantallaEntrada() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargarProductos();
    }, [])
  );

  async function cargarProductos() {
    setCargando(true);
    const lista = await obtenerProductos();
    setProductos(lista);
    setCargando(false);
  }

  function abrirModal(producto: Producto) {
    setProductoSeleccionado(producto);
    setCantidad('');
    setModalVisible(true);
  }

  function cerrarModal() {
    setModalVisible(false);
    setProductoSeleccionado(null);
    setCantidad('');
  }

  async function confirmarEntrada() {
    if (!productoSeleccionado) return;

    const cantidadNum = parseInt(cantidad, 10);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor que 0.');
      return;
    }

    if (procesando) return;
    setProcesando(true);

    try {
      const turnoId = await obtenerOCrearTurno();
      await registrarEntrada(productoSeleccionado.id, cantidadNum, turnoId);
      await cargarProductos();
      cerrarModal();
      Alert.alert(
        '✅ Entrada registrada',
        `Se agregaron ${cantidadNum} unidades de ${productoSeleccionado.nombre}.`
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la entrada.');
      console.error(error);
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator size="large" color="#2b6cb0" />
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.encabezado}>
        <Text style={estilos.textoEncabezado}>
          Toca un producto para registrar una entrada
        </Text>
      </View>

      <FlatList
        data={productos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const colorStock = item.existencia < item.alerta_minima ? '#e53e3e' : '#38a169';
          return (
            <TouchableOpacity
              style={estilos.tarjeta}
              onPress={() => abrirModal(item)}
            >
              <View style={estilos.filaProducto}>
                <Text style={estilos.nombre} numberOfLines={1}>{item.nombre}</Text>
                <Text style={[estilos.stock, { color: colorStock }]}>
                  {item.existencia} unid.
                </Text>
              </View>
              <Text style={estilos.precio}>{item.precio.toFixed(2)} CUP</Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={estilos.centrado}>
            <Text style={estilos.textoVacio}>No hay productos registrados.</Text>
          </View>
        }
      />

      {/* Modal para ingresar cantidad */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={estilos.overlayModal}>
          <View style={estilos.modal}>
            <Text style={estilos.tituloModal}>Entrada de mercancía</Text>
            <Text style={estilos.nombreModal}>
              {productoSeleccionado?.nombre}
            </Text>
            <Text style={estilos.stockActual}>
              Stock actual: {productoSeleccionado?.existencia} unidades
            </Text>

            <Text style={estilos.etiqueta}>Cantidad a agregar</Text>
            <TextInput
              style={estilos.input}
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="number-pad"
              placeholder="Ej: 24"
              placeholderTextColor="#a0aec0"
              autoFocus
              maxLength={5}
            />

            {/* Vista previa del nuevo stock */}
            {cantidad !== '' && !isNaN(parseInt(cantidad, 10)) && (
              <Text style={estilos.previa}>
                Nuevo stock: {(productoSeleccionado?.existencia ?? 0) + parseInt(cantidad, 10)} unidades
              </Text>
            )}

            <TouchableOpacity
              style={[estilos.botonConfirmar, procesando && estilos.botonDeshabilitado]}
              onPress={confirmarEntrada}
              disabled={procesando}
            >
              <Text style={estilos.textoBotonConfirmar}>
                {procesando ? 'Registrando...' : 'CONFIRMAR ENTRADA'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={estilos.botonCancelar} onPress={cerrarModal}>
              <Text style={estilos.textoBotonCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    marginVertical: 5,
    elevation: 1,
  },
  filaProducto: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nombre: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  stock: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  precio: {
    fontSize: 14,
    color: '#718096',
  },
  textoVacio: {
    fontSize: 16,
    color: '#718096',
  },
  overlayModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  tituloModal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
    textAlign: 'center',
  },
  nombreModal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2b6cb0',
    textAlign: 'center',
    marginBottom: 4,
  },
  stockActual: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 20,
  },
  etiqueta: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#cbd5e0',
    borderRadius: 10,
    padding: 14,
    fontSize: 24,
    color: '#1a1a2e',
    backgroundColor: '#f7fafc',
    textAlign: 'center',
  },
  previa: {
    fontSize: 15,
    color: '#38a169',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  botonConfirmar: {
    backgroundColor: '#2b6cb0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  botonDeshabilitado: {
    backgroundColor: '#a0aec0',
  },
  textoBotonConfirmar: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botonCancelar: {
    padding: 14,
    alignItems: 'center',
  },
  textoBotonCancelar: {
    color: '#718096',
    fontSize: 16,
  },
});