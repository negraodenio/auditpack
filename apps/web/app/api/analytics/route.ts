import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/db/supabase';
import { requireAuth } from '@/lib/auth/auth';

// Forçar rota dinâmica (usa cookies)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Get dashboard metrics from view
    const { data: metrics, error: metricsError } = await supabaseServer
      .from('v_dashboard_metrics')
      .select('*')
      .eq('firm_id', user.firm_id)
      .single();

    if (metricsError) throw metricsError;

    // Get recent activity
    const { data: recentActivity, error: activityError } = await supabaseServer
      .from('audit_logs')
      .select(`
        *,
        user:user_id (full_name),
        client:client_id (name)
      `)
      .eq('firm_id', user.firm_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activityError) throw activityError;

    // Get alerts summary
    const { data: alertsSummary, error: alertsError } = await supabaseServer
      .from('alerts')
      .select('severity', { count: 'exact' })
      .eq('firm_id', user.firm_id)
      .is('resolved_at', null)
      .in('severity', ['warning', 'critical']);

    if (alertsError) throw alertsError;

    const criticalCount = alertsSummary?.filter(a => a.severity === 'critical').length || 0;
    const warningCount = alertsSummary?.filter(a => a.severity === 'warning').length || 0;

    // Get invoices by status (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: invoicesByStatus, error: invoicesError } = await supabaseServer
      .from('invoices')
      .select('status', { count: 'exact' })
      .eq('firm_id', user.firm_id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .is('deleted_at', null);

    if (invoicesError) throw invoicesError;

    return NextResponse.json({
      metrics: {
        total_clients: metrics?.total_clients || 0,
        invoices_this_month: metrics?.invoices_this_month || 0,
        pending_alerts: (metrics?.pending_alerts || 0),
        total_iva_this_month: metrics?.total_iva_this_month || 0,
        avg_compliance_score: Math.round(metrics?.avg_compliance_score || 0),
      },
      alerts_summary: {
        critical: criticalCount,
        warning: warningCount,
        total: criticalCount + warningCount,
      },
      recent_activity: recentActivity,
      invoices_summary: {
        total: invoicesByStatus?.length || 0,
        by_status: {
          pending: invoicesByStatus?.filter(i => i.status === 'pending').length || 0,
          processing: invoicesByStatus?.filter(i => i.status === 'processing').length || 0,
          analyzed: invoicesByStatus?.filter(i => i.status === 'analyzed').length || 0,
          error: invoicesByStatus?.filter(i => i.status === 'error').length || 0,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
