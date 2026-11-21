import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar perfil y rol del usuario
  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          roles:role_id (id, name, description)
        `)
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);
      setRole(profileData.roles?.name || null);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    }
  }, []);

  // Escuchar cambios de autenticación
  useEffect(() => {
    let mounted = true;

    // Obtener sesión inicial
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Login
  const signIn = async (email, password) => {
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err.message };
    }
  };

  // Logout
  const signOut = async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err.message };
    } finally {
      // Limpiar estado local inmediatamente, incluso si la petición de red falla
      setUser(null);
      setProfile(null);
      setRole(null);
    }
  };

  // Verificar permisos
  const hasRole = useCallback((roles) => {
    if (!role) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(role);
  }, [role]);

  const isAdmin = role === 'admin';
  const isMesero = role === 'mesero';
  const isCocina = role === 'cocina';
  const isBarra = role === 'barra';

  const value = {
    user,
    profile,
    role,
    loading,
    error,
    signIn,
    signOut,
    hasRole,
    isAdmin,
    isMesero,
    isCocina,
    isBarra,
    refetchProfile: () => user && fetchProfile(user.id),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}