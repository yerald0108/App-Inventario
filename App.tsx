import { useEffect, useState } from 'react';
import { Platform, UIManager, View, Text, TouchableOpacity, 
         StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { inicializarDB } from './src/database/database';
import { toastConfig } from './src/components/ToastConfig';
import { ProductosProvider } from './src/context/ProductosContext';

import PantallaInicio from './src/screens/PantallaInicio';
import PantallaInventario from './src/screens/PantallaInventario';
import PantallaVenta from './src/screens/PantallaVenta';
import PantallaEntrada from './src/screens/PantallaEntrada';
import PantallaCierreTurno from './src/screens/PantallaCierreTurno';
import PantallaUltimasVentas from './src/screens/PantallaUltimasVentas';
import PantallaHistorial from './src/screens/PantallaHistorial';
import PantallaDetalleTurno from './src/screens/PantallaDetalleTurno';
import PantallaSalidaFamiliar from './src/screens/PantallaSalidaFamiliar';
import PantallaDespachos from './src/screens/PantallaDespachos';
import PantallaVentaExterna from './src/screens/PantallaVentaExterna';
import PantallaProductosDespacho from './src/screens/PantallaProductosDespacho';
import PantallaPedidos from './src/screens/PantallaPedidos';
import PantallaDetallePedido from './src/screens/PantallaDetallePedido';
import PantallaMerma from './src/screens/PantallaMerma';

export type RootStackParamList = {
  Inicio: undefined;
  Inventario: undefined;
  Venta: undefined;
  Entrada: undefined;
  CierreTurno: undefined;
  UltimasVentas: undefined;
  Historial: undefined;
  DetalleTurno: { turnoId: number; fechaCierre?: string };
  SalidaFamiliar: undefined;
  Merma: undefined;
  Despachos: undefined;
  VentaExterna: { despachoId: number; despachoNombre: string; despachoColor: string };
  ProductosDespacho: { despachoId: number; despachoNombre: string };
  Pedidos: undefined;
  DetallePedido: { pedidoId: number; pedidoNombre: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Inicio"
              screenOptions={{
                headerStyle: { backgroundColor: '#1a1a2e' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            >
              <Stack.Screen
                name="Inicio"
                component={PantallaInicio}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Inventario"
                component={PantallaInventario}
                options={{ title: 'Inventario' }}
              />
              <Stack.Screen
                name="Venta"
                component={PantallaVenta}
                options={{ title: 'Nueva Venta' }}
              />
              <Stack.Screen
                name="Entrada"
                component={PantallaEntrada}
                options={{ title: 'Entrada de Mercancía' }}
              />
              <Stack.Screen
                name="CierreTurno"
                component={PantallaCierreTurno}
                options={{ title: 'Cierre de Turno' }}
              />
              <Stack.Screen
                name="UltimasVentas"
                component={PantallaUltimasVentas}
                options={{ title: 'Últimas Ventas' }}
              />
              <Stack.Screen
                name="Historial"
                component={PantallaHistorial}
                options={{ title: 'Historial de Turnos' }}
              />
              <Stack.Screen
                name="DetalleTurno"
                component={PantallaDetalleTurno}
                options={({ route }) => {
                  const { fechaCierre } = route.params;
                  let titulo = 'Detalle del Turno';
                  if (fechaCierre) {
                    const fecha = new Date(fechaCierre);
                    const dia = fecha.getDate();
                    const mes = fecha
                      .toLocaleString('es-CU', { month: 'short' })
                      .replace('.', '');
                    titulo = `Turno · ${dia} ${mes}`;
                  }
                  return { title: titulo };
                }}
              />
              <Stack.Screen
                name="SalidaFamiliar"
                component={PantallaSalidaFamiliar}
                options={{ title: 'Salida Familiar' }}
              />
              <Stack.Screen
                name="Merma"
                component={PantallaMerma}
                options={{ title: 'Merma de Productos' }}
              />
              <Stack.Screen
                name="Despachos"
                component={PantallaDespachos}
                options={{ title: 'Despachos Externos' }}
              />
              <Stack.Screen
                name="VentaExterna"
                component={PantallaVentaExterna}
                options={({ route }) => ({ title: route.params.despachoNombre })}
              />
              <Stack.Screen
                name="ProductosDespacho"
                component={PantallaProductosDespacho}
                options={({ route }) => ({
                  title: `Catálogo · ${route.params.despachoNombre}`,
                })}
              />
              <Stack.Screen
                name="Pedidos"
                component={PantallaPedidos}
                options={{ title: 'Pedidos' }}
              />
              <Stack.Screen
                name="DetallePedido"
                component={PantallaDetallePedido}
                options={({ route }) => ({ title: route.params.pedidoNombre })}
              />
            </Stack.Navigator>
          </NavigationContainer>
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