import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/db/supabase';
import { requireAuth } from '@/lib/auth/auth';
import { hash } from '@/lib/utils/helpers';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'active';

    let query = supabaseServer
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('firm_id', user.firm_id)
      .is('deleted_at', null);

    if (status === 'inactive') {
      query = query.eq('is_active', false);
    } else if (status === 'active') {
      query = query.eq('is_active', true);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,tax_id_hash.eq.${hash(search)}`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: {
        page,
        per_page: perPage,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const { data: client, error } = await supabaseServer
      .from('clients')
      .insert({
        firm_id: user.firm_id,
        tax_id: body.tax_id,
        tax_id_hash: hash(body.tax_id),
        name: body.name,
        legal_name: body.legal_name,
        address: body.address || {},
        phone: body.phone,
        email: body.email,
        whatsapp_number: body.whatsapp_number,
        regime_iva: body.regime_iva || 'geral',
        sector: body.sector,
      })
      .select()
      .single();

    if (error) throw error;

    // Create audit log
    await supabaseServer.from('audit_logs').insert({
      firm_id: user.firm_id,
      user_id: user.id,
      action_type: 'create',
      resource_type: 'client',
      resource_id: client.id,
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
