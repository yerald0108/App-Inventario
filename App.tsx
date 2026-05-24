import { useEffect } from 'react';
import { Platform, UIManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { inicializarDB } from './src/database/database';
import { toastConfig } from './src/components/ToastConfig';

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
  Despachos: undefined;
  VentaExterna: { despachoId: number; despachoNombre: string; despachoColor: string };
  ProductosDespacho: { despachoId: number; despachoNombre: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    inicializarDB().catch(console.error);
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
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
          <Stack.Screen name="Inventario" component={PantallaInventario} options={{ title: 'Inventario' }} />
          <Stack.Screen name="Venta" component={PantallaVenta} options={{ title: 'Nueva Venta' }} />
          <Stack.Screen name="Entrada" component={PantallaEntrada} options={{ title: 'Entrada de Mercancía' }} />
          <Stack.Screen name="CierreTurno" component={PantallaCierreTurno} options={{ title: 'Cierre de Turno' }} />
          <Stack.Screen name="UltimasVentas" component={PantallaUltimasVentas} options={{ title: 'Últimas Ventas' }} />
          <Stack.Screen name="Historial" component={PantallaHistorial} options={{ title: 'Historial de Turnos' }} />
          <Stack.Screen
            name="DetalleTurno"
            component={PantallaDetalleTurno}
            options={({ route }) => {
              const { fechaCierre } = route.params;
              let titulo = 'Detalle del Turno';
              if (fechaCierre) {
                const fecha = new Date(fechaCierre);
                const dia = fecha.getDate();
                const mes = fecha.toLocaleString('es-CU', { month: 'short' }).replace('.', '');
                titulo = `Turno · ${dia} ${mes}`;
              }
              return { title: titulo };
            }}
          />
          <Stack.Screen name="SalidaFamiliar" component={PantallaSalidaFamiliar} options={{ title: 'Salida Familiar' }} />
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
            options={({ route }) => ({ title: `Catálogo · ${route.params.despachoNombre}` })}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}