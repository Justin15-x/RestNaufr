import { useState, useEffect, useCallback } from 'react';
import { getMesas, updateMesaEstado, subscribeToMesas } from '../services/mesas';

export function useMesas() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMesas = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMesas();
      setMesas(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching mesas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMesas();

    // Suscribirse a cambios en tiempo real
    const unsubscribe = subscribeToMesas((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      setMesas(prev => {
        switch (eventType) {
          case 'INSERT':
            return [...prev, newRecord].sort((a, b) => a.numero - b.numero);
          case 'UPDATE':
            return prev.map(m => m.id === newRecord.id ? newRecord : m);
          case 'DELETE':
            return prev.filter(m => m.id !== oldRecord.id);
          default:
            return prev;
        }
      });
    });

    return () => unsubscribe();
  }, [fetchMesas]);

  const cambiarEstadoMesa = async (id, estado) => {
    try {
      await updateMesaEstado(id, estado);
      // El realtime actualizará automáticamente
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getMesaByNumero = useCallback((numero) => {
    return mesas.find(m => m.numero === numero);
  }, [mesas]);

  const getMesasByEstado = useCallback((estado) => {
    return mesas.filter(m => m.estado === estado);
  }, [mesas]);

  const mesasLibres = mesas.filter(m => m.estado === 'libre');
  const mesasOcupadas = mesas.filter(m => m.estado === 'ocupada');

  return {
    mesas,
    loading,
    error,
    refetch: fetchMesas,
    cambiarEstadoMesa,
    getMesaByNumero,
    getMesasByEstado,
    mesasLibres,
    mesasOcupadas
  };
}