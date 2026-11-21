import { supabase } from '../config/supabase';

// Obtener todos los productos con sus categorías
export async function getProductos(filters = {}) {
  let query = supabase
    .from('productos')
    .select(`
      *,
      categorias:categoria_id (id, nombre, slug, orden)
    `)
    .order('nombre', { ascending: true });

  if (filters.disponible !== undefined) {
    query = query.eq('disponible', filters.disponible);
  }

  if (filters.categoriaSlug) {
    query = query.eq('categorias.slug', filters.categoriaSlug);
  }

  if (filters.categoriaId) {
    query = query.eq('categoria_id', filters.categoriaId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

// Obtener productos agrupados por categoría
export async function getProductosByCategoria(filters = {}) {
  const productos = await getProductos(filters);

  // Agrupar por categoría
  const grouped = productos.reduce((acc, producto) => {
    const slug = producto.categorias?.slug || 'otros';
    if (!acc[slug]) {
      acc[slug] = {
        id: producto.categorias?.id,
        nombre: producto.categorias?.nombre,
        slug,
        orden: producto.categorias?.orden ?? 999,
        productos: []
      };
    }
    acc[slug].productos.push(producto);
    return acc;
  }, {});

  // Ordenar categorías por su campo 'orden' y productos por nombre
  return Object.fromEntries(
    Object.entries(grouped)
      .sort(([, a], [, b]) => a.orden - b.orden)
      .map(([slug, cat]) => [slug, { ...cat, productos: cat.productos.sort((a, b) => a.nombre.localeCompare(b.nombre)) }])
  );
}

// Obtener categorías
export async function getCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('activa', true)
    .order('orden', { ascending: true });

  if (error) throw error;
  return data;
}

// Obtener producto por ID
export async function getProductoById(id) {
  const { data, error } = await supabase
    .from('productos')
    .select(`
      *,
      categorias:categoria_id (id, nombre, slug)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Crear producto (admin)
export async function createProducto(productoData) {
  const { data, error } = await supabase
    .from('productos')
    .insert(productoData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Actualizar producto (admin)
export async function updateProducto(id, productoData) {
  const { data, error } = await supabase
    .from('productos')
    .update({ ...productoData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Eliminar producto (admin)
export async function deleteProducto(id) {
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// Suscripción a cambios de productos en tiempo real
export function subscribeToProductos(callback) {
  const channel = supabase
    .channel('productos_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'productos'
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}