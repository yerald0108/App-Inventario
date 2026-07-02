import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { estilosSeccion } from '../shared/estilosSeccion';

interface ItemInventario {
  nombre: string;
  existencia: number;
  alerta_minima: number;
}

interface ItemEntrada {
  nombre: string;
  cantidad: number;
  fecha_hora: string;
}

interface Props {
  inventarioInicial: ItemInventario[];
  inventarioCierre: ItemInventario[];
  entradas: ItemEntrada[];
}

export default function SeccionInventarioComparadoCierre({
  inventarioInicial,
  inventarioCierre,
  entradas,
}: Props) {
  if (inventarioInicial.length === 0 && inventarioCierre.length === 0) return null;

  // Agrupar entradas por nombre → suma total de unidades
  const mapaEntradas = new Map<string, number>();
  for (const e of entradas) {
    mapaEntradas.set(e.nombre, (mapaEntradas.get(e.nombre) ?? 0) + e.cantidad);
  }

  const mapaInicial = new Map(inventarioInicial.map((i) => [i.nombre, i]));
  const mapaCierre = new Map(inventarioCierre.map((i) => [i.nombre, i]));
  const nombresUnicos = Array.from(
    new Set([
      ...inventarioInicial.map((i) => i.nombre),
      ...inventarioCierre.map((i) => i.nombre),
    ])
  );

  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="swap-horizontal-outline" size={20} color="#2b6cb0" />
        <Text style={estilosSeccion.tituloSeccion}>Inventario del turno</Text>
      </View>

      {/* Encabezados de columna */}
      <View style={estilos.filaEncabezado}>
        <Text style={[estilos.celdaNombre, estilos.textoEncabezado]}>Producto</Text>
        <Text style={[estilos.celdaValor, estilos.textoEncabezado]}>Inicio</Text>
        <Text style={[estilos.celdaValor, estilos.textoEncabezado]}>Entradas</Text>
        <Text style={[estilos.celdaValor, estilos.textoEncabezado]}>Cierre</Text>
      </View>

      {nombresUnicos.map((nombre, index) => {
        const inicio = mapaInicial.get(nombre);
        const cierre = mapaCierre.get(nombre);
        const totalEntradas = mapaEntradas.get(nombre) ?? 0;
        const alerta = inicio?.alerta_minima ?? cierre?.alerta_minima ?? 0;

        const cantCierre = cierre?.existencia ?? null;
        const colorCierre =
          cantCierre !== null
            ? cantCierre < alerta
              ? '#e53e3e'
              : '#38a169'
            : '#a0aec0';

        return (
          <View
            key={index}
            style={[estilos.fila, index % 2 === 0 ? estilos.filaPar : estilos.filaImpar]}
          >
            <Text style={estilos.celdaNombre} numberOfLines={2}>
              {nombre}
            </Text>
            <Text style={[estilos.celdaValor, { color: '#718096' }]}>
              {inicio?.existencia ?? '—'}
            </Text>
            <Text style={[
              estilos.celdaValor,
              {
                color: totalEntradas > 0 ? '#38a169' : '#a0aec0',
                fontWeight: totalEntradas > 0 ? '700' : '400',
              },
            ]}>
              {totalEntradas > 0 ? `+${totalEntradas}` : '—'}
            </Text>
            <Text style={[estilos.celdaValor, { color: colorCierre, fontWeight: '700' }]}>
              {cantCierre !== null ? cantCierre : '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  filaEncabezado: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    marginBottom: 2,
  },
  textoEncabezado: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a0aec0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  filaPar: { backgroundColor: 'transparent' },
  filaImpar: { backgroundColor: '#f7fafc' },
  celdaNombre: {
    flex: 2,
    fontSize: 14,
    color: '#1a1a2e',
    paddingRight: 6,
  },
  celdaValor: {
    flex: 1,
    fontSize: 14,
    textAlign: 'center',
  },
});