import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useDetalleTurno } from '../hooks/useDetalleTurno';
import SeccionDatosTurno from '../components/detalleTurno/SeccionDatosTurno';
import SeccionResumenVentasTurno from '../components/detalleTurno/SeccionResumenVentasTurno';
import SeccionCuadreCajaTurno from '../components/detalleTurno/SeccionCuadreCajaTurno';
import SeccionVentasTurno from '../components/detalleTurno/SeccionVentasTurno';
import SeccionAnulacionesTurno from '../components/detalleTurno/SeccionAnulacionesTurno';
import SeccionDespachosDetalle from '../components/detalleTurno/SeccionDespachosDetalle';
import SeccionMovimientosTurno from '../components/detalleTurno/SeccionMovimientosTurno';
import SeccionMermasTurno from '../components/detalleTurno/SeccionMermasTurno';
import SeccionInventarioTurno from '../components/detalleTurno/SeccionInventarioTurno';
import SeccionInventarioInicialTurno from '../components/detalleTurno/SeccionInventarioInicialTurno';

type Props = {
  route: RouteProp<RootStackParamList, 'DetalleTurno'>;
};

export default function PantallaDetalleTurno({ route }: Props) {
  const { turnoId } = route.params;
  const hook = useDetalleTurno(turnoId);

  if (hook.cargando) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#2b6cb0" />
        </View>
      </SafeAreaView>
    );
  }

  if (!hook.turno) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}>
          <Text style={estilos.textoVacio}>No se encontró el turno.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      <ScrollView style={estilos.scroll} contentContainerStyle={{ paddingBottom: 40 }}>

        <SeccionDatosTurno
          turno={hook.turno}
          formatearFecha={hook.formatearFecha}
        />

        <SeccionResumenVentasTurno
          cantidadVentas={hook.cantidadVentas}
          cantidadAnulaciones={hook.cantidadAnulaciones}
          totalEfectivo={hook.totalEfectivo}
          totalTransferencia={hook.totalTransferencia}
          totalPropinas={hook.totalPropinas}
        />

        <SeccionCuadreCajaTurno
          totalEfectivo={hook.totalEfectivo}
          efectivoReal={hook.efectivoReal}
          cuadreTexto={hook.cuadreTexto}
          cuadreColor={hook.cuadreColor}
          cuadreIcono={hook.cuadreIcono}
        />

        <SeccionVentasTurno
          ventas={hook.ventas}
          ventasExpandidas={hook.ventasExpandidas}
          onToggle={hook.toggleVenta}
          formatearHora={hook.formatearHora}
        />

        <SeccionAnulacionesTurno
          anulaciones={hook.anulaciones}
          formatearHora={hook.formatearHora}
        />

        <SeccionDespachosDetalle
          resumenDespachos={hook.resumenDespachos}
        />

        <SeccionMovimientosTurno
          entradas={hook.entradas}
          salidasFamiliares={hook.salidasFamiliares}
          formatearHora={hook.formatearHora}
        />

        <SeccionMermasTurno
          mermas={hook.mermas}
          mermasExpandidas={hook.mermasExpandidas}
          onToggle={hook.toggleMerma}
        />

        <SeccionInventarioInicialTurno
          inventario={hook.inventarioInicial}
        />

        <SeccionInventarioTurno
          inventario={hook.inventario}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { 
    flex: 1, 
    backgroundColor: '#f0f4f8' 
  },
  centrado: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  scroll: { 
    flex: 1 
  },
  textoVacio: { 
    fontSize: 16, 
    color: '#718096', 
    textAlign: 'center' 
  },
});