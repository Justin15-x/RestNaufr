import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/mesero', label: 'Mesas', icon: '🪑', roles: ['mesero', 'admin'] },
  { path: '/cocina', label: 'Cocina', icon: '🍳', roles: ['cocina', 'admin'] },
  { path: '/barra', label: 'Barra', icon: '🍻', roles: ['barra', 'admin'] },
  { path: '/admin', label: 'Admin', icon: '⚙️', roles: ['admin'] },
];

export function Navbar() {
  const { user, profile, role, signOut, isAdmin, isMesero, isCocina, isBarra } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const filteredNavItems = navItems.filter(item =>
    item.roles.includes(role) || (isAdmin && item.roles.includes('admin'))
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
    setUserMenuOpen(false);
  };

  const getRoleLabel = () => {
    const labels = {
      mesero: 'Mesero',
      cocina: 'Cocina',
      barra: 'Barra',
      admin: 'Administrador'
    };
    return labels[role] || 'Usuario';
  };

  const getRoleColor = () => {
    const colors = {
      mesero: 'bg-blue-100 text-blue-800',
      cocina: 'bg-orange-100 text-orange-800',
      barra: 'bg-purple-100 text-purple-800',
      admin: 'bg-navy-900 text-white'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden lg:flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2 text-navy-900 font-bold text-xl">
          <span className="text-2xl">🍽️</span>
          <span>El Náufrago</span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
            {filteredNavItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">👤</span>
              <span className="text-sm font-medium text-gray-700">{profile?.full_name || user?.email}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor()}`}>
                {getRoleLabel()}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-medium">
                  {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-scale-in">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{profile?.full_name || user?.email}</p>
                    <p className="text-xs text-gray-500">{getRoleLabel()}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navbar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="grid grid-cols-4">
          {filteredNavItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-3 px-2 transition-colors ${
                location.pathname === item.path
                  ? 'text-navy-600 bg-navy-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile user info - hidden on mobile, shown in drawer if needed */}
      <div className="lg:hidden fixed bottom-16 left-4 right-4 z-50 bg-white rounded-xl shadow-lg border border-gray-200 p-4 animate-slide-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-medium text-lg">
            {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || user?.email}</p>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor()}`}>
              {getRoleLabel()}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Salir
          </button>
        </div>
      </div>
    </>
  );
}