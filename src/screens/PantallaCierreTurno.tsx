import { View, StyleSheet, ScrollView, TouchableOpacity, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useCierreTurno } from '../hooks/useCierreTurno';
import SeccionResumenVentas from '../components/cierre/SeccionResumenVentas';
import SeccionDespachosExternos from '../components/cierre/SeccionDespachosExternos';
import SeccionCuadreCaja from '../components/cierre/SeccionCuadreCaja';
import SeccionMermas from '../components/cierre/SeccionMermas';
import SeccionAdvertenciaPedidos from '../components/cierre/SeccionAdvertenciaPedidos';
import SeccionInventarioComparadoCierre from '../components/cierre/SeccionInventarioComparadoCierre';
import SeccionResumenDias from '../components/cierre/SeccionResumenDias';
import ModalEditarMovimiento from '../components/cierre/ModalEditarMovimiento';
import SeccionCambiosPrecio from '../components/cierre/SeccionCambiosPrecio';
import SeccionSalidasFamiliares from '../components/cierre/SeccionSalidasFamiliares';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CierreTurno'>;
};

export default function PantallaCierreTurno({ navigation }: Props) {
  const {
    cargando,
    sinTurno,
    totalEfectivo,
    totalTransferencia,
    entradas,
    salidasFamiliares,
    inventario,
    cantidadVentas,
    cantidadAnulaciones,
    resumenDespachos,
    efectivoReal,
    procesando,
    refrescando,
    pedidosAbiertos,
    mermas,
    totalPropinas,
    mermasExpandidas,
    toggleMerma,
    cargarResumen,
    handleRefresh,
    handleCambioEfectivo,
    handleBlurEfectivo,
    calcularDiferencia,
    handleCerrarTurno,
    inventarioInicial,
    resumenDias,
    diasPlanificados,
    diaActivo,
    itemEditando,
    abrirEditarSalida,
    abrirEditarMerma,
    cerrarEdicion,
    guardarEdicionItem,
    eliminarItemEditando,
    cambiosPrecio,
  } = useCierreTurno(navigation);

  if (cargando || sinTurno) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#2b6cb0" />
        </View>
      </SafeAreaView>
    );
  }

  const totalGeneral = totalEfectivo + totalTransferencia;
  const resultadoCuadre = calcularDiferencia();

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={handleRefresh}
            tintColor="#2b6cb0"
          />
        }
      >

        <SeccionResumenDias
          dias={resumenDias}
          diasPlanificados={diasPlanificados}
        />

        <SeccionResumenVentas
          cantidadVentas={cantidadVentas}
          cantidadAnulaciones={cantidadAnulaciones}
          totalEfectivo={totalEfectivo}
          totalTransferencia={totalTransferencia}
          totalPropinas={totalPropinas}
          cargando={cargando}
          onRefrescar={cargarResumen}
        />

        <SeccionCambiosPrecio cambios={cambiosPrecio} />

        <SeccionDespachosExternos
          despachos={resumenDespachos}
          totalGeneral={totalGeneral}
        />

        <SeccionCuadreCaja
          efectivoReal={efectivoReal}
          totalEfectivo={totalEfectivo}
          resultadoCuadre={resultadoCuadre}
          onCambioEfectivo={handleCambioEfectivo}
          onBlurEfectivo={handleBlurEfectivo}
        />

        <SeccionMermas
          mermas={mermas}
          mermasExpandidas={mermasExpandidas}
          onToggle={toggleMerma}
          onEditarItem={abrirEditarMerma}
        />

        <SeccionSalidasFamiliares
          salidas={salidasFamiliares}
          onEditarItem={abrirEditarSalida}
        />

        <SeccionInventarioComparadoCierre
          inventarioInicial={inventarioInicial}
          inventarioCierre={inventario}
          entradas={entradas}
        />

        <SeccionAdvertenciaPedidos pedidos={pedidosAbiertos} />

        <TouchableOpacity
          style={[estilos.botonCerrar, procesando && estilos.botonDeshabilitado]}
          onPress={handleCerrarTurno}
          disabled={procesando}
        >
          <Text style={estilos.textoBotonCerrar}>
            {procesando ? 'Cerrando turno...' : 'CERRAR TURNO'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <ModalEditarMovimiento
        visible={itemEditando !== null}
        titulo={itemEditando?.tipo === 'salida' ? 'Editar salida familiar' : 'Editar merma'}
        nombreProducto={itemEditando?.nombre ?? ''}
        cantidadActual={itemEditando?.cantidad ?? 0}
        mostrarPersona={itemEditando?.tipo === 'salida'}
        personaActual={itemEditando?.tipo === 'salida' ? itemEditando.persona : null}
        onGuardar={guardarEdicionItem}
        onEliminar={eliminarItemEditando}
        onCancelar={cerrarEdicion}
      />
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
  botonCerrar: {
    backgroundColor: '#e53e3e', 
    borderRadius: 16,
    padding: 20, 
    margin: 16, 
    marginTop: 20,
    alignItems: 'center', 
    elevation: 3,
  },
  botonDeshabilitado: { 
    backgroundColor: '#a0aec0' 
  },
  textoBotonCerrar: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
});