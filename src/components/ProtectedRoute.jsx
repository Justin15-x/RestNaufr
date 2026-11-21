import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-navy-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso denegado</h1>
          <p className="text-gray-600 mb-6">
            No tienes permisos para acceder a esta página. Tu rol actual: <strong className="capitalize">{role}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Roles permitidos: {allowedRoles.map(r => `<strong className="capitalize">${r}</strong>`).join(', ')}
          </p>
          <a
            href="/"
            className="btn-primary"
            onClick={(e) => { e.preventDefault(); window.history.back(); }}
          >
            Volver
          </a>
        </div>
      </div>
    );
  }

  return children;
}

export function PublicRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-navy-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Solo redirigir si user Y role existen (evita bucle con RoleRedirect)
  if (user && role) {
    return <Navigate to="/" replace />;
  }

  return children;
}