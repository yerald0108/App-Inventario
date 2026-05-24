import { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, ScrollView,
  Animated, Pressable, PanResponder, Platform,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import {
  Pedido,
  obtenerPedidosAbiertos,
  crearPedido,
  cancelarPedido,
} from '../database/pedidos';
import { obtenerTurnoAbierto } from '../database/turnos';
import EstadoVacio from '../components/EstadoVacio';
import { formatCUP } from '../utils/formatters';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Pedidos'>;
};

// Nombres de mesa predefinidos para sugerencias rápidas
const SUGERENCIAS_NOMBRE = [
  'Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5',
  'Barra', 'Para llevar', 'Terraza', 'VIP',
];

export default function PantallaPedidos({ navigation }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [turnoId, setTurnoId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [creando, setCreando] = useState(false);
  const creandoRef = useRef(false);
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
      cargarPedidos();
    }, [])
  );

  async function cargarPedidos() {
    setCargando(true);
    try {
      const turno = await obtenerTurnoAbierto();
      if (!turno) {
        setTurnoId(null);
        setPedidos([]);
        return;
      }
      setTurnoId(turno.id);
      const lista = await obtenerPedidosAbiertos(turno.id);
      setPedidos(lista);
    } finally {
      setCargando(false);
    }
  }

  function abrirModal() {
    setNombreNuevo('');
    setModalVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
  }

  function cerrarModal() {
    setModalVisible(false);
  }

  async function handleCrearPedido() {
    if (!nombreNuevo.trim()) {
      Alert.alert('Error', 'Pon un nombre para identificar el pedido (ej: Mesa 1).');
      return;
    }
    if (!turnoId) {
      Alert.alert('Sin turno', 'Debes tener un turno abierto para crear pedidos.');
      return;
    }
    if (creandoRef.current) return;
    creandoRef.current = true;
    setCreando(true);

    try {
      const id = await crearPedido(nombreNuevo, turnoId);
      cerrarModal();
      // Navegar directamente al nuevo pedido
      navigation.navigate('DetallePedido', {
        pedidoId: id,
        pedidoNombre: nombreNuevo.trim(),
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear el pedido.');
      console.error(e);
    } finally {
      creandoRef.current = false;
      setCreando(false);
    }
  }

  function confirmarCancelar(pedido: Pedido) {
    Alert.alert(
      `¿Cancelar "${pedido.nombre}"?`,
      pedido.total > 0
        ? `Hay ${formatCUP(pedido.total)} CUP sin cobrar. El pedido se eliminará sin registrar ningún cobro.`
        : 'El pedido está vacío. Se eliminará sin registrar cobro.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Sí, cancelar pedido',
          style: 'destructive',
          onPress: async () => {
            await cancelarPedido(pedido.id);
            await cargarPedidos();
          },
        },
      ]
    );
  }

  function formatearTiempo(iso: string): string {
    const fecha = new Date(iso);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `${diffMin} min`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}h ${m}m`;
  }

  // Color del indicador de tiempo (verde < 30min, amarillo < 60min, rojo >= 60min)
  function colorTiempo(iso: string): string {
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 30) return '#38a169';
    if (diffMin < 60) return '#d69e2e';
    return '#e53e3e';
  }

  if (!cargando && !turnoId) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <EstadoVacio
          icono="alert-circle-outline"
          titulo="Sin turno abierto"
          descripcion="Regresa al inicio e inicia un turno para gestionar pedidos."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      {/* Cabecera de estado */}
      <View style={estilos.cabecera}>
        <View style={estilos.filaEstado}>
          <View style={estilos.dotVerde} />
          <Text style={estilos.textoCabecera}>
            {pedidos.length === 0
              ? 'Sin pedidos activos'
              : `${pedidos.length} pedido${pedidos.length > 1 ? 's' : ''} abierto${pedidos.length > 1 ? 's' : ''}`}
          </Text>
        </View>
        <Text style={estilos.subtextoCabecera}>
          Total acumulado: {formatCUP(pedidos.reduce((acc, p) => acc + p.total, 0))} CUP
        </Text>
      </View>

      {cargando ? (
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#2b6cb0" />
        </View>
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const tiempo = formatearTiempo(item.fecha_apertura);
            const colorT = colorTiempo(item.fecha_apertura);
            return (
              <TouchableOpacity
                style={estilos.tarjeta}
                onPress={() =>
                  navigation.navigate('DetallePedido', {
                    pedidoId: item.id,
                    pedidoNombre: item.nombre,
                  })
                }
                activeOpacity={0.8}
              >
                {/* Franja lateral de color-tiempo */}
                <View style={[estilos.franjaLateral, { backgroundColor: colorT }]} />

                <View style={estilos.cuerpoTarjeta}>
                  {/* Fila superior: nombre + tiempo */}
                  <View style={estilos.filaSuperior}>
                    <View style={estilos.iconoMesa}>
                      <Ionicons name="restaurant-outline" size={20} color="#2b6cb0" />
                    </View>
                    <Text style={estilos.nombrePedido} numberOfLines={1}>
                      {item.nombre}
                    </Text>
                    <View style={[estilos.badgeTiempo, { backgroundColor: colorT + '20', borderColor: colorT }]}>
                      <Ionicons name="time-outline" size={12} color={colorT} />
                      <Text style={[estilos.textoTiempo, { color: colorT }]}>{tiempo}</Text>
                    </View>
                  </View>

                  {/* Fila inferior: total + acciones */}
                  <View style={estilos.filaInferior}>
                    <View>
                      <Text style={estilos.etiquetaTotal}>Total acumulado</Text>
                      <Text style={estilos.valorTotal}>
                        {item.total > 0 ? `${formatCUP(item.total)} CUP` : 'Sin items aún'}
                      </Text>
                    </View>
                    <View style={estilos.botonesAccion}>
                      <TouchableOpacity
                        style={estilos.botonCancelarPedido}
                        onPress={() => confirmarCancelar(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#e53e3e" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={estilos.botonVerPedido}
                        onPress={() =>
                          navigation.navigate('DetallePedido', {
                            pedidoId: item.id,
                            pedidoNombre: item.nombre,
                          })
                        }
                      >
                        <Text style={estilos.textoBotonVerPedido}>Ver pedido</Text>
                        <Ionicons name="chevron-forward" size={14} color="#2b6cb0" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EstadoVacio
              icono="restaurant-outline"
              titulo="Sin pedidos activos"
              descripcion={'Toca el botón "+" para abrir\nel primer pedido del turno.'}
            />
          }
        />
      )}

      {/* FAB — Nuevo Pedido */}
      <TouchableOpacity style={estilos.fab} onPress={abrirModal} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#ffffff" />
        <Text style={estilos.textoFab}>Nuevo Pedido</Text>
      </TouchableOpacity>

      {/* Modal: Nombre del nuevo pedido */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={estilos.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={cerrarModal} />
          <Animated.View style={[estilos.modal, { transform: [{ translateY: slideAnim }] }]}>
            <View style={estilos.barraArrastre} {...panResponder.panHandlers} />

            <Text style={estilos.tituloModal}>Nuevo Pedido</Text>
            <Text style={estilos.subtituloModal}>
              Dale un nombre para identificar fácilmente esta cuenta
            </Text>

            {/* Input de nombre */}
            <TextInput
              style={estilos.inputNombre}
              value={nombreNuevo}
              onChangeText={setNombreNuevo}
              placeholder="Ej: Mesa 3, Barra, Para llevar..."
              placeholderTextColor="#a0aec0"
              autoCapitalize="words"
              autoFocus
              onSubmitEditing={handleCrearPedido}
              returnKeyType="done"
            />

            {/* Sugerencias rápidas */}
            <Text style={estilos.etiquetaSugerencias}>Sugerencias rápidas</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.scrollSugerencias}
            >
              {SUGERENCIAS_NOMBRE.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    estilos.chipSugerencia,
                    nombreNuevo === s && estilos.chipSugerenciaActivo,
                  ]}
                  onPress={() => setNombreNuevo(s)}
                >
                  <Text
                    style={[
                      estilos.textoChipSugerencia,
                      nombreNuevo === s && estilos.textoChipActivo,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Botón confirmar */}
            <TouchableOpacity
              style={[
                estilos.botonConfirmar,
                (!nombreNuevo.trim() || creando) && estilos.botonDeshabilitado,
              ]}
              onPress={handleCrearPedido}
              disabled={!nombreNuevo.trim() || creando}
            >
              {creando ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#ffffff" />
                  <Text style={estilos.textoBotonConfirmar}>ABRIR PEDIDO</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={estilos.botonCancelarModal} onPress={cerrarModal}>
              <Text style={estilos.textoBotonCancelarModal}>Cancelar</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f0f4f8' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Cabecera
  cabecera: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 4,
  },
  filaEstado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dotVerde: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#68d391',
  },
  textoCabecera: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  subtextoCabecera: { fontSize: 13, color: '#a0aec0' },

  // Lista
  lista: { padding: 16, paddingBottom: 120 },

  // Tarjeta de pedido
  tarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  franjaLateral: { width: 5 },
  cuerpoTarjeta: { flex: 1, padding: 14, gap: 12 },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconoMesa: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#ebf8ff', alignItems: 'center', justifyContent: 'center',
  },
  nombrePedido: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  badgeTiempo: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  textoTiempo: { fontSize: 12, fontWeight: '700' },
  filaInferior: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  etiquetaTotal: { fontSize: 12, color: '#718096', marginBottom: 2 },
  valorTotal: { fontSize: 18, fontWeight: '900', color: '#2b6cb0' },
  botonesAccion: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botonCancelarPedido: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#fff5f5', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#fed7d7',
  },
  botonVerPedido: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ebf8ff', borderWidth: 1, borderColor: '#bee3f8',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  textoBotonVerPedido: { fontSize: 13, fontWeight: '700', color: '#2b6cb0' },

  // FAB extendido
  fab: {
    position: 'absolute', bottom: 24, right: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#2b6cb0', borderRadius: 18, paddingVertical: 18,
    elevation: 8,
    shadowColor: '#2b6cb0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  textoFab: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 12, elevation: 20,
  },
  barraArrastre: {
    width: 40, height: 5, backgroundColor: '#e2e8f0',
    borderRadius: 3, alignSelf: 'center', marginBottom: 20,
  },
  tituloModal: {
    fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', textAlign: 'center', marginBottom: 6,
  },
  subtituloModal: {
    fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 20,
  },
  inputNombre: {
    borderWidth: 2, borderColor: '#2b6cb0', borderRadius: 14,
    padding: 16, fontSize: 18, color: '#1a1a2e', backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  etiquetaSugerencias: {
    fontSize: 13, color: '#718096', fontWeight: '600', marginBottom: 10,
  },
  scrollSugerencias: { gap: 8, paddingBottom: 4, marginBottom: 20 },
  chipSugerencia: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f7fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  chipSugerenciaActivo: {
    backgroundColor: '#2b6cb0', borderColor: '#2b6cb0',
  },
  textoChipSugerencia: { fontSize: 14, color: '#4a5568', fontWeight: '600' },
  textoChipActivo: { color: '#ffffff' },
  botonConfirmar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#2b6cb0', borderRadius: 14, padding: 18, marginBottom: 12,
  },
  botonDeshabilitado: { backgroundColor: '#a0aec0' },
  textoBotonConfirmar: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
  botonCancelarModal: { alignItems: 'center', padding: 12 },
  textoBotonCancelarModal: { fontSize: 15, color: '#718096' },
});