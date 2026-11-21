export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  };

  return (
    <div className={`inline-block ${sizes[size]} border-navy-900 border-t-transparent rounded-full animate-spin ${className}`} />
  );
}

export function LoadingOverlay({ message = 'Cargando...' }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-lg">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return (
    <div className={`skeleton ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="card-header">
        <Skeleton className="h-6 w-3/4" />
      </div>
      <div className="card-body space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-1/4" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {Array.from({ length: cols }).map((_, i) => (
                  <th key={i}><Skeleton className="h-4 w-full" /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, row) => (
                <tr key={row}>
                  {Array.from({ length: cols }).map((_, col) => (
                    <td key={col}><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}