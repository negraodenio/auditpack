// =====================================================
// AuditPack TypeScript Types
// =====================================================

export interface Firm {
  id: string;
  name: string;
  tax_id: string;
  tax_id_hash: string;
  country_code: string;
  address: Record<string, any>;
  settings: Record<string, any>;
  plan_type: 'starter' | 'professional' | 'enterprise';
  plan_expires_at: string | null;
  max_clients: number;
  max_invoices_monthly: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  firm_id: string;
  auth_id: string | null;
  email: string;
  full_name: string;
  role: 'admin' | 'accountant' | 'viewer';
  phone: string | null;
  preferences: Record<string, any>;
  last_login_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  firm_id: string;
  tax_id: string;
  tax_id_hash: string;
  name: string;
  legal_name: string | null;
  address: Record<string, any>;
  phone: string | null;
  email: string | null;
  whatsapp_number: string | null;
  regime_iva: 'geral' | 'simplificado' | 'caixa' | 'exclusao';
  sector: string | null;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Invoice {
  id: string;
  firm_id: string;
  client_id: string;
  source_type: 'whatsapp' | 'upload' | 'api' | 'email';
  source_id: string | null;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  file_hash: string | null;
  raw_text: string | null;
  extracted_data: Record<string, any>;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  supplier_tax_id: string | null;
  supplier_name: string | null;
  customer_tax_id: string | null;
  customer_name: string | null;
  total_amount: number | null;
  taxable_amount: number | null;
  tax_amount: number | null;
  tax_rate: number | null;
  currency: string;
  document_type: 'invoice' | 'receipt' | 'credit_note';
  category: string | null;
  status: 'pending' | 'processing' | 'analyzed' | 'error' | 'archived';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields
  client?: Client;
  analysis?: Analysis;
}

export interface Analysis {
  id: string;
  firm_id: string;
  invoice_id: string;
  client_id: string;
  analysis_version: string;
  llm_provider: string;
  llm_model: string;
  compliance_score: number | null;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  iva_validation: {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  };
  saft_compliance: Record<string, any>;
  recoverable_tax: {
    amount: number;
    confidence: number;
    reason: string;
  } | null;
  issues: AnalysisIssue[];
  raw_response: Record<string, any>;
  confidence_score: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisIssue {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  field?: string;
  suggested_action?: string;
}

export interface Alert {
  id: string;
  firm_id: string;
  client_id: string | null;
  invoice_id: string | null;
  analysis_id: string | null;
  severity: 'info' | 'warning' | 'critical';
  category: string;
  title: string;
  description: string;
  suggested_action: string | null;
  auto_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  notified_at: string | null;
  notification_channel: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
  invoice?: Invoice;
}

export interface AuditLog {
  id: string;
  firm_id: string;
  user_id: string | null;
  client_id: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  changes: Record<string, { old: any; new: any }>;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  ai_provider: string | null;
  ai_model: string | null;
  ai_prompt_version: string | null;
  created_at: string;
}

export interface FirmSettings {
  firm_id: string;
  alert_threshold: 'info' | 'warning' | 'critical';
  auto_notify_client: boolean;
  data_retention_days: number;
  whatsapp_config: Record<string, any>;
  webhook_url: string | null;
  preferred_llm: string;
  ai_temperature: number;
  updated_at: string;
}

export interface DashboardMetrics {
  firm_id: string;
  total_clients: number;
  invoices_this_month: number;
  pending_alerts: number;
  total_iva_this_month: number;
  avg_compliance_score: number | null;
}

// API Types
export interface ApiResponse<T> {
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// WhatsApp Webhook Types
export interface WhatsAppWebhookPayload {
  event: string;
  data: {
    from: string;
    type: 'text' | 'document' | 'image';
    text?: {
      body: string;
    };
    document?: {
      filename: string;
      mimetype: string;
      url: string;
    };
    image?: {
      caption?: string;
    };
    timestamp: number;
  };
}

// AI Types
export interface LLMProvider {
  name: string;
  analyzeInvoice(params: AnalysisParams): Promise<AnalysisResult>;
}

export interface AnalysisParams {
  invoiceText: string;
  documentType: string;
  countryCode: string;
  regimeIva: string;
}

export interface AnalysisResult {
  compliance_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  iva_validation: {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  };
  recoverable_tax: {
    amount: number;
    confidence: number;
    reason: string;
  } | null;
  issues: AnalysisIssue[];
  confidence_score: number;
}
