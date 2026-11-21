import { useState } from 'react';

export function ProductoCard({ producto, onAdd, selected, cantidad = 0, compact = false }) {
  const [hovered, setHovered] = useState(false);

  const isSelected = selected || cantidad > 0;
  const isAvailable = producto.disponible;

  return (
    <div
      className={`
        card relative overflow-hidden transition-all duration-200
        ${isSelected ? 'ring-2 ring-navy-500 bg-navy-50' : 'hover:shadow-md'}
        ${!isAvailable ? 'opacity-50 grayscale' : ''}
        ${compact ? '' : 'group'}
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icono del producto (sin imagen) */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        <div className="w-full h-full flex items-center justify-center text-4xl">
          🍽️
        </div>

        {!isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              No disponible
            </span>
          </div>
        )}

        {cantidad > 0 && (
          <div className="absolute top-2 right-2">
            <span className="bg-navy-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
              {cantidad}
            </span>
          </div>
        )}
      </div>

      {/* Info del producto */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight flex-1 pr-2">
            {producto.nombre}
          </h3>
          <span className="text-navy-900 font-bold text-lg whitespace-nowrap flex-shrink-0">
            S/ {producto.precio.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          {producto.categorias && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              {producto.categorias.nombre}
            </span>
          )}
        </div>
      </div>

      {/* Botón de agregar / contador */}
      {isAvailable && (
        <div className={`p-4 border-t border-gray-100 transition-opacity ${compact ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {cantidad === 0 ? (
            <button
              onClick={() => onAdd?.(producto)}
              disabled={!isAvailable}
              className="btn-primary w-full"
            >
              Agregar
            </button>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => onAdd?.(producto, -1)}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                aria-label="Quitar uno"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="font-bold text-lg text-gray-900 w-8 text-center">{cantidad}</span>
              <button
                onClick={() => onAdd?.(producto, 1)}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                aria-label="Agregar uno"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {selected && !compact && (
        <div className="absolute inset-0 bg-navy-500/10 pointer-events-none" />
      )}
    </div>
  );
}

export function ProductoGrid({ productos, onAdd, selectedProductos = {}, compact = false, emptyMessage = 'No hay productos disponibles' }) {
  if (!productos || productos.length === 0) {
    return (
      <div className="col-span-full text-center py-12">
        <div className="text-4xl mb-3">🍽️</div>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
      {productos.map(producto => (
        <ProductoCard
          key={producto.id}
          producto={producto}
          onAdd={onAdd}
          selected={selectedProductos[producto.id]?.selected}
          cantidad={selectedProductos[producto.id]?.cantidad || 0}
          compact={compact}
        />
      ))}
    </div>
  );
}