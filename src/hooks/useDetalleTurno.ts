import { useState, useEffect } from 'react';
import { obtenerDetalleTurno, obtenerInventarioInicialTurno } from '../database/turnos';
import { obtenerVentasTurnoActual, obtenerAnulacionesTurno } from '../database/cancelaciones';
import { Turno, VentaAgrupada } from '../types';
import { obtenerResumenExternoDetalleTurno } from '../database/despachos';
import { obtenerMermasTurno, MermaAgrupada } from '../database/mermas';
import { useExpandable } from './useExpandable';


export interface ResumenDespachoDetalle {
  despacho_id: number;
  despacho_nombre: string;
  despacho_color: string;
  total_efectivo: number;
  total_transferencia: number;
  cantidad_ventas: number;
}

export interface ItemInventario {
  nombre: string;
  existencia: number;
  alerta_minima: number;
}

export interface ItemMovimiento {
  nombre: string;
  cantidad: number;
  fecha_hora: string;
}

export function useDetalleTurno(turnoId: number) {
  const [cargando, setCargando] = useState(true);
  const [turno, setTurno] = useState<Turno | null>(null);
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalTransferencia, setTotalTransferencia] = useState(0);
  const [entradas, setEntradas] = useState<ItemMovimiento[]>([]);
  const [salidasFamiliares, setSalidasFamiliares] = useState<ItemMovimiento[]>([]);
  const [cantidadVentas, setCantidadVentas] = useState(0);
  const [cantidadAnulaciones, setCantidadAnulaciones] = useState(0);
  const [ventas, setVentas] = useState<VentaAgrupada[]>([]);
  const [anulaciones, setAnulaciones] = useState<VentaAgrupada[]>([]);
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [resumenDespachos, setResumenDespachos] = useState<ResumenDespachoDetalle[]>([]);
  const [mermas, setMermas] = useState<MermaAgrupada[]>([]);
  const [inventarioInicial, setInventarioInicial] = useState<ItemInventario[]>([]);
  const [totalPropinas, setTotalPropinas] = useState(0);

  // Estado de expansión de ventas y mermas (centralizado en useExpandable)
  const { expandidos: ventasExpandidas, toggle: toggleVenta } = useExpandable();
  const { expandidos: mermasExpandidas, toggle: toggleMerma } = useExpandable();

  useEffect(() => {
    cargarDetalle();
  }, []);

  async function cargarDetalle() {
    setCargando(true);
    try {
      const detalle = await obtenerDetalleTurno(turnoId);
      if (!detalle) { setCargando(false); return; }

      setTurno(detalle.turno);
      setTotalEfectivo(detalle.totalEfectivo);
      setTotalTransferencia(detalle.totalTransferencia);
      setEntradas(detalle.entradas);
      setSalidasFamiliares(detalle.salidasFamiliares);
      setInventario(detalle.inventario);
      setCantidadVentas(detalle.cantidadVentas);
      setCantidadAnulaciones(detalle.cantidadAnulaciones);
      setTotalPropinas(detalle.totalPropinas ?? 0);

      const [listaVentas, listaAnulaciones, listaDespachos, listaMermas, inventIni] = await Promise.all([
        obtenerVentasTurnoActual(turnoId),
        obtenerAnulacionesTurno(turnoId),
        obtenerResumenExternoDetalleTurno(turnoId),
        obtenerMermasTurno(turnoId),
        obtenerInventarioInicialTurno(turnoId),
      ]);
      setVentas(listaVentas);
      setAnulaciones(listaAnulaciones);
      setResumenDespachos(listaDespachos as ResumenDespachoDetalle[]);
      setMermas(listaMermas);
      setInventarioInicial(inventIni);
    } catch (error) {
      console.error('Error al cargar detalle del turno:', error);
    } finally {
      setCargando(false);
    }
  }



  // Helpers de formato reutilizables por los componentes hijos
  function formatearFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-CU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  function formatearHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CU', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  // Cálculo del cuadre — lo necesitan dos secciones distintas
  const efectivoReal = turno?.efectivo_real ?? 0;
  const diferencia = totalEfectivo - efectivoReal;

  let cuadreTexto = 'Caja cuadrada';
  let cuadreColor = '#38a169';
  let cuadreIcono: any = 'checkmark-circle';

  if (diferencia > 0) {
    cuadreTexto = `Faltante: ${diferencia.toFixed(2)} CUP`;
    cuadreColor = '#e53e3e';
    cuadreIcono = 'warning';
  } else if (diferencia < 0) {
    cuadreTexto = `Sobrante: ${Math.abs(diferencia).toFixed(2)} CUP`;
    cuadreColor = '#d69e2e';
    cuadreIcono = 'information-circle';
  }

  return {
    // Estado
    cargando, turno,
    totalEfectivo, totalTransferencia,
    entradas, salidasFamiliares,
    cantidadVentas, cantidadAnulaciones,
    ventas, anulaciones,
    inventario, resumenDespachos, mermas,
    totalPropinas,
    inventarioInicial,
    // Expansión
    ventasExpandidas, toggleVenta,
    mermasExpandidas, toggleMerma,
    // Cuadre calculado
    efectivoReal, diferencia,
    cuadreTexto, cuadreColor, cuadreIcono,
    // Helpers
    formatearFecha, formatearHora,
  };
}