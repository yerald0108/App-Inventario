import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PantallaInicio from '../screens/PantallaInicio';
import PantallaInventario from '../screens/PantallaInventario';
import PantallaVenta from '../screens/PantallaVenta';
import PantallaEntrada from '../screens/PantallaEntrada';
import PantallaCierreTurno from '../screens/PantallaCierreTurno';
import PantallaUltimasVentas from '../screens/PantallaUltimasVentas';
import PantallaHistorial from '../screens/PantallaHistorial';
import PantallaDetalleTurno from '../screens/PantallaDetalleTurno';
import PantallaSalidaFamiliar from '../screens/PantallaSalidaFamiliar';
import PantallaDespachos from '../screens/PantallaDespachos';
import PantallaVentaExterna from '../screens/PantallaVentaExterna';
import PantallaProductosDespacho from '../screens/PantallaProductosDespacho';
import PantallaPedidos from '../screens/PantallaPedidos';
import PantallaDetallePedido from '../screens/PantallaDetallePedido';
import PantallaMerma from '../screens/PantallaMerma';

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

export default function RootNavigator() {
  return (
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
  );
}
