// =====================================================
// Supabase Client Configuration
// =====================================================

import { createClient } from '@supabase/supabase-js';

/**
 * Validates all required environment variables
 * Throws clear errors if any are missing
 */
function validateEnv(): { supabaseUrl: string; supabaseKey: string; supabaseServiceKey: string } {
  const requiredVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY },
  ];

  const missing = requiredVars.filter(v => !v.value);
  
  if (missing.length > 0) {
    throw new Error(
      `ENVIRONMENT ERROR: Missing required environment variables:\n` +
      missing.map(v => `  - ${v.name}`).join('\n') +
      `\n\nPlease check your .env.local file and ensure all variables are set.`
    );
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  };
}

// Validate environment at module initialization
const { supabaseUrl, supabaseKey, supabaseServiceKey } = validateEnv();

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
