import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrdenesCocina } from '../hooks/useOrdenes';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner, SkeletonCard } from '../components/ui/LoadingSpinner';
import { toastSuccess, toastError, toastWarning } from '../components/ui/Toast';

const estadoOrden = ['pendiente', 'en_preparacion', 'lista'];
const estadoLabels = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  lista: 'Lista',
  entregada: 'Entregada',
  cancelada: 'Cancelada'
};
const estadoColors = {
  pendiente: 'bg-gray-100 text-gray-800',
  en_preparacion: 'bg-blue-100 text-blue-800',
  lista: 'bg-green-100 text-green-800',
  entregada: 'bg-purple-100 text-purple-800',
  cancelada: 'bg-red-100 text-red-800'
};
const nextEstado = {
  pendiente: 'en_preparacion',
  en_preparacion: 'lista',
  lista: 'entregada'
};

export function KitchenDashboard() {
  const { isCocina, isAdmin } = useAuth();
  const { itemsPorOrden, loading, error, refetch, actualizarEstadoItem, actualizarMultiplesItems, itemsPendientes, itemsEnPreparacion, itemsListos } = useOrdenesCocina({
    estado: estadoOrden
  });

  const [expandedOrdenes, setExpandedOrdenes] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [selectedItems, setSelectedItems] = useState({}); // Para acciones en lote

  if (!isCocina && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
          <p className="text-gray-600 mt-2">Solo cocina puede acceder a esta vista</p>
        </div>
      </div>
    );
  }

  const toggleOrden = (ordenId) => {
    setExpandedOrdenes(prev => ({ ...prev, [ordenId]: !prev[ordenId] }));
  };

  const handleCambiarEstado = async (itemId, nuevoEstado) => {
    try {
      await actualizarEstadoItem(itemId, nuevoEstado);
      toastSuccess('Actualizado', `Item marcado como ${estadoLabels[nuevoEstado]}`);
    } catch (err) {
      toastError('Error', 'No se pudo actualizar el estado');
    }
  };

  const handleMarcarTodoListo = async (ordenId) => {
    const orden = itemsPorOrden[ordenId];
    if (!orden) return;

    const itemsPendientesOrden = orden.items.filter(i =>
      i.estado === 'pendiente' || i.estado === 'en_preparacion'
    );

    if (itemsPendientesOrden.length === 0) return;

    try {
      const updates = itemsPendientesOrden.map(item => ({
        id: item.id,
        orden_id: orden.ordenId,
        estado: 'lista'
      }));
      await actualizarMultiplesItems(updates);
      toastSuccess('Completado', `${itemsPendientesOrden.length} items marcados como listos`);
    } catch (err) {
      toastError('Error', 'No se pudieron actualizar los items');
    }
  };

  const handleSeleccionarItem = (itemId, seleccionado) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (seleccionado) {
        next[itemId] = true;
      } else {
        delete next[itemId];
      }
      return next;
    });
  };

  const handleAccionLote = async (nuevoEstado) => {
    const itemIds = Object.keys(selectedItems);
    if (itemIds.length === 0) return;

    try {
      // Obtener orden_id para cada item seleccionado
      const updates = itemIds.map(id => {
        const item = items.find(i => i.id === id);
        return { id, orden_id: item?.ordenes?.id || item?.orden_id, estado: nuevoEstado };
      });
      await actualizarMultiplesItems(updates);
      toastSuccess('Actualizado', `${itemIds.length} items actualizados`);
      setSelectedItems({});
    } catch (err) {
      toastError('Error', 'No se pudieron actualizar los items');
    }
  };

  // Auto-expandir órdenes con items pendientes
  useEffect(() => {
    Object.keys(itemsPorOrden).forEach(ordenId => {
      const orden = itemsPorOrden[ordenId];
      const tienePendientes = orden.items.some(i => i.estado === 'pendiente');
      if (tienePendientes && !expandedOrdenes[ordenId]) {
        setExpandedOrdenes(prev => ({ ...prev, [ordenId]: true }));
      }
    });
  }, [itemsPorOrden, expandedOrdenes]);

  const ordenesArray = Object.entries(itemsPorOrden).sort((a, b) => {
    // Ordenar por: primero las que tienen pendientes, luego por fecha
    const aPendientes = a[1].items.some(i => i.estado === 'pendiente');
    const bPendientes = b[1].items.some(i => i.estado === 'pendiente');
    if (aPendientes !== bPendientes) return bPendientes - aPendientes;
    return new Date(a[1].ordenCreatedAt) - new Date(b[1].ordenCreatedAt);
  });

  return (
    <div className="page-container bg-gray-100">
      <header className="page-header bg-navy-900 border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white text-2xl">
                🍳
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Cocina</h1>
                <p className="text-navy-300 text-sm">Gestión de pedidos de comida en tiempo real</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Contadores rápidos */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="bg-navy-800 px-3 py-1 rounded-lg">
                  <span className="text-orange-400 font-bold">{itemsPendientes.length}</span>
                  <span className="text-navy-300 ml-1 text-sm">Pendientes</span>
                </div>
                <div className="bg-navy-800 px-3 py-1 rounded-lg">
                  <span className="text-blue-400 font-bold">{itemsEnPreparacion.length}</span>
                  <span className="text-navy-300 ml-1 text-sm">En prep.</span>
                </div>
                <div className="bg-navy-800 px-3 py-1 rounded-lg">
                  <span className="text-green-400 font-bold">{itemsListos.length}</span>
                  <span className="text-navy-300 ml-1 text-sm">Listos</span>
                </div>
              </div>

              <button
                onClick={refetch}
                disabled={loading}
                className="p-2 rounded-lg bg-navy-800 text-white hover:bg-navy-700 transition-colors"
              >
                <LoadingSpinner size="sm" className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filtros */}
        <div className="mb-6 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="w-4 h-4 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
            />
            <span className="text-sm font-medium text-gray-700">Mostrar completados (entregados)</span>
          </label>

          {Object.keys(selectedItems).length > 0 && (
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-sm text-gray-600">{Object.keys(selectedItems).length} items seleccionados</span>
              <button
                onClick={() => handleAccionLote('en_preparacion')}
                disabled={Object.keys(selectedItems).length === 0}
                className="btn-sm btn-primary"
              >
                Iniciar preparación
              </button>
              <button
                onClick={() => handleAccionLote('lista')}
                disabled={Object.keys(selectedItems).length === 0}
                className="btn-sm btn-success"
              >
                Marcar listos
              </button>
              <button
                onClick={() => setSelectedItems({})}
                className="btn-sm btn-ghost"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Error: {error}</span>
            <button onClick={refetch} className="ml-auto text-sm underline">Reintentar</button>
          </div>
        )}

        {loading && Object.keys(itemsPorOrden).length === 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : ordenesArray.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🍳</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No hay pedidos de cocina</h2>
            <p className="text-gray-500">Los pedidos de comida aparecerán aquí automáticamente</p>
            <button onClick={refetch} className="mt-4 btn-primary">Actualizar</button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ordenesArray.map(([ordenId, orden]) => {
              const items = showAll ? orden.items : orden.items.filter(i => i.estado !== 'entregada' && i.estado !== 'cancelada');
              const isExpanded = expandedOrdenes[ordenId];
              const tienePendientes = items.some(i => i.estado === 'pendiente');
              const todosListos = items.length > 0 && items.every(i => i.estado === 'lista' || i.estado === 'entregada');

              return (
                <div
                  key={ordenId}
                  className={`card ${tienePendientes ? 'ring-2 ring-orange-400' : ''} ${todosListos && !tienePendientes ? 'ring-2 ring-green-400' : ''}`}
                >
                  <div
                    className="card-header cursor-pointer"
                    onClick={() => toggleOrden(ordenId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                          {orden.mesaNumero}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Mesa {orden.mesaNumero}</p>
                          <p className="text-sm text-gray-500">Orden #{orden.ordenId?.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${estadoColors[orden.ordenEstado] || 'badge-pendiente'}`}>
                          {estadoLabels[orden.ordenEstado] || orden.ordenEstado}
                        </span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className={`card-body ${isExpanded ? '' : 'hidden'}`}>
                    <div className="space-y-3">
                      {items.map(item => {
                        const isSelected = Boolean(selectedItems[item.id]);
                        const puedeAvanzar = item.estado !== 'lista' && item.estado !== 'entregada' && item.estado !== 'cancelada';
                        const siguienteEstado = nextEstado[item.estado];

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border transition-all ${isSelected ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleSeleccionarItem(item.id, e.target.checked)}
                                className="mt-1 w-4 h-4 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-900 truncate pr-2">{item.productos?.nombre}</h4>
                                  <span className={`badge ${estadoColors[item.estado] || 'badge-pendiente'} whitespace-nowrap`}>
                                    {estadoLabels[item.estado] || item.estado}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                  <span>Cantidad: <span className="font-medium">{item.cantidad}</span></span>
                                  {item.notas && (
                                    <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-xs">
                                      {item.notas}
                                    </span>
                                  )}
                                  <span className="text-gray-400">
                                    {new Date(item.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              {puedeAvanzar && (
                                <button
                                  onClick={() => handleCambiarEstado(item.id, siguienteEstado)}
                                  className="btn-sm btn-primary whitespace-nowrap"
                                >
                                  {siguienteEstado === 'en_preparacion' ? '🔥 Iniciar' : siguienteEstado === 'lista' ? '✅ Listo' : '📦 Entregar'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {items.length === 0 && showAll && (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          No hay items en esta orden
                        </div>
                      )}

                      {items.length > 0 && !isExpanded && (
                        <div className="text-center py-2">
                          <span className="text-sm text-gray-500">
                            {items.length} item{items.length !== 1 ? 's' : ''} - Click para ver detalles
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Acciones de orden completa */}
                    {(items.some(i => i.estado === 'pendiente' || i.estado === 'en_preparacion')) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleMarcarTodoListo(ordenId)}
                          className="btn-success w-full sm:w-auto"
                        >
                          ✅ Marcar todo como listo ({items.filter(i => i.estado !== 'lista' && i.estado !== 'entregada' && i.estado !== 'cancelada').length})
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}