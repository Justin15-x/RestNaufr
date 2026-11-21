import { supabase } from '../config/supabase';

// Obtener todas las mesas
export async function getMesas() {
  const { data, error } = await supabase
    .from('mesas')
    .select('*')
    .order('numero', { ascending: true });

  if (error) throw error;
  return data;
}

// Obtener mesa por ID
export async function getMesaById(id) {
  const { data, error } = await supabase
    .from('mesas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Actualizar estado de mesa
export async function updateMesaEstado(id, estado) {
  const { data, error } = await supabase
    .from('mesas')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Actualizar mesa completa (admin)
export async function updateMesa(id, mesaData) {
  const { data, error } = await supabase
    .from('mesas')
    .update({ ...mesaData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Crear mesa (admin)
export async function createMesa(mesaData) {
  const { data, error } = await supabase
    .from('mesas')
    .insert(mesaData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Eliminar mesa (admin)
export async function deleteMesa(id) {
  const { error } = await supabase
    .from('mesas')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// Suscripción a cambios de mesas en tiempo real
export function subscribeToMesas(callback) {
  const channel = supabase
    .channel('mesas_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'mesas'
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