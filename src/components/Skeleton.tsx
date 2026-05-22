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
    height: 74, // Altura exacta de ProductoVenta
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
    height: 165, // Altura aproximada de la tarjeta de venta
  },
  divisor: {
    height: 1,
    backgroundColor: '#f7fafc',
    width: '100%',
  },
});
