import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MermaAgrupada, etiquetaMotivo } from '../../database/mermas';
import { estilosSeccion } from './estilosSeccion';

interface Props {
  mermas: MermaAgrupada[];
  mermasExpandidas: Set<string>;
  onToggle: (grupoId: string) => void;
}

export default function SeccionMermasTurno({ mermas, mermasExpandidas, onToggle }: Props) {
  if (mermas.length === 0) return null;

  const totalUnidades = mermas.reduce(
    (acc, g) => acc + g.items.reduce((a, i) => a + i.cantidad, 0), 0
  );

  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="trash-outline" size={20} color="#c05621" />
        <Text style={estilosSeccion.tituloSeccion}>
          Mermas ({mermas.reduce((acc, g) => acc + g.items.length, 0)} registros)
        </Text>
      </View>

      {mermas.map((grupo) => {
        const expandido = mermasExpandidas.has(grupo.grupo_id);
        return (
          <TouchableOpacity
            key={grupo.grupo_id}
            style={estilos.grupoMerma}
            onPress={() => onToggle(grupo.grupo_id)}
            activeOpacity={0.7}
          >
            <View style={estilos.cabeceraGrupo}>
              <View style={estilos.badgeMotivo}>
                <Text style={estilos.textoMotivo}>
                  {etiquetaMotivo(grupo.motivo, grupo.motivo_detalle)}
                </Text>
              </View>
              <View style={estilos.derechaCabecera}>
                <Text style={estilos.horaGrupo}>
                  {new Date(grupo.fecha_hora).toLocaleTimeString('es-CU', {
                    hour: '2-digit', minute: '2-digit', hour12: true,
                  })}
                </Text>
                <Ionicons
                  name={expandido ? 'chevron-up' : 'chevron-down'}
                  size={16} color="#a0aec0"
                />
              </View>
            </View>

            {grupo.items.map((item, idx) => (
              <View key={idx} style={estilosSeccion.filaItem}>
                <View style={{ flex: 1 }}>
                  <Text style={estilosSeccion.nombreItem}>{item.nombre_producto}</Text>
                  <Text style={estilos.motivoItem}>
                    Motivo: {etiquetaMotivo(grupo.motivo, grupo.motivo_detalle)}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#c05621' }}>
                  -{item.cantidad} unid.
                </Text>
              </View>
            ))}

            {expandido && (
              <View style={estilos.detalleExpandido}>
                <View style={estilos.filaDetalle}>
                  <Ionicons name="calendar-outline" size={14} color="#c05621" />
                  <Text style={estilos.textoDetalle}>
                    Fecha y hora:{' '}
                    {new Date(grupo.fecha_hora).toLocaleString('es-CU', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', hour12: true,
                    })}
                  </Text>
                </View>
                <View style={estilos.filaDetalle}>
                  <Ionicons name="warning-outline" size={14} color="#c05621" />
                  <Text style={estilos.textoDetalle}>
                    Motivo: {etiquetaMotivo(grupo.motivo, grupo.motivo_detalle)}
                  </Text>
                </View>
                {grupo.motivo_detalle && (
                  <View style={estilos.filaDetalle}>
                    <Ionicons name="chatbox-outline" size={14} color="#c05621" />
                    <Text style={estilos.textoDetalle}>Descripción: {grupo.motivo_detalle}</Text>
                  </View>
                )}
                <View style={estilos.filaDetalle}>
                  <Ionicons name="cube-outline" size={14} color="#c05621" />
                  <Text style={estilos.textoDetalle}>
                    Total unidades dadas de baja:{' '}
                    {grupo.items.reduce((acc, i) => acc + i.cantidad, 0)}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={estilos.totalMermas}>
        <Text style={estilos.textoTotalMermas}>
          Total dado de baja: {totalUnidades} unidades
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  grupoMerma: {
    marginBottom: 12, borderBottomWidth: 1,
    borderBottomColor: '#feebc8', paddingBottom: 8,
  },
  cabeceraGrupo: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  derechaCabecera: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeMotivo: {
    backgroundColor: '#fffaf0', borderWidth: 1, borderColor: '#f6ad55',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  textoMotivo: { fontSize: 13, fontWeight: '700', color: '#c05621' },
  horaGrupo: { fontSize: 13, color: '#a0aec0' },
  motivoItem: { fontSize: 12, color: '#c05621', fontStyle: 'italic', marginTop: 2 },
  detalleExpandido: {
    marginTop: 10, backgroundColor: '#fffaf0', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: '#fbd38d', gap: 8,
  },
  filaDetalle: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  textoDetalle: { flex: 1, fontSize: 13, color: '#744210', lineHeight: 18 },
  totalMermas: {
    marginTop: 8, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#feebc8', alignItems: 'flex-end',
  },
  textoTotalMermas: { fontSize: 14, fontWeight: 'bold', color: '#c05621' },
});