import { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { obtenerTurnoAbierto, crearTurno, obtenerResumenTurno } from '../database/turnos';
import { Turno } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Inicio'>;
};

export default function PantallaInicio({ navigation }: Props) {
  const [turnoActual, setTurnoActual] = useState<Turno | null>(null);
  const [totalesActuales, setTotalesActuales] = useState({ efectivo: 0, transferencia: 0 });
  const [abriendoTurno, setAbriendoTurno] = useState(false);
  const abriendoTurnoRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      async function cargarTurno() {
        try {
          const turno = await obtenerTurnoAbierto();
          setTurnoActual(turno);
          if (turno) {
            const resumen = await obtenerResumenTurno(turno.id);
            setTotalesActuales({
              efectivo: resumen.totalEfectivo,
              transferencia: resumen.totalTransferencia
            });
          }
        } catch (error) {
          console.error('Error al cargar turno:', error);
        }
      }
      cargarTurno();
    }, [])
  );

  async function handleAbrirTurno() {
    // Guard contra doble tap
    if (abriendoTurnoRef.current) return;
    abriendoTurnoRef.current = true;
    setAbriendoTurno(true);

    try {
      await crearTurno();
      const turno = await obtenerTurnoAbierto();
      setTurnoActual(turno);
      if (turno) {
        setTotalesActuales({ efectivo: 0, transferencia: 0 });
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
        <View style={estilos.cabecera}>
          <Text style={estilos.titulo}>MiCaja</Text>
          <View style={[
            estilos.indicadorTurno,
            turnoActual ? estilos.turnoAbierto : estilos.turnoCerrado
          ]}>
            <Ionicons 
              name={turnoActual ? "checkmark-circle" : "alert-circle"} 
              size={18} 
              color={turnoActual ? "#2f855a" : "#c53030"} 
            />
            <Text style={[estilos.textoIndicador, { color: turnoActual ? "#2f855a" : "#c53030" }]}>
              {turnoActual ? 'Turno Abierto' : 'Turno Cerrado'}
            </Text>
          </View>
        </View>

        {turnoActual && (
          <View style={estilos.tarjetaTurno}>
            <Text style={estilos.tarjetaTitulo}>Sesión actual</Text>
            <Text style={estilos.tarjetaInfo}>Iniciado: {formatearFecha(turnoActual.fecha_inicio)}</Text>
            <View style={estilos.filaTotales}>
              <View style={estilos.colTotal}>
                <Text style={estilos.totalEtiqueta}>💵 Efectivo</Text>
                <Text style={estilos.totalValor}>${totalesActuales.efectivo.toFixed(2)}</Text>
              </View>
              <View style={estilos.colTotal}>
                <Text style={estilos.totalEtiqueta}>📱 Transf.</Text>
                <Text style={estilos.totalValor}>${totalesActuales.transferencia.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {!turnoActual && (
          <TouchableOpacity 
            style={[
              estilos.botonAbrirTurno,
              abriendoTurno && estilos.botonAbrirTurnoDeshabilitado
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

        <View style={estilos.grid}>
          <TouchableOpacity 
            style={[
              estilos.tarjetaAccion, 
              { backgroundColor: turnoActual ? '#38a169' : '#a0aec0' }
            ]} 
            onPress={() => turnoActual 
              ? navigation.navigate('Venta') 
              : handleAccionSinTurno('registrar ventas')
            }
          >
            <Ionicons name="cart" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Venta</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              estilos.tarjetaAccion, 
              { backgroundColor: turnoActual ? '#d69e2e' : '#a0aec0' }
            ]} 
            onPress={() => turnoActual 
              ? navigation.navigate('Entrada') 
              : handleAccionSinTurno('registrar entradas de mercancía')
            }
          >
            <Ionicons name="download" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Entrada</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[estilos.tarjetaAccion, { backgroundColor: '#2b6cb0' }]} 
            onPress={() => navigation.navigate('Inventario')}
          >
            <Ionicons name="cube" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Inventario</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[estilos.tarjetaAccion, { backgroundColor: '#805ad5' }]} 
            onPress={() => navigation.navigate('UltimasVentas')}
          >
            <Ionicons name="receipt" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Resumen de Ventas</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              estilos.tarjetaAccion, 
              { backgroundColor: turnoActual ? '#ed64a6' : '#a0aec0' }
            ]} 
            onPress={() => turnoActual 
              ? navigation.navigate('SalidaFamiliar') 
              : handleAccionSinTurno('registrar salidas familiares')
            }
          >
            <Ionicons name="people" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Salida Familiar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[estilos.tarjetaAccion, { backgroundColor: '#4a5568' }]} 
            onPress={() => navigation.navigate('Historial')}
          >
            <Ionicons name="bar-chart" size={32} color="#ffffff" />
            <Text style={estilos.textoTarjeta}>Historial</Text>
          </TouchableOpacity>

          {turnoActual && (
            <TouchableOpacity 
              style={[estilos.tarjetaAccion, { backgroundColor: '#e53e3e' }]} 
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
  contenedor: { flex: 1, backgroundColor: '#f0f4f8' },
  scrollContent: { padding: 20 },
  cabecera: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24,
    marginTop: 10
  },
  titulo: { fontSize: 32, fontWeight: 'bold', color: '#1a1a2e' },
  indicadorTurno: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 20,
    borderWidth: 1
  },
  turnoAbierto: { backgroundColor: '#c6f6d5', borderColor: '#9ae6b4' },
  turnoCerrado: { backgroundColor: '#fed7d7', borderColor: '#feb2b2' },
  textoIndicador: { fontSize: 13, fontWeight: '700' },
  tarjetaTurno: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tarjetaTitulo: { fontSize: 14, color: '#718096', fontWeight: '600', marginBottom: 4 },
  tarjetaInfo: { fontSize: 18, color: '#1a1a2e', fontWeight: 'bold', marginBottom: 16 },
  filaTotales: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#edf2f7', paddingTop: 16 },
  colTotal: { flex: 1 },
  totalEtiqueta: { fontSize: 12, color: '#718096', marginBottom: 2 },
  totalValor: { fontSize: 20, color: '#2d3748', fontWeight: 'bold' },
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  botonAbrirTurnoDeshabilitado: {
    backgroundColor: '#2c7cc1', // azul más apagado para indicar procesando
    elevation: 1,
  },
  textoBotonAbrir: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    gap: 16 
  },
  tarjetaAccion: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  textoTarjeta: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
});