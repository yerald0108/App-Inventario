import { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, ScrollView,
  Animated, Pressable, PanResponder, Platform, KeyboardAvoidingView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import {
  Despacho, obtenerDespachos, crearDespacho,
  actualizarDespacho, eliminarDespacho
} from '../database/despachos';
import EstadoVacio from '../components/EstadoVacio';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Despachos'>;
};

const COLORES_DESPACHO = [
  '#e53e3e', // rojo
  '#d69e2e', // amarillo
  '#38a169', // verde
  '#2b6cb0', // azul
  '#805ad5', // morado
  '#ed64a6', // rosa
  '#dd6b20', // naranja
  '#319795', // teal
  '#2d3748', // gris oscuro
  '#718096', // gris medio
];

export default function PantallaDespachos({ navigation }: Props) {
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [despachoEditando, setDespachoEditando] = useState<Despacho | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [colorSeleccionado, setColorSeleccionado] = useState(COLORES_DESPACHO[4]);
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => { if (g.dy > 0) slideAnim.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 150 || g.vy > 0.5) {
          Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }).start(cerrarModal);
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
        }
      },
    })
  ).current;

  useFocusEffect(
    useCallback(() => {
      cargarDespachos();
    }, [])
  );

  async function cargarDespachos() {
    setCargando(true);
    try {
      const lista = await obtenerDespachos();
      setDespachos(lista);
    } finally {
      setCargando(false);
    }
  }

  function abrirCrear() {
    setDespachoEditando(null);
    setNombre('');
    setDescripcion('');
    setColorSeleccionado(COLORES_DESPACHO[Math.floor(Math.random() * COLORES_DESPACHO.length)]);
    setModalVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
  }

  function abrirEditar(despacho: Despacho) {
    setDespachoEditando(despacho);
    setNombre(despacho.nombre);
    setDescripcion(despacho.descripcion ?? '');
    setColorSeleccionado(despacho.color);
    setModalVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
  }

  function cerrarModal() {
    setModalVisible(false);
    setDespachoEditando(null);
  }

  async function handleGuardar() {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del despacho es obligatorio.');
      return;
    }
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);

    try {
      if (despachoEditando) {
        await actualizarDespacho(despachoEditando.id, nombre.trim(), descripcion.trim() || null, colorSeleccionado);
      } else {
        await crearDespacho(nombre.trim(), descripcion.trim() || null, colorSeleccionado);
      }
      cerrarModal();
      await cargarDespachos();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el despacho.');
      console.error(error);
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }

  function confirmarEliminar(despacho: Despacho) {
    Alert.alert(
      '¿Eliminar despacho?',
      `"${despacho.nombre}" será archivado. Sus ventas registradas se conservarán en el historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await eliminarDespacho(despacho.id);
            await cargarDespachos();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      {/* Cabecera informativa */}
      <View style={estilos.banner}>
        <Ionicons name="storefront-outline" size={16} color="#9f7aea" />
        <Text style={estilos.textoBanner}>
          Ventas externas — el dinero no entra a tu caja
        </Text>
      </View>

      {cargando ? (
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#805ad5" />
        </View>
      ) : (
        <FlatList
          data={despachos}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={estilos.tarjeta}
              onPress={() => navigation.navigate('VentaExterna', { despachoId: item.id, despachoNombre: item.nombre, despachoColor: item.color })}
              activeOpacity={0.8}
            >
              {/* Franja de color a la izquierda */}
              <View style={[estilos.franjaColor, { backgroundColor: item.color }]} />

              <View style={estilos.contenidoTarjeta}>
                <View style={estilos.filaTarjeta}>
                  <View style={[estilos.avatar, { backgroundColor: item.color + '22' }]}>
                    <Ionicons name="storefront" size={22} color={item.color} />
                  </View>
                  <View style={estilos.infoTarjeta}>
                    <Text style={estilos.nombreDespacho}>{item.nombre}</Text>
                    {item.descripcion ? (
                      <Text style={estilos.descripcionDespacho} numberOfLines={1}>
                        {item.descripcion}
                      </Text>
                    ) : (
                      <Text style={estilos.descripcionVacia}>Sin descripción</Text>
                    )}
                  </View>
                  <View style={estilos.acciones}>
                    <TouchableOpacity
                      style={estilos.botonAccion}
                      onPress={() => navigation.navigate('ProductosDespacho', { despachoId: item.id, despachoNombre: item.nombre })}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="cube-outline" size={18} color="#718096" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={estilos.botonAccion}
                      onPress={() => abrirEditar(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil-outline" size={18} color="#718096" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={estilos.botonAccion}
                      onPress={() => confirmarEliminar(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#e53e3e" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Botón secundario: ir a vender */}
                <TouchableOpacity
                  style={[estilos.botonVender, { borderColor: item.color }]}
                  onPress={() => navigation.navigate('VentaExterna', { despachoId: item.id, despachoNombre: item.nombre, despachoColor: item.color })}
                >
                  <Ionicons name="cart-outline" size={14} color={item.color} />
                  <Text style={[estilos.textoBotonVender, { color: item.color }]}>
                    Registrar venta
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EstadoVacio
              icono="storefront-outline"
              titulo="Sin despachos externos"
              descripcion={'Agrega los despachos cuyos productos\nvenderás en tu punto de venta.'}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={estilos.fab} onPress={abrirCrear}>
        <Text style={estilos.textoFab}>+</Text>
      </TouchableOpacity>

      {/* Modal crear/editar */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={estilos.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={cerrarModal} />
          <Animated.View style={[estilos.modal, { transform: [{ translateY: slideAnim }] }]}>
            <View style={estilos.barraArrastre} {...panResponder.panHandlers} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={estilos.tituloModal}>
                {despachoEditando ? 'Editar despacho' : 'Nuevo despacho'}
              </Text>

              <Text style={estilos.etiqueta}>Nombre del despacho *</Text>
              <TextInput
                style={estilos.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Despacho Juan, La Bodeguita..."
                placeholderTextColor="#a0aec0"
                autoCapitalize="words"
              />

              <Text style={estilos.etiqueta}>Descripción (opcional)</Text>
              <TextInput
                style={estilos.input}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Ej: Productos de rancho y limpieza"
                placeholderTextColor="#a0aec0"
              />

              <Text style={estilos.etiqueta}>Color identificador</Text>
              <View style={estilos.gridColores}>
                {COLORES_DESPACHO.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      estilos.chipColor,
                      { backgroundColor: color },
                      colorSeleccionado === color && estilos.chipColorActivo,
                    ]}
                    onPress={() => setColorSeleccionado(color)}
                  >
                    {colorSeleccionado === color && (
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[estilos.botonGuardar, { backgroundColor: colorSeleccionado }, guardando && { opacity: 0.7 }]}
                onPress={handleGuardar}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={estilos.textoBotonGuardar}>
                    {despachoEditando ? 'GUARDAR CAMBIOS' : 'CREAR DESPACHO'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={estilos.botonCancelar} onPress={cerrarModal}>
                <Text style={estilos.textoBotonCancelar}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { 
    flex: 1, 
    backgroundColor: '#f7fafc' 
  },
  centrado: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#faf5ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9d8fd',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  textoBanner: { 
    fontSize: 13, 
    color: '#6b46c1', 
    fontWeight: '600' 
  },
  tarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { 
      width: 0, 
      height: 1 
    },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  franjaColor: { 
    width: 5 
  },
  contenidoTarjeta: { 
    flex: 1, 
    padding: 14 
  },
  filaTarjeta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    marginBottom: 12 
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTarjeta: { 
    flex: 1 
  },
  nombreDespacho: { 
    fontSize: 17, 
    fontWeight: 'bold', 
    color: '#1a1a2e', 
    marginBottom: 2 
  },
  descripcionDespacho: { 
    fontSize: 13, 
    color: '#718096' 
  },
  descripcionVacia: { 
    fontSize: 13, 
    color: '#cbd5e0', 
    fontStyle: 'italic' 
  },
  acciones: { 
    flexDirection: 'row', 
    gap: 4 
  },
  botonAccion: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f7fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonVender: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
  },
  textoBotonVender: { 
    fontSize: 14, 
    fontWeight: '700' 
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#805ad5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#805ad5',
    shadowOffset: { 
      width: 0, 
      height: 4 
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  textoFab: { 
    color: '#ffffff', 
    fontSize: 32, 
    fontWeight: 'bold', 
    lineHeight: 36 
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    maxHeight: '90%',
    elevation: 20,
  },
  barraArrastre: {
    width: 40, 
    height: 5, 
    backgroundColor: '#e2e8f0',
    borderRadius: 3, 
    alignSelf: 'center', 
    marginBottom: 16,
  },
  tituloModal: {
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1a1a2e',
    marginBottom: 20, 
    textAlign: 'center',
  },
  etiqueta: {
    fontSize: 15, 
    fontWeight: '600', 
    color: '#4a5568',
    marginBottom: 6, 
    marginTop: 12,
  },
  input: {
    borderWidth: 1.5, 
    borderColor: '#cbd5e0', 
    borderRadius: 10,
    padding: 14, 
    fontSize: 16, 
    color: '#1a1a2e', 
    backgroundColor: '#f7fafc',
  },
  gridColores: {
    flexDirection: 'row', 
    flexWrap: 'wrap',
     gap: 10, 
     marginTop: 4,
  },
  chipColor: {
    width: 40, 
    height: 40, 
    borderRadius: 20,
    alignItems: 'center', 
    justifyContent: 'center',
  },
  chipColorActivo: {
    borderWidth: 3, 
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { 
      width: 0, 
      height: 2 
    },
    shadowOpacity: 0.3, 
    shadowRadius: 4, 
    elevation: 4,
  },
  botonGuardar: {
    borderRadius: 12, 
    padding: 16,
    alignItems: 'center', 
    marginTop: 24,
  },
  textoBotonGuardar: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  botonCancelar: { 
    padding: 16, 
    alignItems: 'center', 
    marginBottom: 8 
  },
  textoBotonCancelar: { 
    color: '#718096', 
    fontSize: 16 
  },
});