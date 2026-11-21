import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from './components/ui/Toast';
import { Navbar } from './components/Navbar';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { Login, WaiterDashboard, KitchenDashboard, BarDashboard, AdminDashboard } from './pages';
import { AuthProvider, useAuth } from './context/AuthContext';

function App() {
  return (
    <>
      <Toaster />
      <Navbar />
      <main className="main-content pt-16 lg:pt-0 pb-16 lg:pb-0">
        <Routes>
          {/* Rutas públicas */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Rutas protegidas por rol */}
          <Route
            path="/mesero/*"
            element={
              <ProtectedRoute allowedRoles={['mesero', 'admin']}>
                <WaiterDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cocina/*"
            element={
              <ProtectedRoute allowedRoles={['cocina', 'admin']}>
                <KitchenDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/barra/*"
            element={
              <ProtectedRoute allowedRoles={['barra', 'admin']}>
                <BarDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Redirección por defecto según rol */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleRedirect />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

// Componente para redirigir según el rol del usuario
function RoleRedirect() {
  const { role, loading } = useAuth();

  if (loading) return null;

  switch (role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'mesero':
      return <Navigate to="/mesero" replace />;
    case 'cocina':
      return <Navigate to="/cocina" replace />;
    case 'barra':
      return <Navigate to="/barra" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default App;