import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMesas } from '../hooks/useMesas';
import { useProductos } from '../hooks/useProductos';
import { useCreateOrden } from '../hooks/useOrdenes';
import { subscribeToOrdenItems } from '../services/ordenes';
import { MesaGrid } from '../components/MesaCard';
import { ProductoGrid } from '../components/ProductoCard';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { LoadingSpinner, SkeletonCard } from '../components/ui/LoadingSpinner';
import { toastSuccess, toastError, toastWarning, toastInfo } from '../components/ui/Toast';

const categoriaOrden = ['comida', 'bebida'];

export function WaiterDashboard() {
  const { user, profile, signOut, isMesero } = useAuth();
  const navigate = useNavigate();

  const { mesas, loading: mesasLoading, cambiarEstadoMesa, mesasLibres, mesasOcupadas } = useMesas();
  const { productosByCategoria, loading: productosLoading, categorias } = useProductos({ disponible: true });
  const { crearOrden, loading: crearLoading } = useCreateOrden();

  const [selectedMesaId, setSelectedMesaId] = useState(null);
  const [selectedProductos, setSelectedProductos] = useState({}); // { productoId: { cantidad, notas } }
  const [activeCategoria, setActiveCategoria] = useState('comida');
  const [notasComanda, setNotasComanda] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [mesaParaLiberar, setMesaParaLiberar] = useState(null);

  const selectedMesa = mesas.find(m => m.id === selectedMesaId);
  const isMesaOcupada = selectedMesa?.estado === 'ocupada';
  const isMesaLibre = selectedMesa?.estado === 'libre';

  // Filtrar productos por categoría activa
  const productosCategoria = productosByCategoria[activeCategoria]?.productos || [];

  // Calcular total de la comanda
  const comandaItems = Object.entries(selectedProductos)
    .map(([id, data]) => {
      const producto = productosCategoria.find(p => p.id === id) ||
        Object.values(productosByCategoria).flatMap(c => c.productos).find(p => p.id === id);
      return producto ? { ...producto, cantidad: data.cantidad, notas: data.notas } : null;
    })
    .filter(Boolean);

  const totalComanda = comandaItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const totalItems = comandaItems.reduce((sum, item) => sum + item.cantidad, 0);

  // Realtime: escuchar cambios en orden_items para actualizar UI cuando cocina/barra marcan items como 'lista'
  const ordenesRef = useRef({});
  useEffect(() => {
    const unsubscribe = subscribeToOrdenItems((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      if (eventType === 'UPDATE' && newRecord) {
        // Actualizar cache local de órdenes afectadas
        const ordenId = newRecord.orden_id;
        if (ordenId) {
          ordenesRef.current[ordenId] = true;
        }

        // Notificar al usuario si un item de su mesa pasa a 'lista'
        if (newRecord.estado === 'lista' && selectedMesaId) {
          // Verificar si el item pertenece a la mesa seleccionada
          // (necesitaríamos cargar la orden para confirmar, pero mostramos toast genérico)
          toastInfo('¡Listo!', `Un producto está listo para servir`);
        }
      }
    });

    return () => unsubscribe();
  }, [selectedMesaId]);

  const handleProductoChange = (producto, delta = 1) => {
    setSelectedProductos(prev => {
      const current = prev[producto.id] || { cantidad: 0, notas: '' };
      const nuevaCantidad = Math.max(0, current.cantidad + delta);

      if (nuevaCantidad === 0) {
        const { [producto.id]: removed, ...rest } = prev;
        return rest;
      }

      return { ...prev, [producto.id]: { ...current, cantidad: nuevaCantidad } };
    });
  };

  const handleNotasChange = (productoId, notas) => {
    setSelectedProductos(prev => ({
      ...prev,
      [productoId]: { ...prev[productoId], notas }
    }));
  };

  const handleCrearComanda = async () => {
    if (!selectedMesaId || comandaItems.length === 0) return;

    try {
      const items = comandaItems.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        notas: selectedProductos[item.id]?.notas || ''
      }));

      await crearOrden({
        mesa_id: selectedMesaId,
        items,
        notas: notasComanda
      });

      toastSuccess('Comanda enviada', `Mesa ${selectedMesa.numero} - ${totalItems} items - S/ ${totalComanda.toFixed(2)}`);
      setSelectedProductos({});
      setNotasComanda('');
      setSelectedMesaId(null);
    } catch (err) {
      toastError('Error', 'No se pudo crear la comanda: ' + err.message);
    }
  };

  const handleLiberarMesa = async () => {
    if (!mesaParaLiberar) return;

    try {
      await cambiarEstadoMesa(mesaParaLiberar.id, 'libre');
      toastSuccess('Mesa liberada', `Mesa ${mesaParaLiberar.numero} ahora está libre`);
      setMesaParaLiberar(null);
    } catch (err) {
      toastError('Error', 'No se pudo liberar la mesa');
    }
  };

  const handleMesaClick = (mesa) => {
    if (mesa.estado === 'mantenimiento') return;

    if (selectedMesaId === mesa.id) {
      setSelectedMesaId(null);
      setSelectedProductos({});
      setNotasComanda('');
    } else {
      // Si hay productos seleccionados y cambiamos de mesa, preguntar
      if (Object.keys(selectedProductos).length > 0) {
        // Por ahora solo cambiamos, en una versión real confirmaríamos
      }
      setSelectedMesaId(mesa.id);
      setSelectedProductos({});
      setNotasComanda('');
    }
  };

  // No permitir acceso si no es mesero ni admin
  if (!isMesero) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
          <p className="text-gray-600 mt-2">Solo meseros pueden acceder a esta vista</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-navy-900">Mesas & Comandas</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {mesasLibres.length} libres / {mesasOcupadas.length} ocupadas
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 hidden sm:block">
                {profile?.full_name || user?.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Panel izquierdo: Mesas */}
          <div className="lg:col-span-1">
            <div className="card h-full">
              <div className="card-header flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Mesas</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={activeCategoria}
                    onChange={(e) => setActiveCategoria(e.target.value)}
                    className="input input-sm w-auto"
                  >
                    {categoriaOrden.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="card-body p-0 overflow-hidden">
                {mesasLoading ? (
                  <div className="p-4 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : (
                  <div className="p-4">
                    <MesaGrid
                      mesas={mesas}
                      onMesaClick={handleMesaClick}
                      selectedMesaId={selectedMesaId}
                      compact
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel central: Menú */}
          <div className="lg:col-span-1">
            <div className="card h-full flex flex-col">
              <div className="card-header">
                <h2 className="font-semibold text-gray-900">Menú</h2>
              </div>
              <div className="card-body flex-1 overflow-y-auto">
                {/* Categorías tabs */}
                <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
                  {categorias.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategoria(cat.slug)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        activeCategoria === cat.slug
                          ? 'bg-navy-900 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {cat.nombre}
                    </button>
                  ))}
                </div>

                {productosLoading ? (
                  <div className="grid gap-3 grid-cols-2">
                    {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : (
                  <ProductoGrid
                    productos={productosCategoria}
                    onAdd={handleProductoChange}
                    selectedProductos={selectedProductos}
                    emptyMessage={`No hay ${categorias.find(c => c.slug === activeCategoria)?.nombre.toLowerCase() || 'productos'} disponibles`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Panel derecho: Comanda actual */}
          <div className="lg:col-span-1">
            <div className="card h-full flex flex-col">
              <div className="card-header flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  Comanda {selectedMesa ? `Mesa ${selectedMesa.numero}` : ''}
                </h2>
                {selectedMesa && selectedMesa.estado !== 'libre' && selectedMesa.estado !== 'mantenimiento' && (
                  <span className={`badge badge-${selectedMesa.estado}`}>
                    {selectedMesa.estado === 'ocupada' ? 'Ocupada' : selectedMesa.estado}
                  </span>
                )}
              </div>

              <div className="card-body flex-1 overflow-y-auto">
                {selectedMesa ? (
                  <>
                    {comandaItems.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <div className="text-4xl mb-3">📝</div>
                        <p className="text-gray-500">Selecciona productos para la comanda</p>
                        {isMesaLibre && <p className="text-sm text-gray-400 mt-1">La mesa está libre</p>}
                        {isMesaOcupada && <p className="text-sm text-amber-600 mt-1">La mesa ya tiene una orden activa</p>}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 mb-4">
                          {comandaItems.map(item => {
                            const data = selectedProductos[item.id] || {};
                            return (
                              <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-gray-900 truncate pr-2">{item.nombre}</h4>
                                    <span className="text-navy-900 font-bold whitespace-nowrap">
                                      S/ {(item.precio * data.cantidad).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <button
                                      onClick={() => handleProductoChange(item, -1)}
                                      className="p-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 text-sm"
                                    >−</button>
                                    <span className="font-bold text-gray-900 w-8 text-center">{data.cantidad}</span>
                                    <button
                                      onClick={() => handleProductoChange(item, 1)}
                                      className="p-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 text-sm"
                                    >+</button>
                                    <span className="text-sm text-gray-500 flex-1">
                                      S/ {item.precio.toFixed(2)} c/u
                                    </span>
                                  </div>
                                  <input
                                    type="text"
                                    value={data.notas || ''}
                                    onChange={(e) => handleNotasChange(item.id, e.target.value)}
                                    placeholder="Notas: sin cebolla, poco hielo, etc."
                                    className="input input-sm mt-2 text-xs"
                                  />
                                </div>
                                <button
                                  onClick={() => handleProductoChange(item, -data.cantidad)}
                                  className="text-gray-400 hover:text-red-600 p-1"
                                  aria-label="Eliminar item"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <div className="border-t border-gray-200 pt-4 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal ({totalItems} items)</span>
                            <span className="font-medium text-gray-900">S/ {totalComanda.toFixed(2)}</span>
                          </div>
                          <input
                            type="text"
                            value={notasComanda}
                            onChange={(e) => setNotasComanda(e.target.value)}
                            placeholder="Notas generales de la comanda"
                            className="input input-sm"
                          />
                          <button
                            onClick={handleCrearComanda}
                            disabled={crearLoading}
                            className="btn-primary w-full py-3 text-lg"
                          >
                            {crearLoading ? (
                              <span className="flex items-center justify-center gap-2">
                                <LoadingSpinner size="sm" />
                                Enviando...
                              </span>
                            ) : (
                              `Enviar comanda - S/ ${totalComanda.toFixed(2)}`
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-3">🪑</div>
                    <p className="text-gray-500">Selecciona una mesa para empezar</p>
                  </div>
                )}
              </div>

              {/* Acciones rápidas para mesa ocupada */}
              {selectedMesa && isMesaOcupada && (
                <div className="card-footer border-t border-gray-200">
                  <button
                    onClick={() => { setMesaParaLiberar(selectedMesa); setShowConfirm(true); }}
                    className="btn-warning w-full"
                  >
                    Liberar mesa
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal confirmar liberar mesa */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => { setShowConfirm(false); setMesaParaLiberar(null); }}
        onConfirm={handleLiberarMesa}
        title="Liberar mesa"
        message={`¿Estás seguro de liberar la mesa ${mesaParaLiberar?.numero}? Se marcará como libre.`}
        confirmText="Liberar"
        variant="warning"
      />
    </div>
  );
}