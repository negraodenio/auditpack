// =====================================================
// Supabase Client Configuration
// =====================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser (public)
export const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Client for server (with service role)
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper to set tenant context for RLS
export async function setTenantContext(supabase: typeof supabaseClient, firmId: string, userId: string) {
  await supabase.rpc('set_tenant_context', {
    p_firm_id: firmId,
    p_user_id: userId,
  });
}
