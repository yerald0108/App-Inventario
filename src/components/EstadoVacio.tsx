import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icono: any;
  titulo: string;
  descripcion?: string;
  accion?: {
    texto: string;
    onPress: () => void;
  };
}

export default function EstadoVacio({ icono, titulo, descripcion, accion }: Props) {
  return (
    <View style={estilos.contenedor}>
      <View style={estilos.circulo}>
        <Ionicons name={icono} size={64} color="#a0aec0" />
      </View>
      <Text style={estilos.titulo}>{titulo}</Text>
      {descripcion && <Text style={estilos.descripcion}>{descripcion}</Text>}
      
      {accion && (
        <TouchableOpacity style={estilos.boton} onPress={accion.onPress}>
          <Text style={estilos.textoBoton}>{accion.texto}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
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
  boton: {
    marginTop: 24,
    backgroundColor: '#2b6cb0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  textoBoton: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
