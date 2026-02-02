'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DocumentTextIcon,
  BellAlertIcon,
  CurrencyEuroIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDateTime, getSeverityColor, getSeverityIcon, getComplianceColor } from '@/lib/utils/helpers';

interface DashboardData {
  metrics: {
    total_clients: number;
    invoices_this_month: number;
    pending_alerts: number;
    total_iva_this_month: number;
    avg_compliance_score: number;
  };
  alerts_summary: {
    critical: number;
    warning: number;
    total: number;
  };
  recent_activity: any[];
  invoices_summary: {
    total: number;
    by_status: {
      pending: number;
      processing: number;
      analyzed: number;
      error: number;
    };
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const response = await fetch('/api/analytics');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Erro ao carregar dados do dashboard</p>
      </div>
    );
  }

  const stats = [
    {
      name: 'Faturas este mês',
      value: data.metrics.invoices_this_month.toString(),
      icon: DocumentTextIcon,
      trend: '+12%',
      trendUp: true,
    },
    {
      name: 'Alertas pendentes',
      value: data.alerts_summary.total.toString(),
      icon: BellAlertIcon,
      trend: `${data.alerts_summary.critical} críticos`,
      trendUp: data.alerts_summary.critical > 0,
      alert: data.alerts_summary.critical > 0,
    },
    {
      name: 'IVA em análise',
      value: formatCurrency(data.metrics.total_iva_this_month),
      icon: CurrencyEuroIcon,
      trend: 'Este mês',
      trendUp: true,
    },
    {
      name: 'Score Compliance',
      value: `${data.metrics.avg_compliance_score}%`,
      icon: ShieldCheckIcon,
      trend: data.metrics.avg_compliance_score >= 90 ? 'Excelente' : 'Regular',
      trendUp: data.metrics.avg_compliance_score >= 70,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bem-vindo de volta! Aqui está o resumo da sua atividade.
          </p>
        </div>
        <Link
          href="/invoices/upload"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          + Nova Fatura
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon
                    className={`h-6 w-6 ${
                      stat.alert ? 'text-danger-600' : 'text-primary-600'
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div
                        className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stat.trendUp ? 'text-success-600' : 'text-danger-600'
                        }`}
                      >
                        {stat.trendUp ? (
                          <ArrowTrendingUpIcon
                            className="self-center flex-shrink-0 h-4 w-4 text-success-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <ArrowTrendingDownIcon
                            className="self-center flex-shrink-0 h-4 w-4 text-danger-500"
                            aria-hidden="true"
                          />
                        )}
                        <span className="sr-only">
                          {stat.trendUp ? 'Increased' : 'Decreased'} by
                        </span>
                        {stat.trend}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts section */}
      {data.alerts_summary.total > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Alertas Pendentes
              </h2>
              <Link
                href="/alerts"
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                Ver todos ({data.alerts_summary.total})
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {data.alerts_summary.critical > 0 && (
              <div className="px-6 py-4 flex items-center bg-danger-50">
                <span className="text-2xl mr-3">🔴</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-danger-800">
                    {data.alerts_summary.critical} alerta{data.alerts_summary.critical > 1 ? 's' : ''} crítico{data.alerts_summary.critical > 1 ? 's' : ''} requer{data.alerts_summary.critical === 1 ? 'e' : 'em'} atenção imediata
                  </p>
                </div>
                <Link
                  href="/alerts?severity=critical"
                  className="text-sm font-medium text-danger-700 hover:text-danger-600"
                >
                  Resolver →
                </Link>
              </div>
            )}
            {data.alerts_summary.warning > 0 && (
              <div className="px-6 py-4 flex items-center bg-warning-50">
                <span className="text-2xl mr-3">🟡</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-warning-800">
                    {data.alerts_summary.warning} alerta{data.alerts_summary.warning > 1 ? 's' : ''} de atenção para revisão
                  </p>
                </div>
                <Link
                  href="/alerts?severity=warning"
                  className="text-sm font-medium text-warning-700 hover:text-warning-600"
                >
                  Revisar →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Atividade Recente</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {data.recent_activity?.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Nenhuma atividade recente
            </div>
          ) : (
            data.recent_activity?.slice(0, 5).map((activity: any) => (
              <div key={activity.id} className="px-6 py-4 flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-700">
                      {activity.action_type[0].toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user?.full_name || 'Sistema'}</span>
                    {' '}{getActionText(activity.action_type)}{' '}
                    <span className="font-medium">{activity.resource_type}</span>
                    {activity.client && (
                      <span> para {activity.client.name}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(activity.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Link
          href="/clients"
          className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                {data.metrics.total_clients} Clientes
              </h3>
              <p className="text-sm text-gray-500">Gerenciar clientes</p>
            </div>
          </div>
        </Link>

        <Link
          href="/invoices"
          className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-success-100 flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                {data.invoices_summary.total} Faturas
              </h3>
              <p className="text-sm text-gray-500">Ver todas as faturas</p>
            </div>
          </div>
        </Link>

        <Link
          href="/analytics"
          className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-warning-100 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Relatórios</h3>
              <p className="text-sm text-gray-500">Ver análises detalhadas</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function getActionText(action: string): string {
  const actions: Record<string, string> = {
    create: 'criou',
    update: 'atualizou',
    delete: 'removeu',
    view: 'visualizou',
    export: 'exportou',
    login: 'iniciou sessão',
  };
  return actions[action] || action;
}
