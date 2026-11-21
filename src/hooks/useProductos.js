import { useState, useEffect, useCallback } from 'react';
import { getProductos, getProductosByCategoria, getCategorias, subscribeToProductos } from '../services/productos';

export function useProductos(filters = {}) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [productosByCategoria, setProductosByCategoria] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProductos = useCallback(async () => {
    try {
      setLoading(true);
      const [productosData, categoriasData, groupedData] = await Promise.all([
        getProductos(filters),
        getCategorias(),
        getProductosByCategoria(filters)
      ]);
      setProductos(productosData);
      setCategorias(categoriasData);
      setProductosByCategoria(groupedData);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching productos:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.disponible, filters.categoriaSlug, filters.categoriaId]);

  useEffect(() => {
    fetchProductos();

    const unsubscribe = subscribeToProductos(() => {
      fetchProductos();
    });

    return () => unsubscribe();
  }, [fetchProductos]);

  const getProductosByCategoriaSlug = useCallback((slug) => {
    return productosByCategoria[slug]?.productos || [];
  }, [productosByCategoria]);

  const getCategoriaBySlug = useCallback((slug) => {
    return categorias.find(c => c.slug === slug);
  }, [categorias]);

  return {
    productos,
    categorias,
    productosByCategoria,
    loading,
    error,
    refetch: fetchProductos,
    getProductosByCategoriaSlug,
    getCategoriaBySlug
  };
}

// Hook específico para cocina (solo comida)
export function useProductosCocina() {
  return useProductos({ categoriaSlug: 'comida', disponible: true });
}

// Hook específico para barra (solo bebida)
export function useProductosBarra() {
  return useProductos({ categoriaSlug: 'bebida', disponible: true });
}