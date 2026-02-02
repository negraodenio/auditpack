import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/db/supabase';
import { requireAuth } from '@/lib/auth/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const severity = searchParams.get('severity');
    const resolved = searchParams.get('resolved') === 'true';

    let query = supabaseServer
      .from('alerts')
      .select(`
        *,
        client:client_id (name),
        invoice:invoice_id (file_name, invoice_number)
      `, { count: 'exact' })
      .eq('firm_id', user.firm_id);

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (!resolved) {
      query = query.is('resolved_at', null);
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
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const alertId = searchParams.get('id');
    
    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();

    const { data: alert, error } = await supabaseServer
      .from('alerts')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_notes: body.resolution_notes,
      })
      .eq('id', alertId)
      .eq('firm_id', user.firm_id)
      .select()
      .single();

    if (error) throw error;

    // Create audit log
    await supabaseServer.from('audit_logs').insert({
      firm_id: user.firm_id,
      user_id: user.id,
      action_type: 'update',
      resource_type: 'alert',
      resource_id: alertId,
      changes: { resolved_at: { old: null, new: alert.resolved_at } },
    });

    return NextResponse.json({ data: alert });
  } catch (error) {
    console.error('Error resolving alert:', error);
    return NextResponse.json(
      { error: 'Failed to resolve alert' },
      { status: 500 }
    );
  }
}
