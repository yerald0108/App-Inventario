import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Pressable, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  titulo: string;
  nombreProducto: string;
  cantidadActual: number;
  mostrarPersona?: boolean;
  personaActual?: string | null;
  onGuardar: (cantidad: number, persona: string | null) => Promise<void>;
  onEliminar: () => Promise<void>;
  onCancelar: () => void;
}

export default function ModalEditarMovimiento({
  visible, titulo, nombreProducto, cantidadActual,
  mostrarPersona = false, personaActual = null,
  onGuardar, onEliminar, onCancelar,
}: Props) {
  const [cantidad, setCantidad] = useState('');
  const [persona, setPersona] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (visible) {
      setCantidad(cantidadActual.toString());
      setPersona(personaActual ?? '');
    }
  }, [visible, cantidadActual, personaActual]);

  async function handleGuardar() {
    const num = parseInt(cantidad, 10);
    if (isNaN(num) || num < 0) {
      Alert.alert('Error', 'La cantidad debe ser un número válido.');
      return;
    }
    setProcesando(true);
    try {
      await onGuardar(num, mostrarPersona ? (persona.trim() || null) : null);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar el cambio.');
    } finally {
      setProcesando(false);
    }
  }

  function handleEliminar() {
    Alert.alert(
      '¿Eliminar este registro?',
      'El stock será devuelto al inventario. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setProcesando(true);
            try {
              await onEliminar();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'No se pudo eliminar.');
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={estilos.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onCancelar} />
        <View style={estilos.modal}>
          <Text style={estilos.titulo}>{titulo}</Text>
          <Text style={estilos.nombreProducto}>{nombreProducto}</Text>

          <Text style={estilos.etiqueta}>Cantidad</Text>
          <TextInput
            style={estilos.input}
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="number-pad"
            autoFocus
          />

          {mostrarPersona && (
            <>
              <Text style={estilos.etiqueta}>Persona</Text>
              <TextInput
                style={estilos.input}
                value={persona}
                onChangeText={setPersona}
                placeholder="Ej: El hijo, La mujer..."
                placeholderTextColor="#a0aec0"
              />
            </>
          )}

          <TouchableOpacity
            style={[estilos.botonGuardar, procesando && estilos.botonDeshabilitado]}
            onPress={handleGuardar}
            disabled={procesando}
          >
            <Text style={estilos.textoBoton}>
              {procesando ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[estilos.botonEliminar, procesando && estilos.botonDeshabilitado]}
            onPress={handleEliminar}
            disabled={procesando}
          >
            <Ionicons name="trash-outline" size={16} color="#e53e3e" />
            <Text style={estilos.textoBotonEliminar}>Eliminar registro</Text>
          </TouchableOpacity>

          <TouchableOpacity style={estilos.botonCancelar} onPress={onCancelar} disabled={procesando}>
            <Text style={estilos.textoBotonCancelar}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: '#ffffff', borderRadius: 20, padding: 24, width: '100%', elevation: 20 },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', textAlign: 'center', marginBottom: 4 },
  nombreProducto: { fontSize: 15, color: '#2b6cb0', textAlign: 'center', fontWeight: '600', marginBottom: 16 },
  etiqueta: { fontSize: 14, fontWeight: '600', color: '#4a5568', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1.5, borderColor: '#cbd5e0', borderRadius: 10, padding: 12, fontSize: 16, color: '#1a1a2e', backgroundColor: '#f7fafc' },
  botonGuardar: { backgroundColor: '#2b6cb0', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  botonDeshabilitado: { opacity: 0.6 },
  textoBoton: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  botonEliminar: { flexDirection: 'row', gap: 6, justifyContent: 'center', borderWidth: 1.5, borderColor: '#e53e3e', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10, backgroundColor: '#fff5f5' },
  textoBotonEliminar: { color: '#e53e3e', fontSize: 14, fontWeight: 'bold' },
  botonCancelar: { padding: 12, alignItems: 'center', marginTop: 6 },
  textoBotonCancelar: { color: '#718096', fontSize: 14 },
});