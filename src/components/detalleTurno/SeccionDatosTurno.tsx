import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Turno } from '../../types';
import { estilosSeccion } from '../shared/estilosSeccion';

interface Props {
  turno: Turno;
  formatearFecha: (iso: string) => string;
}

export default function SeccionDatosTurno({ turno, formatearFecha }: Props) {
  return (
    <View style={estilosSeccion.seccion}>
      <View style={estilosSeccion.cabeceraSeccion}>
        <Ionicons name="calendar-outline" size={20} color="#2b6cb0" />
        <Text style={estilosSeccion.tituloSeccion}>Datos del turno</Text>
      </View>
      <View style={estilosSeccion.fila}>
        <Text style={estilosSeccion.etiqueta}>Apertura:</Text>
        <Text style={estilosSeccion.valor}>{formatearFecha(turno.fecha_inicio)}</Text>
      </View>
      <View style={estilosSeccion.fila}>
        <Text style={estilosSeccion.etiqueta}>Cierre:</Text>
        <Text style={estilosSeccion.valor}>
          {turno.fecha_cierre ? formatearFecha(turno.fecha_cierre) : '—'}
        </Text>
      </View>
    </View>
  );
}