import { useEffect } from 'react';
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

export type RootStackParamList = {
  Inicio: undefined;
  Inventario: undefined;
  Venta: undefined;
  Entrada: undefined;
  CierreTurno: undefined;
  UltimasVentas: undefined;
  Historial: undefined;
  DetalleTurno: { turnoId: number };
  SalidaFamiliar: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
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
          <Stack.Screen name="DetalleTurno" component={PantallaDetalleTurno} options={{ title: 'Detalle del Turno' }} />
          <Stack.Screen name="SalidaFamiliar" component={PantallaSalidaFamiliar} options={{ title: 'Salida Familiar' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}