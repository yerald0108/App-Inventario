// src/components/ModalSelectorAccion.tsx
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Opcion {
  icono: string;
  titulo: string;
  descripcion: string;
  color: string;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  titulo: string;
  opciones: Opcion[];
  onCerrar: () => void;
}

export default function ModalSelectorAccion({ visible, titulo, opciones, onCerrar }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={estilos.overlay} onPress={onCerrar}>
        <Pressable style={estilos.modal} onPress={() => {}}>
          <Text style={estilos.titulo}>{titulo}</Text>

          {opciones.map((op, idx) => (
            <TouchableOpacity
              key={idx}
              style={[estilos.botonOpcion, { borderLeftColor: op.color }]}
              onPress={() => { onCerrar(); op.onPress(); }}
              activeOpacity={0.75}
            >
              <View style={[estilos.iconoOpcion, { backgroundColor: op.color + '22' }]}>
                <Ionicons name={op.icono as any} size={26} color={op.color} />
              </View>
              <View style={estilos.textoOpcion}>
                <Text style={estilos.tituloOpcion}>{op.titulo}</Text>
                <Text style={estilos.descripcionOpcion}>{op.descripcion}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#a0aec0" />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={estilos.botonCancelar} onPress={onCerrar}>
            <Text style={estilos.textoBotonCancelar}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
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
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 20,
  },
  botonOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconoOpcion: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoOpcion: { flex: 1 },
  tituloOpcion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 3,
  },
  descripcionOpcion: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
  },
  botonCancelar: {
    marginTop: 4,
    padding: 14,
    alignItems: 'center',
  },
  textoBotonCancelar: {
    color: '#718096',
    fontSize: 15,
    fontWeight: '600',
  },
});