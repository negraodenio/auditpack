import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/db/supabase';
import { requireAuth } from '@/lib/auth/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('risk_level');
    const period = searchParams.get('period'); // 7d, 30d, 90d, 1y

    let query = supabaseServer
      .from('invoices')
      .select(`
        *,
        client:client_id (name),
        analysis:analyses (risk_level, compliance_score)
      `, { count: 'exact' })
      .eq('firm_id', user.firm_id)
      .is('deleted_at', null);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (period) {
      const days = parseInt(period.replace('d', '').replace('y', '365'));
      const date = new Date();
      date.setDate(date.getDate() - days);
      query = query.gte('created_at', date.toISOString());
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (error) throw error;

    // Filter by risk level if specified (post-query due to join)
    let filteredData = data;
    if (riskLevel) {
      filteredData = data.filter((inv: any) => 
        inv.analysis?.risk_level === riskLevel
      );
    }

    return NextResponse.json({
      data: filteredData,
      pagination: {
        page,
        per_page: perPage,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const formData = await req.formData();
    
    const clientId = formData.get('client_id') as string;
    const file = formData.get('file') as File;

    if (!clientId || !file) {
      return NextResponse.json(
        { error: 'Client ID and file are required' },
        { status: 400 }
      );
    }

    // Generate file path
    const timestamp = Date.now();
    const filePath = `invoices/${user.firm_id}/${clientId}/${timestamp}_${file.name}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseServer
      .storage
      .from('invoices')
      .upload(filePath, file, {
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Create invoice record
    const { data: invoice, error: insertError } = await supabaseServer
      .from('invoices')
      .insert({
        firm_id: user.firm_id,
        client_id: clientId,
        source_type: 'upload',
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Create audit log
    await supabaseServer.from('audit_logs').insert({
      firm_id: user.firm_id,
      user_id: user.id,
      action_type: 'create',
      resource_type: 'invoice',
      resource_id: invoice.id,
    });

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
