import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { obtenerDetalleTurno } from '../database/turnos';
import { Turno } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DetalleTurno'>;
  route: RouteProp<RootStackParamList, 'DetalleTurno'>;
};

export default function PantallaDetalleTurno({ route }: Props) {
  const { turnoId } = route.params;
  const [cargando, setCargando] = useState(true);
  const [turno, setTurno] = useState<Turno | null>(null);
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalTransferencia, setTotalTransferencia] = useState(0);
  const [entradas, setEntradas] = useState<{ nombre: string; cantidad: number; fecha_hora: string }[]>([]);
  const [inventario, setInventario] = useState<{ nombre: string; existencia: number; alerta_minima: number }[]>([]);

  useEffect(() => {
    cargarDetalle();
  }, []);

  async function cargarDetalle() {
    setCargando(true);
    const detalle = await obtenerDetalleTurno(turnoId);
    if (detalle) {
      setTurno(detalle.turno);
      setTotalEfectivo(detalle.totalEfectivo);
      setTotalTransferencia(detalle.totalTransferencia);
      setEntradas(detalle.entradas);
      setInventario(detalle.inventario);
    }
    setCargando(false);
  }

  function formatearFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-CU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatearHora(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' });
  }

  if (cargando) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator size="large" color="#2b6cb0" />
      </View>
    );
  }

  if (!turno) {
    return (
      <View style={estilos.centrado}>
        <Text style={estilos.textoVacio}>No se encontró el turno.</Text>
      </View>
    );
  }

  const totalGeneral = totalEfectivo + totalTransferencia;
  const efectivoReal = turno.efectivo_real ?? 0;
  const diferencia = totalEfectivo - efectivoReal;

  let cuadreTexto = '';
  let cuadreColor = '#38a169';
  if (diferencia === 0) {
    cuadreTexto = 'Caja cuadrada ✅';
    cuadreColor = '#38a169';
  } else if (diferencia > 0) {
    cuadreTexto = `Faltante: ${diferencia.toFixed(2)} CUP ⚠️`;
    cuadreColor = '#e53e3e';
  } else {
    cuadreTexto = `Sobrante: ${Math.abs(diferencia).toFixed(2)} CUP ℹ️`;
    cuadreColor = '#d69e2e';
  }

  return (
    <ScrollView style={estilos.contenedor} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Fechas del turno */}
      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>📅 Datos del turno</Text>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Apertura:</Text>
          <Text style={estilos.valor}>{formatearFecha(turno.fecha_inicio)}</Text>
        </View>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Cierre:</Text>
          <Text style={estilos.valor}>
            {turno.fecha_cierre ? formatearFecha(turno.fecha_cierre) : '—'}
          </Text>
        </View>
      </View>

      {/* Resumen de ventas */}
      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>💰 Resumen de ventas</Text>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Efectivo:</Text>
          <Text style={estilos.valor}>{totalEfectivo.toFixed(2)} CUP</Text>
        </View>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Transferencia:</Text>
          <Text style={estilos.valor}>{totalTransferencia.toFixed(2)} CUP</Text>
        </View>
        <View style={[estilos.fila, estilos.filaTotal]}>
          <Text style={estilos.etiquetaTotal}>Total general:</Text>
          <Text style={estilos.valorTotal}>{totalGeneral.toFixed(2)} CUP</Text>
        </View>
      </View>

      {/* Cuadre de caja */}
      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>🧾 Cuadre de caja</Text>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Esperado:</Text>
          <Text style={estilos.valor}>{totalEfectivo.toFixed(2)} CUP</Text>
        </View>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Real contado:</Text>
          <Text style={estilos.valor}>{efectivoReal.toFixed(2)} CUP</Text>
        </View>
        <View style={[estilos.resultadoCuadre, { borderColor: cuadreColor }]}>
          <Text style={[estilos.textoCuadre, { color: cuadreColor }]}>
            {cuadreTexto}
          </Text>
        </View>
      </View>

      {/* Entradas del turno */}
      {entradas.length > 0 && (
        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>📥 Entradas del turno</Text>
          {entradas.map((entrada, index) => (
            <View key={index} style={estilos.filaEntrada}>
              <Text style={estilos.nombreEntrada}>{entrada.nombre}</Text>
              <Text style={estilos.cantidadEntrada}>+{entrada.cantidad} unid.</Text>
              <Text style={estilos.horaEntrada}>{formatearHora(entrada.fecha_hora)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Inventario al cierre */}
      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>📦 Inventario al cierre</Text>
        {inventario.map((item, index) => {
          const colorStock = item.existencia < item.alerta_minima ? '#e53e3e' : '#38a169';
          return (
            <View key={index} style={estilos.filaInventario}>
              <Text style={estilos.nombreInventario} numberOfLines={1}>{item.nombre}</Text>
              <Text style={[estilos.stockInventario, { color: colorStock }]}>
                {item.existencia} unid.
              </Text>
            </View>
          );
        })}
      </View>

    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoVacio: {
    fontSize: 16,
    color: '#718096',
  },
  seccion: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    elevation: 2,
  },
  tituloSeccion: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 14,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  etiqueta: {
    fontSize: 15,
    color: '#4a5568',
  },
  valor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  filaTotal: {
    borderBottomWidth: 0,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
  },
  etiquetaTotal: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  valorTotal: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#2b6cb0',
  },
  resultadoCuadre: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  textoCuadre: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  filaEntrada: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    gap: 8,
  },
  nombreEntrada: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a2e',
  },
  cantidadEntrada: {
    fontSize: 15,
    fontWeight: '600',
    color: '#38a169',
  },
  horaEntrada: {
    fontSize: 13,
    color: '#a0aec0',
    width: 48,
    textAlign: 'right',
  },
  filaInventario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  nombreInventario: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a2e',
    marginRight: 8,
  },
  stockInventario: {
    fontSize: 15,
    fontWeight: '600',
  },
});