import { supabase } from '../config/supabase';

// Obtener órdenes con filtros
export async function getOrdenes(filters = {}) {
  let query = supabase
    .from('ordenes')
    .select(`
      *,
      mesas:mesa_id (id, numero, estado),
      mesero:mesero_id (id, full_name),
      items:orden_items (
        *,
        productos:producto_id (id, nombre, categoria_id, categorias:categoria_id (slug))
      )
    `)
    .order('created_at', { ascending: false });

  if (filters.mesaId) {
    query = query.eq('mesa_id', filters.mesaId);
  }

  if (filters.meseroId) {
    query = query.eq('mesero_id', filters.meseroId);
  }

  if (filters.estado) {
    const estados = Array.isArray(filters.estado) ? filters.estado : [filters.estado];
    query = query.in('estado', estados);
  }

  if (filters.fechaDesde) {
    query = query.gte('created_at', filters.fechaDesde);
  }

  if (filters.fechaHasta) {
    query = query.lte('created_at', filters.fechaHasta);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

// Obtener orden por ID con items completos
export async function getOrdenById(id) {
  const { data, error } = await supabase
    .from('ordenes')
    .select(`
      *,
      mesas:mesa_id (id, numero, estado),
      mesero:mesero_id (id, full_name),
      items:orden_items (
        *,
        productos:producto_id (id, nombre, precio, categoria_id, categorias:categoria_id (id, nombre, slug))
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Crear orden con items
export async function createOrden(ordenData) {
  const { mesa_id, mesero_id, items, notas } = ordenData;

  // Iniciar transacción manual (Supabase no soporta transacciones directas en cliente)
  // Primero crear la orden
  const { data: orden, error: ordenError } = await supabase
    .from('ordenes')
    .insert({
      mesa_id,
      mesero_id,
      notas,
      estado: 'pendiente'
    })
    .select()
    .single();

  if (ordenError) throw ordenError;

  // Luego insertar los items
  if (items && items.length > 0) {
    const itemsData = items.map(item => ({
      orden_id: orden.id,
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      notas: item.notas || null
    }));

    const { error: itemsError } = await supabase
      .from('orden_items')
      .insert(itemsData);

    if (itemsError) {
      // Si falla, eliminar la orden creada
      await supabase.from('ordenes').delete().eq('id', orden.id);
      throw itemsError;
    }
  }

  // Actualizar estado de mesa a ocupada
  await supabase
    .from('mesas')
    .update({ estado: 'ocupada', updated_at: new Date().toISOString() })
    .eq('id', mesa_id);

  // Retornar orden completa
  return getOrdenById(orden.id);
}

// Actualizar estado de orden
export async function updateOrdenEstado(id, estado) {
  const updates = { estado, updated_at: new Date().toISOString() };

  if (estado === 'entregada' || estado === 'pagada') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('ordenes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Actualizar notas de orden
export async function updateOrdenNotas(id, notas) {
  const { data, error } = await supabase
    .from('ordenes')
    .update({ notas, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Cancelar orden
export async function cancelarOrden(id) {
  // Obtener mesa_id antes de cancelar
  const { data: orden } = await supabase
    .from('ordenes')
    .select('mesa_id')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('ordenes')
    .update({ estado: 'cancelada', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Liberar mesa si no tiene otras órdenes activas
  if (orden?.mesa_id) {
    const { data: otrasOrdenes } = await supabase
      .from('ordenes')
      .select('id')
      .eq('mesa_id', orden.mesa_id)
      .in('estado', ['pendiente', 'en_preparacion', 'lista'])
      .neq('id', id);

    if (!otrasOrdenes || otrasOrdenes.length === 0) {
      await supabase
        .from('mesas')
        .update({ estado: 'libre', updated_at: new Date().toISOString() })
        .eq('id', orden.mesa_id);
    }
  }

  return data;
}

// Obtener items de orden por categoría (para cocina/barra)
export async function getOrdenItemsByCategoria(categoriaSlug, filters = {}) {
  let query = supabase
    .from('orden_items')
    .select(`
      *,
      productos:producto_id (id, nombre, categoria_id, categorias:categoria_id (id, nombre, slug)),
      ordenes:orden_id (id, mesa_id, estado, created_at, mesas:mesa_id (numero))
    `)
    .eq('productos.categorias.slug', categoriaSlug)
    .order('created_at', { ascending: true });

  if (filters.estado) {
    const estados = Array.isArray(filters.estado) ? filters.estado : [filters.estado];
    query = query.in('estado', estados);
  }

  if (filters.ordenId) {
    query = query.eq('orden_id', filters.ordenId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

// Actualizar estado de item de orden
export async function updateOrdenItemEstado(id, estado, notas = null) {
  const updates = { estado, updated_at: new Date().toISOString() };
  if (notas !== null) updates.notas = notas;

  const { data, error } = await supabase
    .from('orden_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Actualizar múltiples items a la vez
export async function updateOrdenItemsEstados(items) {
  // items: [{ id, estado, notas, orden_id }]
  // Usamos update individual por cada item para evitar upsert que requiere producto_id
  const results = await Promise.all(
    items.map(async (item) => {
      const updates = {
        estado: item.estado,
        updated_at: new Date().toISOString()
      };
      // Solo incluir notas si está definido (no undefined), para evitar error 400
      if (item.notas !== undefined) {
        updates.notas = item.notas;
      }

      const { data, error } = await supabase
        .from('orden_items')
        .update(updates)
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    })
  );

  return results;
}

// Estadísticas para admin
export async function getEstadisticas(fechaDesde, fechaHasta) {
  let query = supabase
    .from('ordenes')
    .select('estado, total, created_at, items:orden_items (subtotal, productos:producto_id (categoria_id, categorias:categoria_id (slug)))')
    .gte('created_at', fechaDesde)
    .lte('created_at', fechaHasta);

  const { data, error } = await query;

  if (error) throw error;

  const stats = {
    totalOrdenes: data.length,
    totalVentas: data.reduce((sum, o) => sum + (o.total || 0), 0),
    porEstado: {},
    porCategoria: {},
    promedioPorOrden: 0
  };

  data.forEach(orden => {
    stats.porEstado[orden.estado] = (stats.porEstado[orden.estado] || 0) + 1;

    orden.items?.forEach(item => {
      const slug = item.productos?.categorias?.slug || 'otros';
      stats.porCategoria[slug] = (stats.porCategoria[slug] || 0) + (item.subtotal || 0);
    });
  });

  stats.promedioPorOrden = stats.totalOrdenes > 0 ? stats.totalVentas / stats.totalOrdenes : 0;

  return stats;
}

// Obtener el platillo más popular basado en cantidad total ordenada
export async function getPlatilloMasPopular(fechaDesde, fechaHasta) {
  const { data, error } = await supabase
    .from('orden_items')
    .select(`
      cantidad,
      productos:producto_id (id, nombre, precio, categoria_id, categorias:categoria_id (id, nombre, slug))
    `)
    .gte('created_at', fechaDesde)
    .lte('created_at', fechaHasta);

  if (error) throw error;

  // Agrupar por producto y sumar cantidades
  const popularidad = data.reduce((acc, item) => {
    const producto = item.productos;
    if (!producto) return acc;

    const id = producto.id;
    if (!acc[id]) {
      acc[id] = {
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        categoria: producto.categorias?.nombre || 'Sin categoría',
        categoriaSlug: producto.categorias?.slug || 'otros',
        cantidadTotal: 0,
        totalVendido: 0
      };
    }
    acc[id].cantidadTotal += item.cantidad || 0;
    acc[id].totalVendido += (item.cantidad || 0) * (producto.precio || 0);
    return acc;
  }, {});

  // Ordenar por cantidad total descendente
  const ordenados = Object.values(popularidad).sort((a, b) => b.cantidadTotal - a.cantidadTotal);

  return ordenados[0] || null;
}

// Obtener top N platos más populares
export async function getTopPlatosPopulares(fechaDesde, fechaHasta, limit = 5) {
  const { data, error } = await supabase
    .from('orden_items')
    .select(`
      cantidad,
      productos:producto_id (id, nombre, precio, categoria_id, categorias:categoria_id (id, nombre, slug))
    `)
    .gte('created_at', fechaDesde)
    .lte('created_at', fechaHasta);

  if (error) throw error;

  const popularidad = data.reduce((acc, item) => {
    const producto = item.productos;
    if (!producto) return acc;

    const id = producto.id;
    if (!acc[id]) {
      acc[id] = {
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        categoria: producto.categorias?.nombre || 'Sin categoría',
        categoriaSlug: producto.categorias?.slug || 'otros',
        cantidadTotal: 0,
        totalVendido: 0
      };
    }
    acc[id].cantidadTotal += item.cantidad || 0;
    acc[id].totalVendido += (item.cantidad || 0) * (producto.precio || 0);
    return acc;
  }, {});

  const ordenados = Object.values(popularidad).sort((a, b) => b.cantidadTotal - a.cantidadTotal);
  return ordenados.slice(0, limit);
}

// Suscripciones en tiempo real
export function subscribeToOrdenes(callback, filters = {}) {
  let channel = supabase.channel('ordenes_changes');

  const eventFilter = {
    event: '*',
    schema: 'public',
    table: 'ordenes'
  };

  if (filters.mesaId) {
    eventFilter.filter = `mesa_id=eq.${filters.mesaId}`;
  }

  channel = channel.on('postgres_changes', eventFilter, callback).subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToOrdenItems(callback, categoriaSlug = null) {
  let channel = supabase.channel('orden_items_changes');

  const eventFilter = {
    event: '*',
    schema: 'public',
    table: 'orden_items'
  };

  if (categoriaSlug) {
    // Nota: filtros en join no funcionan directamente en realtime
    // Se filtra en el callback
  }

  channel = channel.on('postgres_changes', eventFilter, (payload) => {
    // Filtrar por categoría en el callback si es necesario
    if (!categoriaSlug || payload.new?.productos?.categorias?.slug === categoriaSlug) {
      callback(payload);
    }
  }).subscribe();

  return () => supabase.removeChannel(channel);
}