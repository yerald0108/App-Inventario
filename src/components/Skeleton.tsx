import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, DimensionValue } from 'react-native';

interface Props {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export default function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        estilos.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Variantes específicas para evitar layout shift (Mejora UX 3)
export function SkeletonProducto() {
  return (
    <View style={estilos.tarjetaProducto}>
      <View style={{ flex: 1 }}>
        <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={14} />
      </View>
      <View style={estilos.controlesSimulados}>
        <Skeleton width={32} height={32} borderRadius={8} />
        <Skeleton width={24} height={20} style={{ marginHorizontal: 8 }} />
        <Skeleton width={32} height={32} borderRadius={8} />
      </View>
    </View>
  );
}

export function SkeletonTurno() {
  return (
    <View style={estilos.tarjetaTurno}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
        <Skeleton width="45%" height={18} />
        <Skeleton width="25%" height={18} />
      </View>
      <View style={estilos.divisor} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <Skeleton width="35%" height={14} />
        <Skeleton width="30%" height={14} />
      </View>
    </View>
  );
}

export function SkeletonVenta() {
  return (
    <View style={estilos.tarjetaVenta}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <Skeleton width="20%" height={24} />
        <Skeleton width="35%" height={24} borderRadius={8} />
        <Skeleton width="25%" height={22} />
      </View>
      <View style={estilos.divisor} />
      <View style={{ marginVertical: 12 }}>
        <Skeleton width="100%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="80%" height={14} />
      </View>
      <Skeleton width="100%" height={44} borderRadius={10} />
    </View>
  );
}

const estilos = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e2e8f0',
  },
  tarjetaProducto: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    height: 74,
  },
  controlesSimulados: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tarjetaTurno: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    height: 92, // Altura aproximada de la tarjeta en historial
  },
  tarjetaVenta: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    height: 165,
  },
  divisor: {
    height: 1,
    backgroundColor: '#f7fafc',
    width: '100%',
  },
});

export function SkeletonDetallePedido() {
  return (
    <View style={{ flex: 1 }}>
      
      {/* Header del pedido — imita la barra con nombre editable */}
      <View style={estilosSkeletonPedido.header}>
        <Skeleton width={20} height={20} borderRadius={4} style={{ marginRight: 8 }} />
        <Skeleton width="55%" height={20} />
        <View style={{ flex: 1 }} />
        <Skeleton width={18} height={18} borderRadius={4} />
      </View>

      {/* Lista de items del pedido — 3 tarjetas esqueleto */}
      <View style={estilosSkeletonPedido.lista}>
        <SkeletonItemPedido ancho="75%" />
        <SkeletonItemPedido ancho="55%" />
        <SkeletonItemPedido ancho="65%" />
      </View>

      {/* Barra inferior fija */}
      <View style={estilosSkeletonPedido.barraInferior}>
        <View style={estilosSkeletonPedido.filaTotal}>
          <Skeleton width={40} height={13} style={{ marginBottom: 4 }} />
          <Skeleton width={120} height={28} />
        </View>
        <View style={estilosSkeletonPedido.filaBotones}>
          <Skeleton width="30%" height={50} borderRadius={14} />
          <Skeleton width="65%" height={50} borderRadius={14} />
        </View>
      </View>
    </View>
  );
}

// Componente interno: una tarjeta de item del pedido
function SkeletonItemPedido({ ancho }: { ancho: DimensionValue }) {
  return (
    <View style={estilosSkeletonPedido.tarjeta}>
      {/* Columna izquierda: nombre + precio/unidad */}
      <View style={{ flex: 1, marginRight: 10 }}>
        <Skeleton width={ancho} height={16} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={12} />
      </View>
      {/* Controles +/cantidad/- */}
      <View style={estilosSkeletonPedido.controles}>
        <Skeleton width={30} height={30} borderRadius={8} />
        <Skeleton width={24} height={20} style={{ marginHorizontal: 4 }} />
        <Skeleton width={30} height={30} borderRadius={8} />
      </View>
      {/* Subtotal derecha */}
      <Skeleton width={72} height={16} style={{ marginLeft: 10 }} />
    </View>
  );
}

const estilosSkeletonPedido = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  lista: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  tarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  barraInferior: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 28,
    gap: 10,
  },
  filaTotal: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 10,
    gap: 4,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: 10,
  },
});
