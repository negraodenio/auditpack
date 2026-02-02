'use client';

import { useEffect, useState } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { formatDateTime, getSeverityColor, getSeverityIcon } from '@/lib/utils/helpers';
import toast from 'react-hot-toast';

interface Alert {
  id: string;
  client_id: string | null;
  invoice_id: string | null;
  severity: 'info' | 'warning' | 'critical';
  category: string;
  title: string;
  description: string;
  suggested_action: string | null;
  resolved_at: string | null;
  created_at: string;
  client?: { name: string };
  invoice?: { file_name: string; invoice_number: string };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, showResolved]);

  async function fetchAlerts() {
    try {
      const params = new URLSearchParams({
        per_page: '50',
        resolved: showResolved.toString(),
        ...(severityFilter && { severity: severityFilter }),
      });
      
      const response = await fetch(`/api/alerts?${params}`);
      const result = await response.json();
      
      setAlerts(result.data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function resolveAlert(alertId: string, notes?: string) {
    try {
      const response = await fetch(`/api/alerts?id=${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_notes: notes }),
      });

      if (!response.ok) throw new Error('Failed to resolve alert');

      toast.success('Alerta resolvido com sucesso');
      fetchAlerts();
    } catch (error) {
      toast.error('Erro ao resolver alerta');
    }
  }

  const severityIcons = {
    critical: <ExclamationTriangleIcon className="h-6 w-6 text-danger-600" />,
    warning: <ExclamationTriangleIcon className="h-6 w-6 text-warning-600" />,
    info: <InformationCircleIcon className="h-6 w-6 text-primary-600" />,
  };

  const categoryLabels: Record<string, string> = {
    iva_error: 'Erro de IVA',
    missing_field: 'Campo ausente',
    duplicate: 'Documento duplicado',
    deadline: 'Prazo próximo',
    recoverable_tax: 'IVA recuperável',
    validation_error: 'Erro de validação',
  };

  const unresolvedAlerts = alerts.filter(a => !a.resolved_at);
  const resolvedAlerts = alerts.filter(a => a.resolved_at);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
          <p className="mt-1 text-sm text-gray-500">
            {unresolvedAlerts.length > 0 
              ? `${unresolvedAlerts.length} alerta${unresolvedAlerts.length > 1 ? 's' : ''} pendente${unresolvedAlerts.length > 1 ? 's' : ''} para revisão`
              : 'Nenhum alerta pendente'}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">🔴</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Críticos
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {alerts.filter(a => a.severity === 'critical' && !a.resolved_at).length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">🟡</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Atenção
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {alerts.filter(a => a.severity === 'warning' && !a.resolved_at).length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">🔵</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Informativos
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {alerts.filter(a => a.severity === 'info' && !a.resolved_at).length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="">Todas as severidades</option>
              <option value="critical">Crítico</option>
              <option value="warning">Atenção</option>
              <option value="info">Informativo</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showResolved"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="showResolved" className="ml-2 block text-sm text-gray-900">
              Mostrar resolvidos
            </label>
          </div>
        </div>
      </div>

      {/* Alerts list */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-gray-500">Nenhum alerta encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-6 ${alert.resolved_at ? 'bg-gray-50 opacity-75' : 'bg-white'}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                          {categoryLabels[alert.category] || alert.category}
                        </span>
                        <h3 className="mt-1 text-sm font-medium text-gray-900">
                          {alert.title}
                        </h3>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(alert.created_at)}
                      </div>
                    </div>
                    
                    <p className="mt-1 text-sm text-gray-600">
                      {alert.description}
                    </p>

                    {(alert.client || alert.invoice) && (
                      <div className="mt-2 flex items-center space-x-4 text-sm">
                        {alert.client && (
                          <span className="text-gray-500">
                            Cliente: <span className="font-medium text-gray-900">{alert.client.name}</span>
                          </span>
                        )}
                        {alert.invoice && (
                          <span className="text-gray-500">
                            Documento: <span className="font-medium text-gray-900">{alert.invoice.invoice_number || alert.invoice.file_name}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {alert.suggested_action && !alert.resolved_at && (
                      <div className="mt-3 bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Ação sugerida:</span> {alert.suggested_action}
                        </p>
                      </div>
                    )}

                    {alert.resolved_at ? (
                      <div className="mt-3 flex items-center text-sm text-success-600">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Resolvido em {formatDateTime(alert.resolved_at)}
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center space-x-3">
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Marcar resolvido
                        </button>
                        <button
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Ver detalhes →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
