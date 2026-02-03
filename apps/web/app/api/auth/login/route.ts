import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/db/supabase';

export async function POST(req: NextRequest) {
  console.log('Login API called');
  
  try {
    const body = await req.json();
    console.log('Request body:', body);
    
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('Attempting Supabase login...');
    
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Supabase response:', { authData, authError });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 401 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Get user details from our database
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('*, firm:firm_id(*)')
      .eq('auth_id', authData.user.id)
      .single();

    if (userError || !userData) {
      console.error('User not found:', userError);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    if (!userData.is_active) {
      return NextResponse.json(
        { error: 'User account is disabled' },
        { status: 403 }
      );
    }

    // Update last login
    await supabaseServer
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userData.id);

    // Create audit log
    await supabaseServer.from('audit_logs').insert({
      firm_id: userData.firm_id,
      user_id: userData.id,
      action_type: 'login',
      resource_type: 'user',
      resource_id: userData.id,
      metadata: { email },
    });

    // Return success with session
    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        firm_id: userData.firm_id,
      },
      session: {
        access_token: authData.session?.access_token,
        expires_at: authData.session?.expires_at,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
