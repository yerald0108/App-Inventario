import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCUP } from '../../utils';
import { estilosSeccion } from '../shared/estilosSeccion';

interface ResumenDia {
  diaTurnoId: number;
  numeroDia: number;
  fecha_inicio: string;
  fecha_cierre: string | null;
  totalEfectivo: number;
  totalTransferencia: number;
  cantidadVentas: number;
  totalPropinas: number;
}

interface Props {
  dias: ResumenDia[];
  diasPlanificados: number;
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function SeccionResumenDias({ dias, diasPlanificados }: Props) {
  if (diasPlanificados <= 1) return null;

  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="calendar-outline" size={20} color="#2b6cb0" />
        <Text style={estilosSeccion.tituloSeccion}>
          Resumen por días ({dias.length} de {diasPlanificados})
        </Text>
      </View>

      {dias.map((dia) => {
        const totalDia = dia.totalEfectivo + dia.totalTransferencia;
        const esCerrado = dia.fecha_cierre !== null;

        return (
          <View key={dia.diaTurnoId} style={estilos.tarjetaDia}>

            {/* Cabecera del día */}
            <View style={estilos.cabeceraD}>
              <View style={[
                estilos.badgeNumero,
                esCerrado ? estilos.badgeCerrado : estilos.badgeAbierto,
              ]}>
                <Text style={estilos.textoBadgeNumero}>Día {dia.numeroDia}</Text>
              </View>
              <View style={estilos.estadoDia}>
                <Ionicons
                  name={esCerrado ? 'checkmark-circle' : 'time-outline'}
                  size={14}
                  color={esCerrado ? '#38a169' : '#d69e2e'}
                />
                <Text style={[
                  estilos.textoEstado,
                  { color: esCerrado ? '#38a169' : '#d69e2e' },
                ]}>
                  {esCerrado ? 'Cerrado' : 'En curso'}
                </Text>
              </View>
            </View>

            {/* Fecha */}
            <Text style={estilos.fechaDia}>
              {formatearFecha(dia.fecha_inicio)}
              {dia.fecha_cierre ? ` → ${formatearFecha(dia.fecha_cierre)}` : ''}
            </Text>

            {/* Totales del día */}
            <View style={estilos.totalesDia}>
              <View style={estilos.columnaTotal}>
                <View style={estilos.filaIcono}>
                  <Ionicons name="cash-outline" size={13} color="#718096" />
                  <Text style={estilos.etiquetaTotal}>Efectivo</Text>
                </View>
                <Text style={estilos.valorTotal}>
                  {formatCUP(dia.totalEfectivo)} CUP
                </Text>
              </View>

              <View style={estilos.divisorVertical} />

              <View style={estilos.columnaTotal}>
                <View style={estilos.filaIcono}>
                  <Ionicons name="card-outline" size={13} color="#718096" />
                  <Text style={estilos.etiquetaTotal}>Transfer.</Text>
                </View>
                <Text style={estilos.valorTotal}>
                  {formatCUP(dia.totalTransferencia)} CUP
                </Text>
              </View>

              <View style={estilos.divisorVertical} />

              <View style={estilos.columnaTotal}>
                <View style={estilos.filaIcono}>
                  <Ionicons name="receipt-outline" size={13} color="#718096" />
                  <Text style={estilos.etiquetaTotal}>Ventas</Text>
                </View>
                <Text style={estilos.valorTotal}>
                  {dia.cantidadVentas}
                </Text>
              </View>
            </View>

            {/* Total del día */}
            <View style={estilos.filaTotalDia}>
              <Text style={estilos.etiquetaTotalDia}>Total del día:</Text>
              <Text style={estilos.valorTotalDia}>
                {formatCUP(totalDia)} CUP
              </Text>
            </View>

            {/* Propinas si hay */}
            {dia.totalPropinas > 0 && (
              <View style={estilos.filaPropina}>
                <Ionicons name="star" size={12} color="#b7791f" />
                <Text style={estilos.textoPropina}>
                  Propinas: {formatCUP(dia.totalPropinas)} CUP
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjetaDia: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cabeceraD: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeNumero: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeCerrado: {
    backgroundColor: '#f0fff4',
    borderWidth: 1,
    borderColor: '#9ae6b4',
  },
  badgeAbierto: {
    backgroundColor: '#fffff0',
    borderWidth: 1,
    borderColor: '#f6e05e',
  },
  textoBadgeNumero: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2d3748',
  },
  estadoDia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textoEstado: {
    fontSize: 12,
    fontWeight: '700',
  },
  fechaDia: {
    fontSize: 12,
    color: '#a0aec0',
    marginBottom: 10,
  },
  totalesDia: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  columnaTotal: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  filaIcono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  etiquetaTotal: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '600',
  },
  valorTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2d3748',
    textAlign: 'center',
  },
  divisorVertical: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
  },
  filaTotalDia: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  etiquetaTotalDia: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4a5568',
  },
  valorTotalDia: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2b6cb0',
  },
  filaPropina: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  textoPropina: {
    fontSize: 12,
    color: '#b7791f',
    fontWeight: '600',
  },
});