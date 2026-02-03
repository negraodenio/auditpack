// =====================================================
// Authentication Helpers
// =====================================================

import { supabaseServer } from '@/lib/db/supabase';
import { cookies } from 'next/headers';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-token')?.value;
  
  if (!token) {
    return null;
  }

  const { data: { user }, error } = await supabaseServer.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  // Get user details from our database
  const { data: userData } = await supabaseServer
    .from('users')
    .select('*, firm:firm_id(*)')
    .eq('auth_id', user.id)
    .single();

  return userData;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseServer.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabaseServer.auth.signOut();
  if (error) {
    throw error;
  }
}

// Check permissions
export function canManageFirm(userRole: string): boolean {
  return ['admin'].includes(userRole);
}

export function canManageClients(userRole: string): boolean {
  return ['admin', 'accountant'].includes(userRole);
}

export function canViewAnalytics(userRole: string): boolean {
  return ['admin', 'accountant', 'viewer'].includes(userRole);
}
