import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import {
  obtenerTurnoAbierto,
  crearTurno,
  obtenerResumenTurno,
} from '../database/turnos';
import { obtenerPedidosAbiertos } from '../database/pedidos';
import { Turno } from '../types';
import { obtenerResumenExternoPorDespacho } from '../database/despachos';


type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Inicio'>;
};

export default function PantallaInicio({ navigation }: Props) {
  const [turnoActual, setTurnoActual] = useState<Turno | null>(null);
  const [totalesActuales, setTotalesActuales] = useState({
    efectivo: 0,
    transferencia: 0,
  });
  const [pedidosAbiertos, setPedidosAbiertos] = useState(0);
  const [totalPropinas, setTotalPropinas] = useState(0);
  const [abriendoTurno, setAbriendoTurno] = useState(false);
  const [totalDespachos, setTotalDespachos] = useState(0);
  const [cantidadDespachos, setCantidadDespachos] = useState(0);
  const abriendoTurnoRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      async function cargarTurno() {
        try {
          const turno = await obtenerTurnoAbierto();
          setTurnoActual(turno);
          if (turno) {
            const [resumen, pedidos, despachos] = await Promise.all([
              obtenerResumenTurno(turno.id),
              obtenerPedidosAbiertos(turno.id),
              obtenerResumenExternoPorDespacho(turno.id),
            ]);
            setTotalesActuales({
              // Sumamos las propinas al efectivo porque son dinero físico
              // que también entra a la caja (independiente de si vienen de
              // ventas normales o de pedidos 100% externos).
              efectivo: resumen.totalEfectivo + resumen.totalPropinas,
              transferencia: resumen.totalTransferencia,
            });
            setPedidosAbiertos(pedidos.length);
            setTotalPropinas(resumen.totalPropinas);

            // Calcular total de despachos externos
            const totalExt = despachos.reduce(
              (acc: number, d: any) => acc + d.total_efectivo + d.total_transferencia,
              0
            );
            setTotalDespachos(totalExt);
            setCantidadDespachos(despachos.length);
          } else {
            setPedidosAbiertos(0);
            setTotalDespachos(0);
            setCantidadDespachos(0);
            setTotalPropinas(0); 
          }
        } catch (error) {
          console.error('Error al cargar turno:', error);
        }
      }
      cargarTurno();
    }, [])
  );

  // Muestra la advertencia de inventario y luego ejecuta la apertura si confirman
  function handleAbrirTurno() {
    Alert.alert(
      '¿Listo para iniciar el turno?',
      'Antes de comenzar, asegúrate de:\n\n' +
      '📦  Revisar que el inventario refleje el stock real.\n' +
      '💰  Tener el precio de tus productos actualizado.\n' +
      'El inventario al momento de iniciar se guardará como referencia del turno.',
      [
        {
          text: 'Revisar inventario',
          onPress: () => navigation.navigate('Inventario'),
        },
        {
          text: 'Iniciar turno',
          style: 'default',
          onPress: ejecutarAperturaTurno,
        },
      ]
    );
  }

  // Lógica real de apertura, separada de la advertencia
  async function ejecutarAperturaTurno() {
    if (abriendoTurnoRef.current) return;
    abriendoTurnoRef.current = true;
    setAbriendoTurno(true);
    try {
      await crearTurno();
      const turno = await obtenerTurnoAbierto();
      setTurnoActual(turno);
      if (turno) {
        setTotalesActuales({ efectivo: 0, transferencia: 0 });
        setPedidosAbiertos(0);
      }
    } catch (error) {
      console.error('Error al abrir turno:', error);
      Alert.alert('Error', 'No se pudo iniciar el turno. Intenta de nuevo.');
    } finally {
      abriendoTurnoRef.current = false;
      setAbriendoTurno(false);
    }
  }

  function handleAccionSinTurno(nombreAccion: string) {
    Alert.alert(
      'Turno cerrado',
      `Para ${nombreAccion} necesitas iniciar un nuevo turno primero.`,
      [{ text: 'Entendido', style: 'default' }]
    );
  }

  function formatearFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-CU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={estilos.scrollContent}>

        {/* ── Cabecera ── */}
        <View style={estilos.cabecera}>
          <Text style={estilos.titulo}>MiCaja</Text>
          <View
            style={[
              estilos.indicadorTurno,
              turnoActual ? estilos.turnoAbierto : estilos.turnoCerrado,
            ]}
          >
            <Ionicons
              name={turnoActual ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={turnoActual ? '#2f855a' : '#c53030'}
            />
            <Text
              style={[
                estilos.textoIndicador,
                { color: turnoActual ? '#2f855a' : '#c53030' },
              ]}
            >
              {turnoActual ? 'Turno Abierto' : 'Turno Cerrado'}
            </Text>
          </View>
        </View>

        {/* ── Tarjeta del turno activo ── */}
        {turnoActual && (
          <View style={estilos.tarjetaTurno}>
            <Text style={estilos.tarjetaTitulo}>Sesión actual</Text>
            <Text style={estilos.tarjetaInfo}>
              Iniciado: {formatearFecha(turnoActual.fecha_inicio)}
            </Text>
            <View style={estilos.filaTotales}>
            <View style={estilos.colTotal}>
              <Text style={estilos.totalEtiqueta}>💵 Efectivo</Text>
              <Text style={estilos.totalValor}>
                ${totalesActuales.efectivo.toFixed(2)}
              </Text>
            </View>
            <View style={estilos.colTotal}>
              <Text style={estilos.totalEtiqueta}>📱 Transf.</Text>
              <Text style={estilos.totalValor}>
                ${totalesActuales.transferencia.toFixed(2)}
              </Text>
            </View>
          </View>

          {totalPropinas > 0 && (
            <View style={estilosLocal.notaPropinas}>
              <Ionicons name="star" size={14} color="#b7791f" />
              <Text style={estilosLocal.textoNotaPropinas}>
                Incluye {totalPropinas.toFixed(2)} CUP en propinas
              </Text>
            </View>
          )}

          {/* Nota de despachos externos */}
          {cantidadDespachos > 0 && (
            <View style={estilosLocal.notaDespachos}>
              <Ionicons name="storefront-outline" size={14} color="#2c7a7b" />
              <Text style={estilosLocal.textoNotaDespachos}>
                +${totalDespachos.toFixed(2)} CUP de {cantidadDespachos}{' '}
                despacho{cantidadDespachos > 1 ? 's' : ''} externos{' '}
                <Text style={estilosLocal.textoNotaDespachosAclaracion}>
                  (no es tuyo)
                </Text>
            </Text>
            </View>
          )}
          </View>
        )}

        {/* ── Botón abrir turno ── */}
        {!turnoActual && (
          <TouchableOpacity
            style={[
              estilos.botonAbrirTurno,
              abriendoTurno && estilos.botonAbrirTurnoDeshabilitado,
            ]}
            onPress={handleAbrirTurno}
            disabled={abriendoTurno}
            activeOpacity={0.8}
          >
            {abriendoTurno ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={estilos.textoBotonAbrir}>INICIANDO...</Text>
              </>
            ) : (
              <>
                <Ionicons name="play" size={24} color="#ffffff" />
                <Text style={estilos.textoBotonAbrir}>INICIAR NUEVO TURNO</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* ── Grid de acciones ── */}
        <View style={estilos.grid}>

          {/* ── PEDIDOS (destacado, ancho completo cuando hay pedidos abiertos) ── */}
          <TouchableOpacity
            style={[
              estilos.tarjetaAccion,
              estilos.tarjetaPedidos,
              turnoActual ? { backgroundColor: '#e53e3e' } : { backgroundColor: '#a0aec0' },
              pedidosAbiertos > 0 && estilos.tarjetaPedidosConBadge,
            ]}
            onPress={() =>
              turnoActual
                ? navigation.navigate('Pedidos')
                : handleAccionSinTurno('gestionar pedidos')
            }
          >
            <View style={estilos.filaIconoPedido}>
              <Ionicons name="restaurant" size={32} color="#ffffff" />
              {pedidosAbiertos > 0 && (
                <View style={estilos.badgePedidos}>
                  <Text style={estilos.textoBadgePedidos}>{pedidosAbiertos}</Text>
                </View>
              )}
            </View>
            <Text style={estilos.textoTarjeta}>Pedidos</Text>
            {pedidosAbiertos > 0 && (
              <Text style={estilos.subtextoTarjeta}>
                {pedidosAbiertos} abierto{pedidosAbiertos > 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>

          {/* Venta */}
          <TouchableOpacity
            style={[
              estilos.tarjetaAccion,
              { backgroundColor: turnoActual ? '#38a169' : '#a0aec0' },
            ]}
            onPress={() =>
              turnoActual
                ? navigation.navigate('Venta')
                : handleAccionSinTurno('registrar ventas')
            }
          >
            <Ionicons name="cart" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Venta</Text>
          </TouchableOpacity>

          {/* Entrada */}
          <TouchableOpacity
            style={[
              estilos.tarjetaAccion,
              { backgroundColor: turnoActual ? '#d69e2e' : '#a0aec0' },
            ]}
            onPress={() =>
              turnoActual
                ? navigation.navigate('Entrada')
                : handleAccionSinTurno('registrar entradas de mercancía')
            }
          >
            <Ionicons name="download" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Entrada</Text>
          </TouchableOpacity>

          {/* Inventario */}
          <TouchableOpacity
            style={[estilos.tarjetaAccion, { backgroundColor: '#2b6cb0' }]}
            onPress={() => navigation.navigate('Inventario')}
          >
            <Ionicons name="cube" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Inventario</Text>
          </TouchableOpacity>

          {/* Resumen de ventas */}
          <TouchableOpacity
            style={[estilos.tarjetaAccion, { backgroundColor: '#805ad5' }]}
            onPress={() =>
              turnoActual
                ? navigation.navigate('UltimasVentas')
                : handleAccionSinTurno('ver el resumen de ventas')
            }
          >
            <Ionicons name="receipt" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Resumen de Ventas</Text>
          </TouchableOpacity>

          {/* Salida Familiar */}
          <TouchableOpacity
            style={[
              estilos.tarjetaAccion,
              { backgroundColor: turnoActual ? '#ed64a6' : '#a0aec0' },
            ]}
            onPress={() =>
              turnoActual
                ? navigation.navigate('SalidaFamiliar')
                : handleAccionSinTurno('registrar salidas familiares')
            }
          >
            <Ionicons name="people" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Salida Familiar</Text>
          </TouchableOpacity>

          {/* Merma */}
          <TouchableOpacity
            style={[
              estilos.tarjetaAccion,
              { backgroundColor: turnoActual ? '#c05621' : '#a0aec0' },
            ]}
            onPress={() =>
              turnoActual
                ? navigation.navigate('Merma')
                : handleAccionSinTurno('registrar mermas')
            }
          >
            <Ionicons name="trash-outline" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Merma</Text>
          </TouchableOpacity>

          {/* Despachos Externos */}
          <TouchableOpacity
            style={[
              estilos.tarjetaAccion,
              { backgroundColor: turnoActual ? '#319795' : '#a0aec0' },
            ]}
            onPress={() =>
              turnoActual
                ? navigation.navigate('Despachos')
                : handleAccionSinTurno('registrar ventas de despachos externos')
            }
          >
            <Ionicons name="storefront" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Despachos</Text>
          </TouchableOpacity>

          {/* Historial */}
          <TouchableOpacity
            style={[estilos.tarjetaAccion, { backgroundColor: '#4a5568' }]}
            onPress={() => navigation.navigate('Historial')}
          >
            <Ionicons name="bar-chart" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Historial</Text>
          </TouchableOpacity>

          {/* Cerrar turno — solo visible cuando hay turno abierto */}
          {turnoActual && (
            <TouchableOpacity
              style={[estilos.tarjetaAccion, { backgroundColor: '#718096' }]}
              onPress={() => navigation.navigate('CierreTurno')}
            >
              <Ionicons name="lock-closed" size={32} color="#ffffff" />
              <Text style={estilos.textoTarjeta}>Cerrar</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { 
    flex: 1, 
    backgroundColor: '#f0f4f8' 
  },
  scrollContent: { 
    padding: 20 
  },

  // Cabecera
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  titulo: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#1a1a2e' 
  },
  indicadorTurno: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    paddingVertical: 6, 
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  turnoAbierto: { 
    backgroundColor: '#c6f6d5', 
    borderColor: '#9ae6b4'
   },
  turnoCerrado: { 
    backgroundColor: '#fed7d7', 
    borderColor: '#feb2b2' 
  },
  textoIndicador: { 
    fontSize: 13, 
    fontWeight: '700' 
  },

  // Tarjeta turno activo
  tarjetaTurno: {
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    padding: 20,
    marginBottom: 24, 
    elevation: 4,
    shadowColor: '#000', 
    shadowOffset: { 
      width: 0, 
      height: 2 
    },
    shadowOpacity: 0.1, 
    shadowRadius: 4,
  },
  tarjetaTitulo: { 
    fontSize: 14, 
    color: '#718096', 
    fontWeight: '600', 
    marginBottom: 4 
  },
  tarjetaInfo: { 
    fontSize: 18, 
    color: '#1a1a2e', 
    fontWeight: 'bold', 
    marginBottom: 16 
  },
  filaTotales: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    borderTopWidth: 1, 
    borderTopColor: '#edf2f7', 
    paddingTop: 16,
  },
  colTotal: { 
    flex: 1 
  },
  totalEtiqueta: { 
    fontSize: 12, 
    color: '#718096', 
    marginBottom: 2 
  },
  totalValor: { 
    fontSize: 20, 
    color: '#2d3748', 
    fontWeight: 'bold'
  },

  // Botón abrir turno
  botonAbrirTurno: {
    backgroundColor: '#3182ce', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 24,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12,
    elevation: 4, 
    shadowColor: '#000',
    shadowOffset: { 
      width: 0, 
      height: 2 
    }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4,
  },
  botonAbrirTurnoDeshabilitado: { 
    backgroundColor: '#2c7cc1', 
    elevation: 1 
  },
  textoBotonAbrir: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: '900' 
  },

  // Grid
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    gap: 16 
  },

  // Tarjeta genérica
  tarjetaAccion: {
    width: '47%',
    aspectRatio: 1, 
    borderRadius: 20, 
    padding: 20,
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 5, 
    shadowColor: '#000',
    shadowOffset: { 
      width: 0, 
      height: 3 
    }, 
    shadowOpacity: 0.2, 
    shadowRadius: 5,
  },
  textoTarjeta: {
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginTop: 12, 
    textAlign: 'center',
  },
  subtextoTarjeta: {
    color: 'rgba(255,255,255,0.8)', 
    fontSize: 12, 
    fontWeight: '600', 
    marginTop: 4,
  },

  // Tarjeta Pedidos (ancho completo)
  tarjetaPedidos: {
    width: '100%',
    aspectRatio: undefined,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    gap: 16,
  },
  tarjetaPedidosConBadge: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  filaIconoPedido: { 
    position: 'relative' 
  },
  badgePedidos: {
    position: 'absolute', 
    top: -6, 
    right: -10,
    backgroundColor: '#ffffff', 
    borderRadius: 10,
    minWidth: 20, 
    height: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5, 
    borderColor: '#e53e3e',
  },
  textoBadgePedidos: { 
    fontSize: 11, 
    fontWeight: '900', 
    color: '#e53e3e' 
  },
});

const estilosLocal = StyleSheet.create({
  notaDespachos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e6fffa',
    borderWidth: 1,
    borderColor: '#81e6d9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  textoNotaDespachos: {
    flex: 1,
    fontSize: 13,
    color: '#2c7a7b',
    fontWeight: '600',
  },
  textoNotaDespachosAclaracion: {
    fontSize: 12,
    color: '#4fd1c5',
    fontWeight: '400',
    fontStyle: 'italic',
  },
  notaPropinas: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  backgroundColor: '#fffff0',
  borderWidth: 1,
  borderColor: '#f6e05e',
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 8,
  marginTop: 8,
},
textoNotaPropinas: {
  flex: 1,
  fontSize: 13,
  color: '#b7791f',
  fontWeight: '600',
},
});