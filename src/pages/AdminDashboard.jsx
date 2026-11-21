import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminOrdenes } from '../hooks/useOrdenes';
import { useMesas } from '../hooks/useMesas';
import { useProductos } from '../hooks/useProductos';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { LoadingSpinner, SkeletonCard } from '../components/ui/LoadingSpinner';
import { toastSuccess, toastError, toastWarning } from '../components/ui/Toast';
import { createMesa, updateMesa, deleteMesa } from '../services/mesas';
import { getPlatilloMasPopular, getTopPlatosPopulares } from '../services/ordenes';

const estadoLabels = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  lista: 'Lista',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
  pagada: 'Pagada'
};

const estadoColors = {
  pendiente: 'bg-gray-100 text-gray-800',
  en_preparacion: 'bg-blue-100 text-blue-800',
  lista: 'bg-green-100 text-green-800',
  entregada: 'bg-purple-100 text-purple-800',
  cancelada: 'bg-red-100 text-red-800',
  pagada: 'bg-emerald-100 text-emerald-800'
};

const roleLabels = {
  mesero: 'Mesero',
  cocina: 'Cocina',
  barra: 'Barra',
  admin: 'Admin'
};

export function AdminDashboard() {
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const { ordenes, estadisticas, loading: ordenesLoading, error: ordenesError, refetch: refetchOrdenes, cambiarEstadoOrden, cancelar } = useAdminOrdenes();
  const { mesas, loading: mesasLoading, cambiarEstadoMesa } = useMesas();
  const { productos, categorias, loading: productosLoading, refetch: refetchProductos } = useProductos();

  const [activeTab, setActiveTab] = useState('ordenes');
  const [fechaDesde, setFechaDesde] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrden, setSelectedOrden] = useState(null);
  const [showOrdenDetail, setShowOrdenDetail] = useState(false);
  const [showMesaModal, setShowMesaModal] = useState(false);
  const [editingMesa, setEditingMesa] = useState(null);
  const [mesaForm, setMesaForm] = useState({ numero: '', estado: 'libre' });
  const [platilloPopular, setPlatilloPopular] = useState(null);
  const [topPlatos, setTopPlatos] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(false);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
          <p className="text-gray-600 mt-2">Solo administradores pueden acceder a esta vista</p>
        </div>
      </div>
    );
  }

  const handleMesaSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMesa) {
        await updateMesa(editingMesa.id, mesaForm);
      } else {
        await createMesa(mesaForm);
      }
      toastSuccess('Éxito', editingMesa ? 'Mesa actualizada' : 'Mesa creada');
      setShowMesaModal(false);
      setEditingMesa(null);
      resetMesaForm();
    } catch (err) {
      toastError('Error', err.message);
    }
  };

  const resetMesaForm = () => {
    setMesaForm({ numero: '', estado: 'libre' });
  };

  const openMesaModal = (mesa = null) => {
    if (mesa) {
      setEditingMesa(mesa);
      setMesaForm({
        numero: mesa.numero,
        estado: mesa.estado
      });
    } else {
      setEditingMesa(null);
      resetMesaForm();
    }
    setShowMesaModal(true);
  };

  // Cargar platillo más popular cuando se abre la pestaña de estadísticas
  useEffect(() => {
    if (activeTab === 'stats') {
      cargarPlatilloPopular();
    }
  }, [activeTab, fechaDesde, fechaHasta]);

  const cargarPlatilloPopular = async () => {
    setLoadingPopular(true);
    try {
      const [popular, top] = await Promise.all([
        getPlatilloMasPopular(fechaDesde, fechaHasta),
        getTopPlatosPopulares(fechaDesde, fechaHasta, 5)
      ]);
      setPlatilloPopular(popular);
      setTopPlatos(top);
    } catch (err) {
      console.error('Error cargando platillo popular:', err);
    } finally {
      setLoadingPopular(false);
    }
  };

  const handleDeleteMesa = async (mesa) => {
    if (!confirm(`¿Eliminar mesa ${mesa.numero}?`)) return;
    try {
      await deleteMesa(mesa.id);
      toastSuccess('Eliminado', 'Mesa eliminada correctamente');
    } catch (err) {
      toastError('Error', err.message);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center text-white text-2xl">
                ⚙️
              </div>
              <div>
                <h1 className="text-xl font-bold text-navy-900">Administración</h1>
                <p className="text-gray-500 text-sm">Panel de control completo</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={signOut} className="btn-ghost btn-sm">Cerrar sesión</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-4" role="tablist">
            {[
              { id: 'ordenes', label: 'Órdenes', icon: '📋' },
              { id: 'mesas', label: 'Mesas', icon: '🪑' },
              { id: 'productos', label: 'Productos', icon: '🍽️' },
              { id: 'stats', label: 'Estadísticas', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-navy-900 text-navy-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido de tabs */}
        {activeTab === 'stats' && (
          <div>
            {/* Resumen estadístico */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="card">
                <div className="card-body">
                  <p className="text-sm text-gray-500">Total Órdenes (7d)</p>
                  <p className="text-3xl font-bold text-navy-900">{estadisticas?.totalOrdenes || 0}</p>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="text-sm text-gray-500">Ventas Totales (7d)</p>
                  <p className="text-3xl font-bold text-green-600">S/ {(estadisticas?.totalVentas || 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="text-sm text-gray-500">Promedio por Orden</p>
                  <p className="text-3xl font-bold text-navy-900">S/ {(estadisticas?.promedioPorOrden || 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="text-sm text-gray-500">Mesas Totales</p>
                  <p className="text-3xl font-bold text-navy-900">{mesas.length}</p>
                </div>
              </div>
            </div>

            {/* Platillo más popular */}
            <div className="card mb-6">
              <div className="card-header flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Platillo Más Popular</h3>
                <button
                  onClick={cargarPlatilloPopular}
                  disabled={loadingPopular}
                  className="btn-ghost btn-sm"
                >
                  {loadingPopular ? <LoadingSpinner size="sm" /> : 'Actualizar'}
                </button>
              </div>
              <div className="card-body">
                {loadingPopular ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : platilloPopular ? (
                  <div className="flex items-center gap-4 p-4 bg-navy-50 rounded-lg">
                    <div className="w-16 h-16 bg-navy-900 rounded-xl flex items-center justify-center text-white text-3xl">
                      🏆
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900">{platilloPopular.nombre}</h4>
                      <p className="text-sm text-gray-500">{platilloPopular.categoria} • S/ {platilloPopular.precio.toFixed(2)} c/u</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="font-bold text-orange-600">{platilloPopular.cantidadTotal} unidades vendidas</span>
                        <span className="text-gray-600">S/ {platilloPopular.totalVendido.toFixed(2)} en ventas</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📊</div>
                    <p>No hay datos de ventas en este período</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top 5 platos más populares */}
            {topPlatos.length > 0 && (
              <div className="card mb-6">
                <div className="card-header">
                  <h3 className="font-semibold text-gray-900">Top 5 Platos Más Vendidos</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    {topPlatos.map((plato, index) => (
                      <div key={plato.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <span className="w-8 h-8 bg-navy-900 text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{plato.nombre}</p>
                          <p className="text-sm text-gray-500">{plato.categoria} • S/ {plato.precio.toFixed(2)} c/u</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-navy-900">{plato.cantidadTotal} uds</p>
                          <p className="text-sm text-gray-500">S/ {plato.totalVendido.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Ventas por categoría */}
            {estadisticas?.porCategoria && (
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-gray-900">Ventas por Categoría (7 días)</h3>
                </div>
                <div className="card-body">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {Object.entries(estadisticas.porCategoria).map(([cat, total]) => (
                      <div key={cat} className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 capitalize">{cat}</p>
                        <p className="text-2xl font-bold text-navy-900">S/ {total.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Órdenes por estado */}
            {estadisticas?.porEstado && (
              <div className="card mt-6">
                <div className="card-header">
                  <h3 className="font-semibold text-gray-900">Órdenes por Estado</h3>
                </div>
                <div className="card-body">
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(estadisticas.porEstado).map(([estado, count]) => (
                      <div key={estado} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                        <span className={`badge ${estadoColors[estado] || 'badge-pendiente'}`}>
                          {estadoLabels[estado] || estado}
                        </span>
                        <span className="text-2xl font-bold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ordenes' && (
          <div>
            {/* Filtros */}
            <div className="card mb-6">
              <div className="card-body">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="label">Desde</label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="input"
                      max={fechaHasta}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="label">Hasta</label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="input"
                      min={fechaDesde}
                    />
                  </div>
                  <button
                    onClick={() => refetchOrdenes()}
                    disabled={ordenesLoading}
                    className="btn-primary"
                  >
                    {ordenesLoading ? <LoadingSpinner size="sm" /> : 'Filtrar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Tabla de órdenes */}
            <div className="card">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Mesa</th>
                      <th>Mesero</th>
                      <th>Estado</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenesLoading ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center">
                          <LoadingSpinner />
                        </td>
                      </tr>
                    ) : ordenes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500">
                          No hay órdenes en este período
                        </td>
                      </tr>
                    ) : (
                      ordenes.map(orden => (
                        <tr key={orden.id}>
                          <td className="font-mono text-xs text-gray-500">{orden.id.slice(0, 8)}</td>
                          <td>
                            <span className="font-medium">Mesa {orden.mesas?.numero}</span>
                          </td>
                          <td className="text-sm">{orden.mesero?.full_name || 'N/A'}</td>
                          <td>
                            <select
                              value={orden.estado}
                              onChange={(e) => cambiarEstadoOrden(orden.id, e.target.value)}
                              className={`badge ${estadoColors[orden.estado] || 'badge-pendiente'} cursor-pointer py-1 px-2 text-xs`}
                            >
                              {Object.keys(estadoLabels).map(e => (
                                <option key={e} value={e}>{estadoLabels[e]}</option>
                              ))}
                            </select>
                          </td>
                          <td className="text-sm">{orden.items?.length || 0}</td>
                          <td className="font-medium text-navy-900">S/ {orden.total?.toFixed(2) || '0.00'}</td>
                          <td className="text-sm text-gray-500">
                            {new Date(orden.created_at).toLocaleString('es-ES', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setSelectedOrden(orden); setShowOrdenDetail(true); }}
                                className="btn-ghost btn-sm"
                              >
                                Ver
                              </button>
                              {orden.estado !== 'cancelada' && orden.estado !== 'pagada' && (
                                <button
                                  onClick={() => cancelar(orden.id)}
                                  className="btn-ghost btn-sm text-red-600 hover:text-red-700"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mesas' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Gestión de Mesas</h2>
              <button onClick={() => openMesaModal()} className="btn-primary">
                + Nueva Mesa
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {mesasLoading ? (
                [...Array(8)].map((_, i) => <SkeletonCard key={i} />)
              ) : mesas.map(mesa => (
                <div key={mesa.id} className="card">
                  <div className="card-body">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-navy-900 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                        {mesa.numero}
                      </div>
                      <span className={`badge ${estadoColors[mesa.estado]?.replace('badge-', 'bg-').replace('text-', 'text-') || 'bg-gray-100 text-gray-800'}`}>
                        {mesa.estado}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openMesaModal(mesa)}
                        className="btn-secondary btn-sm flex-1"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteMesa(mesa)}
                        className="btn-danger btn-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'productos' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Productos</h2>
              <button className="btn-primary" disabled>+ Nuevo Producto</button>
            </div>

            <div className="card">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Precio</th>
                      <th>Disponible</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosLoading ? (
                      <tr><td colSpan={5} className="py-8 text-center"><LoadingSpinner /></td></tr>
                    ) : productos.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-500">No hay productos</td></tr>
                    ) : (
                      productos.map(producto => (
                        <tr key={producto.id}>
                          <td className="font-medium">{producto.nombre}</td>
                          <td>
                            <span className="badge bg-gray-100 text-gray-700">
                              {producto.categorias?.nombre || 'N/A'}
                            </span>
                          </td>
                          <td className="font-medium text-navy-900">S/ {producto.precio.toFixed(2)}</td>
                          <td>
                            <span className={`badge ${producto.disponible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {producto.disponible ? 'Sí' : 'No'}
                            </span>
                          </td>
                          <td>
                            <button className="btn-ghost btn-sm" disabled>Editar</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal detalle orden */}
      <Modal isOpen={showOrdenDetail} onClose={() => setShowOrdenDetail(false)} title={`Orden ${selectedOrden?.id?.slice(0, 8)}`} size="lg">
        {selectedOrden && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-gray-500">Mesa</p>
                <p className="font-medium">Mesa {selectedOrden.mesas?.numero}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Mesero</p>
                <p className="font-medium">{selectedOrden.mesero?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <span className={`badge ${estadoColors[selectedOrden.estado] || 'badge-pendiente'}`}>
                  {estadoLabels[selectedOrden.estado]}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium mb-3">Items</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedOrden.items?.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="font-medium">{item.productos?.nombre}</p>
                      <p className="text-sm text-gray-500">Cant: {item.cantidad} × S/ {item.precio_unitario.toFixed(2)}</p>
                      {item.notas && <p className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block">{item.notas}</p>}
                    </div>
                    <span className="font-medium text-navy-900">S/ {item.subtotal?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 flex justify-end">
              <p className="text-xl font-bold text-navy-900">Total: S/ {selectedOrden.total?.toFixed(2)}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal mesa */}
      <Modal isOpen={showMesaModal} onClose={() => { setShowMesaModal(false); setEditingMesa(null); }} title={editingMesa ? 'Editar Mesa' : 'Nueva Mesa'}>
        <form onSubmit={handleMesaSubmit} className="space-y-4">
          <div>
            <label className="label">Número de mesa</label>
            <input
              type="number"
              min="1"
              value={mesaForm.numero}
              onChange={(e) => setMesaForm({ ...mesaForm, numero: parseInt(e.target.value) || '' })}
              className="input"
              required
              disabled={editingMesa}
            />
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              value={mesaForm.estado}
              onChange={(e) => setMesaForm({ ...mesaForm, estado: e.target.value })}
              className="input"
            >
              <option value="libre">Libre</option>
              <option value="ocupada">Ocupada</option>
              <option value="reservada">Reservada</option>
              <option value="mantenimiento">Mantenimiento</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setShowMesaModal(false); setEditingMesa(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editingMesa ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}