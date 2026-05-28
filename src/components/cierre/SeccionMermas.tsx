import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MermaAgrupada, etiquetaMotivo } from '../../database/mermas';

interface Props {
  mermas: MermaAgrupada[];
}

export default function SeccionMermas({ mermas }: Props) {
  const [mermasExpandidas, setMermasExpandidas] = useState<Set<string>>(new Set());

  if (mermas.length === 0) return null;

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

  const totalUnidades = mermas.reduce(
    (acc, g) => acc + g.items.reduce((a, i) => a + i.cantidad, 0), 0
  );

  return (
    <View style={estilos.seccion}>
      <View style={estilos.cabeceraSeccion}>
        <Ionicons name="trash-outline" size={20} color="#c05621" />
        <Text style={estilos.tituloSeccion}>Mermas del turno</Text>
      </View>

      {mermas.map((grupo) => {
        const expandido = mermasExpandidas.has(grupo.grupo_id);
        return (
          <TouchableOpacity
            key={grupo.grupo_id}
            style={estilos.grupoMerma}
            onPress={() => toggleMerma(grupo.grupo_id)}
            activeOpacity={0.7}
          >
            <View style={estilos.cabeceraGrupo}>
              <View style={estilos.badgeMotivo}>
                <Text style={estilos.textoMotivo}>
                  {etiquetaMotivo(grupo.motivo, grupo.motivo_detalle)}
                </Text>
              </View>
              <View style={estilos.filaDerechaCabecera}>
                <Text style={estilos.horaGrupo}>
                  {new Date(grupo.fecha_hora).toLocaleTimeString('es-CU', {
                    hour: '2-digit', minute: '2-digit', hour12: true,
                  })}
                </Text>
                <Ionicons
                  name={expandido ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#a0aec0"
                />
              </View>
            </View>

            {grupo.items.map((item, idx) => (
              <View key={idx} style={estilos.filaItem}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.nombreItem}>{item.nombre_producto}</Text>
                  <Text style={estilos.motivoItem}>
                    Motivo: {etiquetaMotivo(grupo.motivo, grupo.motivo_detalle)}
                  </Text>
                </View>
                <Text style={estilos.cantidadItem}>-{item.cantidad} unid.</Text>
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
                {grupo.motivo_detalle && (
                  <View style={estilos.filaDetalle}>
                    <Ionicons name="chatbox-outline" size={14} color="#c05621" />
                    <Text style={estilos.textoDetalle}>
                      Descripción: {grupo.motivo_detalle}
                    </Text>
                  </View>
                )}
                <View style={estilos.filaDetalle}>
                  <Ionicons name="cube-outline" size={14} color="#c05621" />
                  <Text style={estilos.textoDetalle}>
                    Total unidades:{' '}
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
  cabeceraSeccion: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16, borderBottomWidth: 1,
    borderBottomColor: '#edf2f7', paddingBottom: 8,
  },
  tituloSeccion: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', flex: 1 },
  grupoMerma: {
    marginBottom: 12, borderBottomWidth: 1,
    borderBottomColor: '#feebc8', paddingBottom: 8,
  },
  cabeceraGrupo: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  badgeMotivo: {
    backgroundColor: '#fffaf0', borderWidth: 1,
    borderColor: '#f6ad55', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  textoMotivo: { fontSize: 13, fontWeight: '700', color: '#c05621' },
  filaDerechaCabecera: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  horaGrupo: { fontSize: 13, color: '#a0aec0' },
  filaItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1,
    borderBottomColor: '#feebc8', gap: 8,
  },
  nombreItem: { fontSize: 15, color: '#1a1a2e' },
  motivoItem: { fontSize: 12, color: '#c05621', fontStyle: 'italic', marginTop: 2 },
  cantidadItem: { fontSize: 15, fontWeight: '600', color: '#c05621' },
  detalleExpandido: {
    marginTop: 10, backgroundColor: '#fffaf0',
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#fbd38d', gap: 8,
  },
  filaDetalle: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  textoDetalle: { flex: 1, fontSize: 13, color: '#744210', lineHeight: 18 },
  totalMermas: {
    marginTop: 8, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#feebc8',
    alignItems: 'flex-end',
  },
  textoTotalMermas: { fontSize: 14, fontWeight: 'bold', color: '#c05621' },
});