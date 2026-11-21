import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const estadoStyles = {
  libre: 'mesa-libre',
  ocupada: 'mesa-ocupada',
  reservada: 'mesa-reservada',
  mantenimiento: 'mesa-mantenimiento'
};

const estadoLabels = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
  mantenimiento: 'Mantenimiento'
};

const estadoIcons = {
  libre: '✅',
  ocupada: '👥',
  reservada: '📅',
  mantenimiento: '🔧'
};

export function MesaCard({ mesa, onClick, selected, ordenActiva, compact = false }) {
  const { isMesero, isAdmin } = useAuth();
  const [ordenCount, setOrdenCount] = useState(0);
  const [ordenTotal, setOrdenTotal] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  const claseMesa = `${estadoStyles[mesa.estado]} ${selected ? 'mesa-seleccionada' : ''} ${!compact ? '' : 'w-24 h-24'}`;

  const puedeInteractuar = isMesero || isAdmin;
  const showDetails = !compact && (mesa.estado === 'ocupada' || mesa.estado === 'reservada');

  const handleClick = (e) => {
    e.stopPropagation();
    if (puedeInteractuar && onClick) {
      onClick(mesa);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (puedeInteractuar && mesa.estado !== 'mantenimiento') {
      // Aquí se abriría un menú contextual para cambiar estado
    }
  };

  return (
    <div
      className={claseMesa}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={puedeInteractuar ? 0 : -1}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e); }}
      aria-label={`Mesa ${mesa.numero}, ${estadoLabels[mesa.estado]}`}
      aria-pressed={selected}
    >
      {/* Número de mesa */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
        <span className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-bold text-gray-900 shadow-sm">
          {mesa.numero}
        </span>
        {mesa.estado === 'mantenimiento' && (
          <span className="bg-gray-900 text-white px-2 py-0.5 rounded-full text-xs font-medium">
            🔧
          </span>
        )}
      </div>

      {/* Contenido principal */}
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="text-4xl mb-2" aria-hidden="true">
          {estadoIcons[mesa.estado]}
        </div>

        {!compact && (
          <div className="mb-1">
            <span className={`badge ${estadoStyles[mesa.estado].replace('mesa-', 'badge-')}`}>
              {estadoLabels[mesa.estado]}
            </span>
          </div>
        )}

        {/* Info de orden activa */}
        {showDetails && ordenActiva && (
          <div className="mt-3 pt-3 border-t border-white/50 w-full text-left space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Orden #{ordenActiva.id?.slice(0, 8)}</span>
              <span className="font-medium text-navy-900">S/ {ordenActiva.total?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span className={`badge ${estadoStyles[ordenActiva.estado]?.replace('mesa-', 'badge-') || 'badge-pendiente'}`}>
                {estadoLabels[ordenActiva.estado] || ordenActiva.estado}
              </span>
              <span>{ordenActiva.items?.length || 0} items</span>
            </div>
          </div>
        )}

        {showDetails && !ordenActiva && mesa.estado === 'ocupada' && (
          <div className="mt-3 text-xs text-gray-500 italic">
            Cargando orden...
          </div>
        )}
      </div>

      {/* Indicador de selección */}
      {selected && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          <div className="w-2 h-2 bg-navy-500 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-navy-500 rounded-full animate-pulse" style={{ animationDelay: '100ms' }}></div>
          <div className="w-2 h-2 bg-navy-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
        </div>
      )}
    </div>
  );
}

export function MesaGrid({ mesas, onMesaClick, selectedMesaId, ordenesActivas = [], compact = false }) {
  const ordenesPorMesa = ordenesActivas.reduce((acc, orden) => {
    if (!acc[orden.mesa_id]) acc[orden.mesa_id] = [];
    acc[orden.mesa_id].push(orden);
    return acc;
  }, {});

  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
      {mesas.map(mesa => {
        const ordenActiva = ordenesPorMesa[mesa.id]?.[0];
        return (
          <MesaCard
            key={mesa.id}
            mesa={mesa}
            onClick={onMesaClick}
            selected={selectedMesaId === mesa.id}
            ordenActiva={ordenActiva}
            compact={compact}
          />
        );
      })}
    </div>
  );
}