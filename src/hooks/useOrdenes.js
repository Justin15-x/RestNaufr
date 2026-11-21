import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getOrdenes,
  getOrdenById,
  createOrden,
  updateOrdenEstado,
  cancelarOrden,
  getOrdenItemsByCategoria,
  updateOrdenItemEstado,
  updateOrdenItemsEstados,
  subscribeToOrdenes,
  subscribeToOrdenItems
} from '../services/ordenes';

// Hook general para órdenes
export function useOrdenes(filters = {}) {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrdenes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOrdenes(filters);
      setOrdenes(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching ordenes:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.mesaId, filters.meseroId, filters.estado, filters.fechaDesde, filters.fechaHasta, filters.limit]);

  useEffect(() => {
    fetchOrdenes();

    const unsubscribe = subscribeToOrdenes((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      setOrdenes(prev => {
        switch (eventType) {
          case 'INSERT':
            return [newRecord, ...prev];
          case 'UPDATE':
            return prev.map(o => o.id === newRecord.id ? { ...o, ...newRecord } : o);
          case 'DELETE':
            return prev.filter(o => o.id !== oldRecord.id);
          default:
            return prev;
        }
      });
    }, filters);

    return () => unsubscribe();
  }, [fetchOrdenes, filters.mesaId, filters.meseroId, filters.estado]);

  return {
    ordenes,
    loading,
    error,
    refetch: fetchOrdenes
  };
}

// Hook para una orden específica
export function useOrden(id) {
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrden = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getOrdenById(id);
      setOrden(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching orden:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrden();

    const unsubscribe = subscribeToOrdenes((payload) => {
      if (payload.new?.id === id || payload.old?.id === id) {
        fetchOrden();
      }
    });

    return () => unsubscribe();
  }, [fetchOrden, id]);

  return { orden, loading, error, refetch: fetchOrden };
}

// Hook para crear órdenes (mesero)
export function useCreateOrden() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const crearOrden = async (ordenData) => {
    try {
      setLoading(true);
      setError(null);
      const orden = await createOrden(ordenData);
      return orden;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { crearOrden, loading, error };
}

// Hook para cocina - items de comida
export function useOrdenesCocina(filters = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOrdenItemsByCategoria('comida', filters);
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching items cocina:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.estado, filters.ordenId]);

  useEffect(() => {
    fetchItems();

    const unsubscribe = subscribeToOrdenItems((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      // Filtrar solo items de comida
      if (newRecord?.productos?.categorias?.slug !== 'comida' &&
          oldRecord?.productos?.categorias?.slug !== 'comida') {
        return;
      }

      setItems(prev => {
        switch (eventType) {
          case 'INSERT':
            return [...prev, newRecord].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          case 'UPDATE':
            return prev.map(item => item.id === newRecord.id ? { ...item, ...newRecord } : item);
          case 'DELETE':
            return prev.filter(item => item.id !== oldRecord.id);
          default:
            return prev;
        }
      });
    }, 'comida');

    return () => unsubscribe();
  }, [fetchItems]);

  // Agrupar items por orden para vista de cocina
  const itemsPorOrden = items.reduce((acc, item) => {
    const ordenId = item.ordenes?.id || item.orden_id;
    if (!acc[ordenId]) {
      acc[ordenId] = {
        ordenId,
        mesaNumero: item.ordenes?.mesas?.numero || item.ordenes?.mesa_id,
        ordenEstado: item.ordenes?.estado,
        ordenCreatedAt: item.ordenes?.created_at,
        items: []
      };
    }
    acc[ordenId].items.push(item);
    return acc;
  }, {});

  const actualizarEstadoItem = async (id, estado, notas = null) => {
    try {
      await updateOrdenItemEstado(id, estado, notas);
      // Realtime actualiza automáticamente
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const actualizarMultiplesItems = async (itemsToUpdate) => {
    try {
      await updateOrdenItemsEstados(itemsToUpdate);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Items agrupados por estado
  const itemsPendientes = items.filter(i => i.estado === 'pendiente');
  const itemsEnPreparacion = items.filter(i => i.estado === 'en_preparacion');
  const itemsListos = items.filter(i => i.estado === 'lista');

  return {
    items,
    itemsPorOrden,
    loading,
    error,
    refetch: fetchItems,
    actualizarEstadoItem,
    actualizarMultiplesItems,
    itemsPendientes,
    itemsEnPreparacion,
    itemsListos
  };
}

// Hook para barra - items de bebida
export function useOrdenesBarra(filters = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOrdenItemsByCategoria('bebida', filters);
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching items barra:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.estado, filters.ordenId]);

  useEffect(() => {
    fetchItems();

    const unsubscribe = subscribeToOrdenItems((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      // Filtrar solo items de bebida
      if (newRecord?.productos?.categorias?.slug !== 'bebida' &&
          oldRecord?.productos?.categorias?.slug !== 'bebida') {
        return;
      }

      setItems(prev => {
        switch (eventType) {
          case 'INSERT':
            return [...prev, newRecord].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          case 'UPDATE':
            return prev.map(item => item.id === newRecord.id ? { ...item, ...newRecord } : item);
          case 'DELETE':
            return prev.filter(item => item.id !== oldRecord.id);
          default:
            return prev;
        }
      });
    }, 'bebida');

    return () => unsubscribe();
  }, [fetchItems]);

  const itemsPorOrden = items.reduce((acc, item) => {
    const ordenId = item.ordenes?.id || item.orden_id;
    if (!acc[ordenId]) {
      acc[ordenId] = {
        ordenId,
        mesaNumero: item.ordenes?.mesas?.numero || item.ordenes?.mesa_id,
        ordenEstado: item.ordenes?.estado,
        ordenCreatedAt: item.ordenes?.created_at,
        items: []
      };
    }
    acc[ordenId].items.push(item);
    return acc;
  }, {});

  const actualizarEstadoItem = async (id, estado, notas = null) => {
    try {
      await updateOrdenItemEstado(id, estado, notas);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const actualizarMultiplesItems = async (itemsToUpdate) => {
    try {
      await updateOrdenItemsEstados(itemsToUpdate);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const itemsPendientes = items.filter(i => i.estado === 'pendiente');
  const itemsEnPreparacion = items.filter(i => i.estado === 'en_preparacion');
  const itemsListos = items.filter(i => i.estado === 'lista');

  return {
    items,
    itemsPorOrden,
    loading,
    error,
    refetch: fetchItems,
    actualizarEstadoItem,
    actualizarMultiplesItems,
    itemsPendientes,
    itemsEnPreparacion,
    itemsListos
  };
}

// Hook para admin - todas las órdenes con estadísticas
export function useAdminOrdenes() {
  const [ordenes, setOrdenes] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [ordenesData, statsData] = await Promise.all([
        getOrdenes({ limit: 100 }),
        getEstadisticas(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // últimos 7 días
          new Date().toISOString()
        )
      ]);
      setOrdenes(ordenesData);
      setEstadisticas(statsData);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching admin ordenes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const unsubscribe = subscribeToOrdenes(() => {
      fetchAll();
    });

    return () => unsubscribe();
  }, [fetchAll]);

  const cambiarEstadoOrden = async (id, estado) => {
    try {
      await updateOrdenEstado(id, estado);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const cancelar = async (id) => {
    try {
      await cancelarOrden(id);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    ordenes,
    estadisticas,
    loading,
    error,
    refetch: fetchAll,
    cambiarEstadoOrden,
    cancelar
  };
}

// Import getEstadisticas
import { getEstadisticas } from '../services/ordenes';