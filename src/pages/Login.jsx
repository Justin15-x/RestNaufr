import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toastError, toastSuccess } from '../components/ui/Toast';

const demoUsers = [
  { email: 'mesero@naufrago.com', password: 'mesero123', role: 'mesero', name: 'Juan Pérez' },
  { email: 'cocina@naufrago.com', password: 'cocina123', role: 'cocina', name: 'María González' },
  { email: 'barra@naufrago.com', password: 'barra123', role: 'barra', name: 'Carlos Ruiz' },
  { email: 'admin@naufrago.com', password: 'admin123', role: 'admin', name: 'Ana Torres' },
];

const roleInfo = {
  mesero: { icon: '🪑', label: 'Mesero', desc: 'Gestión de mesas y comandas', color: 'blue' },
  cocina: { icon: '🍳', label: 'Cocina', desc: 'Preparación de platos', color: 'orange' },
  barra: { icon: '🍻', label: 'Barra', desc: 'Preparación de bebidas', color: 'purple' },
  admin: { icon: '⚙️', label: 'Admin', desc: 'Administración completa', color: 'navy' },
};

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await signIn(email, password);

      if (authError) {
        setError(authError);
        toastError('Error de acceso', authError);
      } else {
        toastSuccess('Bienvenido', 'Has iniciado sesión correctamente');
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message);
      toastError('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (user) => {
    setEmail(user.email);
    setPassword(user.password);
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await signIn(user.email, user.password);

      if (authError) {
        setError(authError);
        toastError('Error demo', authError);
      } else {
        toastSuccess('Demo', `Ingresaste como ${user.name} (${roleInfo[user.role].label})`);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message);
      toastError('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <span className="text-4xl">🍽️</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">El Náufrago</h1>
          <p className="text-navy-200">Sistema de administración de restaurante</p>
        </div>

        {/* Formulario de login */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label text-navy-100">Correo electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-navy-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10 bg-white/5 border-white/10 text-white placeholder:text-navy-400 focus:ring-navy-400"
                  placeholder="usuario@naufrago.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label text-navy-100">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-navy-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 bg-white/5 border-white/10 text-white placeholder:text-navy-400 focus:ring-navy-400"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" />
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Usuarios demo */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-navy-300 hover:text-navy-100 transition-colors"
            >
              <svg className={`w-5 h-5 transition-transform ${showDemo ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>{showDemo ? 'Ocultar' : 'Mostrar'} usuarios de prueba</span>
            </button>

            {showDemo && (
              <div className="mt-4 space-y-2" role="list">
                {demoUsers.map((user, index) => (
                  <button
                    key={user.email}
                    type="button"
                    onClick={() => handleDemoLogin(user)}
                    disabled={loading}
                    className="w-full p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left flex items-center gap-3"
                    role="listitem"
                  >
                    <span className="text-2xl">{roleInfo[user.role].icon}</span>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white text-sm">{user.name}</p>
                      <p className="text-xs text-navy-300">{roleInfo[user.role].label} - {roleInfo[user.role].desc}</p>
                    </div>
                    <svg className="w-5 h-5 text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-navy-400 text-sm mt-6">
          © 2024 El Náufrago - Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}