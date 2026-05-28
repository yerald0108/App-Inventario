import { useEffect, useState } from 'react';
import { Platform, UIManager, View, Text, TouchableOpacity, 
         StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { inicializarDB } from './src/database/database';
import { toastConfig } from './src/components/ToastConfig';
import { ProductosProvider } from './src/context/ProductosContext';
import RootNavigator from './src/navigation/RootNavigator';

export type { RootStackParamList } from './src/navigation/RootNavigator';

type EstadoDB = 'cargando' | 'listo' | 'error';

export default function App() {
  const [estadoDB, setEstadoDB] = useState<EstadoDB>('cargando');
  const [mensajeError, setMensajeError] = useState<string>('');

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    arrancarDB();
  }, []);

  async function arrancarDB() {
    try {
      await inicializarDB();
      setEstadoDB('listo');
    } catch (error: any) {
      console.error('App: error crítico al inicializar DB', error);
      const msg = error?.message ?? String(error) ?? 'Error desconocido';
      const stack = error?.stack ?? '';
      setMensajeError(`${msg}\n\n${stack}`);
      setEstadoDB('error');
    }
  }

  // ── Pantalla de carga ──
  if (estadoDB === 'cargando') {
    return (
      <>
        <StatusBar style="dark" />
        <SafeAreaProvider>
          <View style={estilosApp.centrado}>
            <ActivityIndicator size="large" color="#2b6cb0" />
            <Text style={estilosApp.textoCargando}>Iniciando MiCaja...</Text>
          </View>
        </SafeAreaProvider>
      </>
    );
  }

  // ── Pantalla de error ──
  if (estadoDB === 'error') {
    return (
      <>
        <StatusBar style="dark" />
        <SafeAreaProvider>
          <View style={estilosApp.centrado}>
            <Text style={estilosApp.iconoError}>⚠️</Text>
            <Text style={estilosApp.tituloError}>Error al iniciar la app</Text>
            
            <ScrollView style={estilosApp.scrollError}>
              <Text style={estilosApp.textoErrorDetalle} selectable>
                {mensajeError || 'Error desconocido. Revisa los logs.'}
              </Text>
            </ScrollView>

            <Text style={estilosApp.descripcionError}>
              Toma una captura de pantalla del error de arriba y compártela.
            </Text>
            <TouchableOpacity style={estilosApp.botonReintentar} onPress={arrancarDB}>
              <Text style={estilosApp.textoBotonReintentar}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaProvider>
      </>
    );
  }

  // ── App principal ──
  return (
    <>
      <StatusBar style="light" translucent={false} backgroundColor="#1a1a2e" />
      <SafeAreaProvider>
        <ProductosProvider>
          <RootNavigator />
          <Toast config={toastConfig} />
        </ProductosProvider>
      </SafeAreaProvider>
    </>
  );
}

const estilosApp = StyleSheet.create({
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
    padding: 24,
  },
  textoCargando: {
    marginTop: 16,
    fontSize: 16,
    color: '#4a5568',
    fontWeight: '600',
  },
  iconoError: {
    fontSize: 48,
    marginBottom: 12,
  },
  tituloError: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollError: {
    width: '100%',
    maxHeight: 300,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  textoErrorDetalle: {
    color: '#f6ad55',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  descripcionError: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  botonReintentar: {
    backgroundColor: '#2b6cb0',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  textoBotonReintentar: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});