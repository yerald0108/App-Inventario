import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  obtenerProductos, crearProducto,
  actualizarProducto, eliminarProducto
} from '../database/productos';
import { Producto } from '../types';
import ProductoItem from '../components/ProductoItem';
import FormularioProducto from '../components/FormularioProducto';

export default function PantallaInventario() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

  // Recargar productos cada vez que la pantalla gana foco
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

  function abrirCrear() {
    setProductoSeleccionado(null);
    setModalVisible(true);
  }

  function abrirEditar(producto: Producto) {
    setProductoSeleccionado(producto);
    setModalVisible(true);
  }

  function cerrarModal() {
    setModalVisible(false);
    setProductoSeleccionado(null);
  }

  async function handleGuardar(datos: {
    nombre: string;
    precio: number;
    existencia: number;
    alerta_minima: number;
  }) {
    if (productoSeleccionado) {
      // Modo edición
      await actualizarProducto(
        productoSeleccionado.id,
        datos.nombre,
        datos.precio,
        datos.existencia,
        datos.alerta_minima
      );
    } else {
      // Modo crear
      await crearProducto(datos.nombre, datos.precio, datos.existencia, datos.alerta_minima);
    }
    cerrarModal();
    cargarProductos();
  }

  async function handleEliminar() {
    if (!productoSeleccionado) return;
    await eliminarProducto(productoSeleccionado.id);
    cerrarModal();
    cargarProductos();
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
      {/* Resumen de stock */}
      <View style={estilos.resumen}>
        <Text style={estilos.textoResumen}>
          {productos.length} productos · {productos.filter(p => p.existencia < p.alerta_minima).length} con stock bajo
        </Text>
      </View>

      {/* Lista de productos */}
      <FlatList
        data={productos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ProductoItem producto={item} onEditar={abrirEditar} />
        )}
        ListEmptyComponent={
          <View style={estilos.centrado}>
            <Text style={estilos.textoVacio}>No hay productos aún.</Text>
            <Text style={estilos.textoVacioSub}>Toca el botón + para agregar uno.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Botón flotante para agregar */}
      <TouchableOpacity style={estilos.botonAgregar} onPress={abrirCrear}>
        <Text style={estilos.textoBotonAgregar}>+</Text>
      </TouchableOpacity>

      {/* Modal de formulario */}
      <FormularioProducto
        visible={modalVisible}
        producto={productoSeleccionado}
        onGuardar={handleGuardar}
        onCancelar={cerrarModal}
        onEliminar={handleEliminar}
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
  resumen: {
    backgroundColor: '#1a1a2e',
    padding: 12,
    alignItems: 'center',
  },
  textoResumen: {
    color: '#a0aec0',
    fontSize: 14,
  },
  textoVacio: {
    fontSize: 18,
    color: '#4a5568',
    marginBottom: 8,
  },
  textoVacioSub: {
    fontSize: 14,
    color: '#a0aec0',
  },
  botonAgregar: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2b6cb0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  textoBotonAgregar: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 36,
  },
});