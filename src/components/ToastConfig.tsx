import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const renderIcon = (name: any, color: string) => (
  <View style={estilos.contenedorIcono}>
    <Ionicons name={name} size={24} color={color} />
  </View>
);

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      renderLeadingIcon={() => renderIcon('checkmark-circle', '#48bb78')}
      style={{ borderLeftColor: '#48bb78', backgroundColor: '#ffffff', height: 70, borderLeftWidth: 5 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a2e'
      }}
      text2Style={{
        fontSize: 14,
        color: '#4a5568'
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      renderLeadingIcon={() => renderIcon('alert-circle', '#f56565')}
      style={{ borderLeftColor: '#f56565', backgroundColor: '#ffffff', height: 70, borderLeftWidth: 5 }}
      text1Style={{
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a2e'
      }}
      text2Style={{
        fontSize: 14,
        color: '#4a5568'
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      renderLeadingIcon={() => renderIcon('information-circle', '#4299e1')}
      style={{ borderLeftColor: '#4299e1', backgroundColor: '#ffffff', height: 70, borderLeftWidth: 5 }}
      text1Style={{
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a2e'
      }}
      text2Style={{
        fontSize: 14,
        color: '#4a5568'
      }}
    />
  ),
};

const estilos = StyleSheet.create({
  contenedorIcono: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 15,
  }
});
