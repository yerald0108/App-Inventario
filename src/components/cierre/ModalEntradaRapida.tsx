import { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Producto } from '../../types';

interface Props {
  visible: boolean;
  productos: Producto[];
  cargandoProductos: boolean;
  guardando: boolean;
  onGuardar: (productoId: number, nombreProducto: string, cantidad: number) => Promise<void>;
  onCancelar: () => void;
}

export default function ModalEntradaRapida({
  visible,
  productos,
  cargandoProductos,
  guardando,
  onGuardar,
  onCancelar,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState('');

  // Filtrado local de productos
  const productosFiltrados = busqueda.trim() === ''
    ? productos
    : productos.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      );

  function handleCancelar() {
    setBusqueda('');
    setProductoSeleccionado(null);
    setCantidad('');
    onCancelar();
  }

  async function handleGuardar() {
    if (!productoSeleccionado) return;
    const cant = parseInt(cantidad, 10);
    if (isNaN(cant) || cant <= 0) return;
    await onGuardar(productoSeleccionado.id, productoSeleccionado.nombre, cant);
    setBusqueda('');
    setProductoSeleccionado(null);
    setCantidad('');
  }

  const puedeGuardar = productoSeleccionado !== null &&
    !isNaN(parseInt(cantidad, 10)) &&
    parseInt(cantidad, 10) > 0 &&
    !guardando;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancelar}
    >
      <KeyboardAvoidingView
        style={estilos.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleCancelar} />
        <View style={estilos.hoja}>
          {/* Cabecera */}
          <View style={estilos.cabecera}>
            <View style={estilos.filaCabecera}>
              <Ionicons name="download-outline" size={20} color="#2b6cb0" />
              <Text style={estilos.tituloCabecera}>Registrar entrada</Text>
            </View>
            <TouchableOpacity onPress={handleCancelar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#718096" />
            </TouchableOpacity>
          </View>

          {/* Paso 1: seleccionar producto */}
          {!productoSeleccionado ? (
            <>
              <TextInput
                style={estilos.buscador}
                placeholder="Buscar producto..."
                placeholderTextColor="#a0aec0"
                value={busqueda}
                onChangeText={setBusqueda}
                autoFocus
              />
              {cargandoProductos ? (
                <ActivityIndicator style={{ marginTop: 20 }} color="#2b6cb0" />
              ) : (
                <FlatList
                  data={productosFiltrados}
                  keyExtractor={item => item.id.toString()}
                  style={estilos.lista}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <Text style={estilos.textoVacio}>
                      No se encontraron productos
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={estilos.filaProducto}
                      onPress={() => setProductoSeleccionado(item)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={estilos.nombreProducto}>{item.nombre}</Text>
                        <Text style={estilos.stockProducto}>
                          Stock actual: {item.existencia} unid.
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#a0aec0" />
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          ) : (
            /* Paso 2: ingresar cantidad */
            <View style={estilos.pasosCantidad}>
              {/* Producto seleccionado */}
              <TouchableOpacity
                style={estilos.chipProducto}
                onPress={() => { setProductoSeleccionado(null); setCantidad(''); }}
              >
                <Ionicons name="checkmark-circle" size={18} color="#2b6cb0" />
                <Text style={estilos.nombreChip} numberOfLines={1}>
                  {productoSeleccionado.nombre}
                </Text>
                <Ionicons name="close-circle-outline" size={16} color="#718096" />
              </TouchableOpacity>

              <Text style={estilos.labelCantidad}>
                Cantidad a ingresar
              </Text>
              <TextInput
                style={estilos.inputCantidad}
                placeholder="Ej: 10"
                placeholderTextColor="#a0aec0"
                keyboardType="numeric"
                value={cantidad}
                onChangeText={v => {
                  // Solo dígitos
                  setCantidad(v.replace(/[^0-9]/g, ''));
                }}
                autoFocus
              />

              <View style={estilos.infoStock}>
                <Ionicons name="cube-outline" size={14} color="#718096" />
                <Text style={estilos.textoInfoStock}>
                  Stock antes de la entrada: {productoSeleccionado.existencia} unid.
                </Text>
              </View>

              {cantidad !== '' && !isNaN(parseInt(cantidad, 10)) && parseInt(cantidad, 10) > 0 && (
                <View style={estilos.previewResultado}>
                  <Text style={estilos.textoPreview}>
                    Quedará en stock:{' '}
                    <Text style={{ fontWeight: '900', color: '#38a169' }}>
                      {productoSeleccionado.existencia + parseInt(cantidad, 10)} unid.
                    </Text>
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[estilos.botonGuardar, !puedeGuardar && estilos.botonDeshabilitado]}
                onPress={handleGuardar}
                disabled={!puedeGuardar}
              >
                {guardando ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                    <Text style={estilos.textoBotonGuardar}>Registrar entrada</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  hoja: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  filaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tituloCabecera: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  buscador: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#2d3748',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  lista: {
    maxHeight: 380,
  },
  filaProducto: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  nombreProducto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  stockProducto: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  textoVacio: {
    textAlign: 'center',
    color: '#a0aec0',
    marginTop: 24,
    fontSize: 14,
  },
  pasosCantidad: {
    gap: 12,
  },
  chipProducto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ebf8ff',
    borderWidth: 1.5,
    borderColor: '#bee3f8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  nombreChip: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  labelCantidad: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  inputCantidad: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 22,
    fontWeight: '700',
    color: '#2d3748',
    backgroundColor: '#f8fafc',
    textAlign: 'center',
  },
  infoStock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textoInfoStock: {
    fontSize: 13,
    color: '#718096',
  },
  previewResultado: {
    backgroundColor: '#f0fff4',
    borderWidth: 1,
    borderColor: '#9ae6b4',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  textoPreview: {
    fontSize: 14,
    color: '#276749',
  },
  botonGuardar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2b6cb0',
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
  },
  botonDeshabilitado: {
    backgroundColor: '#a0aec0',
  },
  textoBotonGuardar: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
