import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { obtenerDetalleTurno } from '../database/turnos';
import { obtenerVentasTurnoActual, obtenerAnulacionesTurno } from '../database/cancelaciones';
import { Turno, VentaAgrupada } from '../types';
import { formatCUP } from '../utils';
import { obtenerResumenExternoDetalleTurno } from '../database/despachos';
import { obtenerMermasTurno, MermaAgrupada, etiquetaMotivo } from '../database/mermas';

type Props = {
  route: RouteProp<RootStackParamList, 'DetalleTurno'>;
};

export default function PantallaDetalleTurno({ route }: Props) {
  const { turnoId } = route.params;
  const [cargando, setCargando] = useState(true);
  const [turno, setTurno] = useState<Turno | null>(null);
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalTransferencia, setTotalTransferencia] = useState(0);
  const [entradas, setEntradas] = useState<{ nombre: string; cantidad: number; fecha_hora: string }[]>([]);
  const [salidasFamiliares, setSalidasFamiliares] = useState<{ nombre: string; cantidad: number; fecha_hora: string }[]>([]);
  const [cantidadVentas, setCantidadVentas] = useState(0);
  const [cantidadAnulaciones, setCantidadAnulaciones] = useState(0);
  const [ventas, setVentas] = useState<VentaAgrupada[]>([]);
  const [ventasExpandidas, setVentasExpandidas] = useState<Set<string>>(new Set());
  const [mermasExpandidas, setMermasExpandidas] = useState<Set<string>>(new Set());
  const [anulaciones, setAnulaciones] = useState<VentaAgrupada[]>([]);
  const [inventario, setInventario] = useState<{ nombre: string; existencia: number; alerta_minima: number }[]>([]);
  const [resumenDespachos, setResumenDespachos] = useState<{ despacho_id: number; despacho_nombre: string; despacho_color: string; total_efectivo: number; total_transferencia: number; cantidad_ventas: number; }[]>([]);
  const [mermas, setMermas] = useState<MermaAgrupada[]>([]);
  const [totalPropinas, setTotalPropinas] = useState(0);

  useEffect(() => {
    cargarDetalle();
  }, []);

  async function cargarDetalle() {
    setCargando(true);
    try {
      const detalle = await obtenerDetalleTurno(turnoId);
      if (!detalle) {
        setCargando(false);
        return;
      }

      setTurno(detalle.turno);
      setTotalEfectivo(detalle.totalEfectivo);
      setTotalTransferencia(detalle.totalTransferencia);
      setEntradas(detalle.entradas);
      setSalidasFamiliares(detalle.salidasFamiliares);
      setInventario(detalle.inventario);
      setCantidadVentas(detalle.cantidadVentas);
      setCantidadAnulaciones(detalle.cantidadAnulaciones);

      setTotalPropinas(detalle.totalPropinas ?? 0);

      // Una sola fuente de verdad para ventas y anulaciones.
      // obtenerVentasTurnoActual y obtenerAnulacionesTurno (cancelaciones.ts)
      // devuelven VentaAgrupada completa con producto_id, que es el tipo correcto.
      const [listaVentas, listaAnulaciones, listaDespachos, listaMermas] = await Promise.all([
        obtenerVentasTurnoActual(turnoId),
        obtenerAnulacionesTurno(turnoId),
        obtenerResumenExternoDetalleTurno(turnoId),
        obtenerMermasTurno(turnoId),
      ]);

      setVentas(listaVentas);
      setAnulaciones(listaAnulaciones);
      setResumenDespachos(listaDespachos);
      setMermas(listaMermas);
    } catch (error) {
      console.error('Error al cargar detalle del turno:', error);
    } finally {
      setCargando(false);
    }
  }

  function toggleVenta(ventaId: string) {
    setVentasExpandidas(prev => {
      const nueva = new Set(prev);
      if (nueva.has(ventaId)) {
        nueva.delete(ventaId);
      } else {
        nueva.add(ventaId);
      }
      return nueva;
    });
  }

  function toggleMerma(grupoId: string) {
    setMermasExpandidas(prev => {
      const nueva = new Set(prev);
      if (nueva.has(grupoId)) {
        nueva.delete(grupoId);
      } else {
        nueva.add(grupoId);
      }
      return nueva;
    });
  }

  function formatearFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-CU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  function formatearHora(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleTimeString('es-CU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true, 
    });
  }

  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#2b6cb0" />
        </View>
      </SafeAreaView>
    );
  }

  if (!turno) {
    return (
      <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
        <View style={estilos.centrado}>
          <Text style={estilos.textoVacio}>No se encontró el turno.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalGeneral = totalEfectivo + totalTransferencia;
  const efectivoReal = turno.efectivo_real ?? 0;
  const diferencia = totalEfectivo - efectivoReal;

  let cuadreTexto = '';
  let cuadreColor = '#38a169';
  let cuadreIcono: any = 'checkmark-circle';
  
  if (diferencia === 0) {
    cuadreTexto = 'Caja cuadrada';
    cuadreColor = '#38a169';
    cuadreIcono = 'checkmark-circle';
  } else if (diferencia > 0) {
    cuadreTexto = `Faltante: ${formatCUP(diferencia)} CUP`; 
    cuadreColor = '#e53e3e';
    cuadreIcono = 'warning';
  } else {
    cuadreTexto = `Sobrante: ${formatCUP(Math.abs(diferencia))} CUP`; 
    cuadreColor = '#d69e2e';
    cuadreIcono = 'information-circle';
  }

  return (
    <SafeAreaView style={estilos.contenedor} edges={['left', 'right', 'bottom']}>
      <ScrollView style={estilos.scroll} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Fechas del turno */}
      <View style={estilos.seccion}>
        <View style={estilos.cabeceraSeccion}>
          <Ionicons name="calendar-outline" size={20} color="#2b6cb0" />
          <Text style={estilos.tituloSeccion}>Datos del turno</Text>
        </View>
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
        <View style={estilos.cabeceraSeccion}>
          <Ionicons name="stats-chart-outline" size={20} color="#38a169" />
          <Text style={estilos.tituloSeccion}>Resumen de ventas</Text>
        </View>

        {/* Conteos de ventas y anulaciones */}
        <View style={estilos.filasConteo}>
          <View style={estilos.chipConteo}>
            <Ionicons name="checkmark-circle" size={14} color="#38a169" />
            <Text style={estilos.textoChipConteo}>
              {cantidadVentas} {cantidadVentas === 1 ? 'venta' : 'ventas'}
            </Text>
          </View>
          {cantidadAnulaciones > 0 && (
            <View style={[estilos.chipConteo, estilos.chipConteoAnulacion]}>
              <Ionicons name="close-circle" size={14} color="#e53e3e" />
              <Text style={[estilos.textoChipConteo, { color: '#e53e3e' }]}>
                {cantidadAnulaciones} anulada{cantidadAnulaciones > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={estilos.fila}>
          <View style={estilos.filaIcono}>
            <Ionicons name="cash-outline" size={16} color="#718096" />
            <Text style={estilos.etiqueta}>Efectivo:</Text>
          </View>
          <Text style={estilos.valor}>{formatCUP(totalEfectivo)} CUP</Text> 
        </View>
        <View style={estilos.fila}>
          <View style={estilos.filaIcono}>
            <Ionicons name="card-outline" size={16} color="#718096" />
            <Text style={estilos.etiqueta}>Transferencia:</Text>
          </View>
          <Text style={estilos.valor}>{formatCUP(totalTransferencia)} CUP</Text> 
        </View>
        <View style={[estilos.fila, estilos.filaTotal]}>
          <Text style={estilos.etiquetaTotal}>Total general:</Text>
          <Text style={estilos.valorTotal}>{formatCUP(totalGeneral)} CUP</Text>
        </View>

        {totalPropinas > 0 && (
          <View style={[estilos.fila, estilosLocal.filaPropina]}>
            <View style={estilosLocal.filaIconoPropina}>
              <Ionicons name="star" size={14} color="#b7791f" />
              <Text style={estilosLocal.etiquetaPropina}>Propinas recibidas:</Text>
            </View>
            <Text style={estilosLocal.valorPropina}>
              {formatCUP(totalPropinas)} CUP
            </Text>
          </View>
        )}
      </View>

      {/* Cuadre de caja */}
      <View style={estilos.seccion}>
        <View style={estilos.cabeceraSeccion}>
          <Ionicons name="receipt-outline" size={20} color="#d69e2e" />
          <Text style={estilos.tituloSeccion}>Cuadre de caja</Text>
        </View>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Esperado:</Text>
          <Text style={estilos.valor}>{formatCUP(totalEfectivo)} CUP</Text>
        </View>
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Real contado:</Text>
          <Text style={estilos.valor}>{formatCUP(efectivoReal)} CUP</Text> 
        </View>
        <View style={[estilos.resultadoCuadre, { borderColor: cuadreColor }]}>
          <Ionicons name={cuadreIcono} size={18} color={cuadreColor} />
          <Text style={[estilos.textoCuadre, { color: cuadreColor }]}>
            {cuadreTexto}
          </Text>
        </View>
      </View>

      {/* Ventas del turno */}
      {ventas.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="receipt-outline" size={20} color="#805ad5" />
            <Text style={estilos.tituloSeccion}>
              Ventas ({ventas.length})
            </Text>
          </View>

          {ventas.map((venta) => {
            const expandida = ventasExpandidas.has(venta.venta_id);
            return (
              <TouchableOpacity
                key={venta.venta_id}
                style={estilos.filaVenta}
                onPress={() => toggleVenta(venta.venta_id)}
                activeOpacity={0.7}
              >
                <View style={estilos.filaVentaCabecera}>
                  <Text style={estilos.horaVenta}>
                    {formatearHora(venta.fecha_hora)}
                  </Text>
                  <View style={[
                    estilos.etiquetaMetodo,
                    venta.metodo_pago === 'efectivo' 
                      ? { backgroundColor: '#f0fff4', borderColor: '#38a169' }
                      : { backgroundColor: '#ebf8ff', borderColor: '#2b6cb0' }
                  ]}>
                    <Text style={[
                      estilos.textoMetodo,
                      { color: venta.metodo_pago === 'efectivo' ? '#2f855a' : '#2b6cb0' }
                    ]}>
                      {venta.metodo_pago === 'efectivo' ? 'Efectivo' : 'Transfer.'}
                    </Text>
                  </View>
                  <Text style={estilos.totalVenta}>{formatCUP(venta.total)} CUP</Text> 
                  <Ionicons 
                    name={expandida ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color="#a0aec0" 
                  />
                </View>

                {expandida && (
                  <View style={estilos.itemsVenta}>
                    {venta.items.map((item, idx) => (
                      <Text key={idx} style={estilos.textoItemVenta}>
                        {item.cantidad}x {item.nombre_producto} — {formatCUP(item.cantidad * item.precio_aplicado)} CUP
                      </Text>
                    ))}
                    {venta.propina > 0 && (
                      <View style={estilosLocal.filaPropinaventa}>
                        <Ionicons name="star" size={12} color="#b7791f" />
                        <Text style={estilosLocal.textoPropinaventa}>
                          Propina: {formatCUP(venta.propina)} CUP
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Anulaciones del turno */}
      {anulaciones.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="trash-outline" size={20} color="#e53e3e" />
            <Text style={estilos.tituloSeccion}>Anulaciones ({anulaciones.length})</Text>
          </View>
          {anulaciones.map((venta) => (
            <View key={venta.venta_id} style={[estilos.filaHistorialVenta, { opacity: 0.6 }]}>
              <View style={estilos.cabeceraFilaVenta}>
                <Text style={[estilos.horaVenta, { textDecorationLine: 'line-through' }]}>
                  {formatearHora(venta.fecha_hora)}
                </Text>
                <Text style={estilos.totalVentaFila}>{formatCUP(venta.total)} CUP</Text>
              </View>
              <View style={estilos.detallesVentaFila}>
                {venta.items.map((item, idx) => (
                  <Text key={idx} style={[estilos.textoItemVenta, { textDecorationLine: 'line-through' }]}>
                    {item.cantidad}x {item.nombre_producto}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Ventas de despachos externos ── */}
      {resumenDespachos.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="storefront-outline" size={20} color="#319795" />
            <Text style={estilos.tituloSeccion}>Ventas de despachos externos</Text>
          </View>

          <View style={estilosLocal.alertaExterna}>
            <Ionicons name="information-circle-outline" size={16} color="#2c7a7b" />
            <Text style={estilosLocal.textoAlertaExterna}>
              Este dinero <Text style={{ fontWeight: 'bold' }}>no pertenece a tu caja</Text>.
              Fue depositado a cada despacho por separado.
            </Text>
          </View>

          {resumenDespachos.map((d) => (
            <View key={d.despacho_id} style={estilosLocal.filaDespacho}>
              <View style={[estilosLocal.puntoColor, { backgroundColor: d.despacho_color }]} />
              <View style={{ flex: 1 }}>
                <Text style={estilosLocal.nombreDespacho}>{d.despacho_nombre}</Text>
                <Text style={estilosLocal.detalleDespacho}>
                  {d.cantidad_ventas} venta{d.cantidad_ventas !== 1 ? 's' : ''}
                  {d.total_efectivo > 0 ? `  ·  Ef: ${formatCUP(d.total_efectivo)}` : ''}
                  {d.total_transferencia > 0 ? `  ·  Tr: ${formatCUP(d.total_transferencia)}` : ''}
                </Text>
              </View>
              <Text style={[estilosLocal.totalDespacho, { color: d.despacho_color }]}>
                {formatCUP(d.total_efectivo + d.total_transferencia)} CUP
              </Text>
            </View>
          ))}

          <View style={[estilos.fila, estilos.filaTotal, { marginTop: 12 }]}>
            <Text style={estilos.etiquetaTotal}>Total externo:</Text>
            <Text style={[estilos.valorTotal, { color: '#319795' }]}>
              {formatCUP(resumenDespachos.reduce((acc, d) => acc + d.total_efectivo + d.total_transferencia, 0))} CUP
            </Text>
          </View>
        </View>
      )}

      {/* Entradas del turno */}
      {entradas.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="download-outline" size={20} color="#2b6cb0" />
            <Text style={estilos.tituloSeccion}>Entradas del turno</Text>
          </View>
          {entradas.map((entrada, index) => (
            <View key={index} style={estilos.filaEntrada}>
              <Text style={estilos.nombreEntrada}>{entrada.nombre}</Text>
              <Text style={estilos.cantidadEntrada}>+{entrada.cantidad} unid.</Text>
              <Text style={estilos.horaEntrada}>{formatearHora(entrada.fecha_hora)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Salidas familiares */}
      {salidasFamiliares.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="people-outline" size={20} color="#ed64a6" />
            <Text style={estilos.tituloSeccion}>Consumo familiar</Text>
          </View>
          {salidasFamiliares.map((salida, index) => (
            <View key={index} style={estilos.filaEntrada}>
              <Text style={estilos.nombreEntrada}>{salida.nombre}</Text>
              <Text style={[estilos.cantidadEntrada, { color: '#ed64a6' }]}>
                -{salida.cantidad} unid.
              </Text>
              <Text style={estilos.horaEntrada}>{formatearHora(salida.fecha_hora)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Mermas del turno ── */}
      {mermas.length > 0 && (
        <View style={estilos.seccion}>
          <View style={estilos.cabeceraSeccion}>
            <Ionicons name="trash-outline" size={20} color="#c05621" />
            <Text style={estilos.tituloSeccion}>
              Mermas ({mermas.reduce((acc, g) => acc + g.items.length, 0)} registros)
            </Text>
          </View>

          {mermas.map((grupo) => {
            const expandido = mermasExpandidas.has(grupo.grupo_id);
            return (
              <TouchableOpacity
                key={grupo.grupo_id}
                style={estilosLocal.grupoMerma}
                onPress={() => toggleMerma(grupo.grupo_id)}
                activeOpacity={0.7}
              >
                {/* Cabecera */}
                <View style={estilosLocal.cabeceraGrupo}>
                  <View style={estilosLocal.badgeMotivo}>
                    <Text style={estilosLocal.textoMotivo}>
                      {etiquetaMotivo(grupo.motivo, grupo.motivo_detalle)}
                    </Text>
                  </View>
                  <View style={estilosLocal.filaDerechaCabecera}>
                    <Text style={estilosLocal.horaGrupo}>
                      {new Date(grupo.fecha_hora).toLocaleTimeString('es-CU', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </Text>
                    <Ionicons
                      name={expandido ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#a0aec0"
                    />
                  </View>
                </View>

                {/* Items siempre visibles */}
                {grupo.items.map((item, idx) => (
                  <View key={idx} style={estilos.filaEntrada}>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.nombreEntrada}>{item.nombre_producto}</Text>
                      <Text style={estilosLocal.motivoItemMerma}>
                        Motivo: {etiquetaMotivo(grupo.motivo, grupo.motivo_detalle)}
                      </Text>
                    </View>
                    <Text style={[estilos.cantidadEntrada, { color: '#c05621' }]}>
                    -{item.cantidad} unid.
                    </Text>
                  </View>
                ))}

                {/* Detalle expandido */}
                {expandido && (
                  <View style={estilosLocal.detalleExpandido}>
                    <View style={estilosLocal.filaDetalleItem}>
                      <Ionicons name="calendar-outline" size={14} color="#c05621" />
                      <Text style={estilosLocal.textoDetalleItem}>
                        Fecha y hora:{' '}
                        {new Date(grupo.fecha_hora).toLocaleString('es-CU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Text>
                    </View>
                    <View style={estilosLocal.filaDetalleItem}>
                      <Ionicons name="warning-outline" size={14} color="#c05621" />
                      <Text style={estilosLocal.textoDetalleItem}>
                        Motivo: {etiquetaMotivo(grupo.motivo, grupo.motivo_detalle)}
                      </Text>
                    </View>
                    {grupo.motivo_detalle && (
                      <View style={estilosLocal.filaDetalleItem}>
                        <Ionicons name="chatbox-outline" size={14} color="#c05621" />
                        <Text style={estilosLocal.textoDetalleItem}>
                          Descripción: {grupo.motivo_detalle}
                        </Text>
                      </View>
                    )}
                    <View style={estilosLocal.filaDetalleItem}>
                      <Ionicons name="cube-outline" size={14} color="#c05621" />
                      <Text style={estilosLocal.textoDetalleItem}>
                        Total unidades dadas de baja:{' '}
                        {grupo.items.reduce((acc, i) => acc + i.cantidad, 0)}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={estilosLocal.totalMermas}>
            <Text style={estilosLocal.textoTotalMermas}>
              Total dado de baja:{' '}
              {mermas.reduce((acc, g) => acc + g.items.reduce((a, i) => a + i.cantidad, 0), 0)}{' '}
              unidades
            </Text>
          </View>
        </View>
      )}

      {/* Inventario al cierre */}
      <View style={estilos.seccion}>
        <View style={estilos.cabeceraSeccion}>
          <Ionicons name="cube-outline" size={20} color="#805ad5" />
          <Text style={estilos.tituloSeccion}>Inventario al cierre</Text>
        </View>
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
    </SafeAreaView>
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
  scroll: {
    flex: 1,
  },
  textoVacio: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  cabeceraSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingBottom: 8,
  },
  tituloSeccion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  seccion: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filasConteo: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  chipConteo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fff4',
    borderWidth: 1,
    borderColor: '#9ae6b4',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipConteoAnulacion: {
    backgroundColor: '#fff5f5',
    borderColor: '#feb2b2',
  },
  textoChipConteo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2f855a',
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filaIcono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etiqueta: {
    fontSize: 14,
    color: '#718096',
  },
  valor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  filaTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  etiquetaTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  valorTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2b6cb0',
  },
  resultadoCuadre: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  textoCuadre: {
    fontSize: 15,
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
  filaVenta: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    paddingVertical: 10,
  },
  filaVentaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  horaVenta: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
    width: 48,
  },
  etiquetaMetodo: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
  },
  textoMetodo: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  totalVenta: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3748',
  },
  itemsVenta: {
    marginTop: 8,
    paddingLeft: 8,
    gap: 4,
  },
  textoItemVenta: {
    fontSize: 13,
    color: '#718096',
  },
  filaHistorialVenta: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  cabeceraFilaVenta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  totalVentaFila: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginLeft: 'auto',
  },
  detallesVentaFila: {
    paddingLeft: 0,
  },
});

const estilosLocal = StyleSheet.create({
  alertaExterna: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#e6fffa',
    borderWidth: 1,
    borderColor: '#81e6d9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  textoAlertaExterna: {
    flex: 1,
    fontSize: 13,
    color: '#2c7a7b',
    lineHeight: 18,
  },
  filaDespacho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  puntoColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nombreDespacho: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  detalleDespacho: {
    fontSize: 12,
    color: '#718096',
    marginTop: 1,
  },
  totalDespacho: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  grupoMerma: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#feebc8',
    paddingBottom: 8,
  },
  cabeceraGrupo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeMotivo: {
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#f6ad55',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  textoMotivo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c05621',
  },
  horaGrupo: {
    fontSize: 13,
    color: '#a0aec0',
  },
  totalMermas: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#feebc8',
    alignItems: 'flex-end',
  },
  textoTotalMermas: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#c05621',
  },
  filaPropina: {
  marginTop: 4,
  paddingTop: 6,
},
filaIconoPropina: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
},
etiquetaPropina: {
  fontSize: 14,
  color: '#b7791f',
  fontWeight: '600',
},
valorPropina: {
  fontSize: 15,
  fontWeight: 'bold',
  color: '#b7791f',
},
filaPropinaventa: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  marginTop: 6,
  paddingTop: 6,
  borderTopWidth: 1,
  borderTopColor: '#fefcbf',
},
textoPropinaventa: {
  fontSize: 12,
  fontWeight: '700',
  color: '#b7791f',
},
filaDerechaCabecera: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
motivoItemMerma: {
  fontSize: 12,
  color: '#c05621',
  fontStyle: 'italic',
  marginTop: 2,
},
detalleExpandido: {
  marginTop: 10,
  backgroundColor: '#fffaf0',
  borderRadius: 10,
  padding: 12,
  borderWidth: 1,
  borderColor: '#fbd38d',
  gap: 8,
},
filaDetalleItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 8,
},
textoDetalleItem: {
  flex: 1,
  fontSize: 13,
  color: '#744210',
  lineHeight: 18,
},
});

