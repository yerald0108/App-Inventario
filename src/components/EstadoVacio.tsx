import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icono: any;
  titulo: string;
  descripcion?: string;
}

export default function EstadoVacio({ icono, titulo, descripcion }: Props) {
  return (
    <View style={estilos.contenedor}>
      <View style={estilos.circulo}>
        <Ionicons name={icono} size={64} color="#a0aec0" />
      </View>
      <Text style={estilos.titulo}>{titulo}</Text>
      {descripcion && <Text style={estilos.descripcion}>{descripcion}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  circulo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f7fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 8,
  },
  descripcion: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
  },
});
