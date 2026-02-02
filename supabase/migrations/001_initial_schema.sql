-- =====================================================
-- AuditPack Database Schema
-- Supabase PostgreSQL
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLES
-- =====================================================

-- Firms (Tenants)
CREATE TABLE firms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    tax_id_hash TEXT NOT NULL UNIQUE,
    country_code CHAR(2) NOT NULL DEFAULT 'PT',
    address JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    plan_type TEXT NOT NULL DEFAULT 'starter',
    plan_expires_at TIMESTAMPTZ,
    max_clients INTEGER DEFAULT 50,
    max_invoices_monthly INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE firms IS 'Escritorios de contabilidade (tenants)';

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    auth_id UUID UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'accountant',
    phone TEXT,
    preferences JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(firm_id, email)
);

COMMENT ON TABLE users IS 'Utilizadores do sistema';

-- Clients (PMEs)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    tax_id TEXT NOT NULL,
    tax_id_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    legal_name TEXT,
    address JSONB DEFAULT '{}',
    phone TEXT,
    email TEXT,
    whatsapp_number TEXT,
    regime_iva TEXT DEFAULT 'geral',
    sector TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(firm_id, tax_id_hash)
);

COMMENT ON TABLE clients IS 'Clientes PME dos escritorios';

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL DEFAULT 'whatsapp',
    source_id TEXT,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes INTEGER,
    file_hash TEXT,
    raw_text TEXT,
    extracted_data JSONB DEFAULT '{}',
    invoice_number TEXT,
    issue_date DATE,
    due_date DATE,
    supplier_tax_id TEXT,
    supplier_name TEXT,
    customer_tax_id TEXT,
    customer_name TEXT,
    total_amount DECIMAL(15,2),
    taxable_amount DECIMAL(15,2),
    tax_amount DECIMAL(15,2),
    tax_rate DECIMAL(5,2),
    currency CHAR(3) DEFAULT 'EUR',
    document_type TEXT DEFAULT 'invoice',
    category TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT valid_tax_rate CHECK (tax_rate IN (6, 13, 23, 0))
);

COMMENT ON TABLE invoices IS 'Faturas e documentos fiscais';

-- Analyses
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    analysis_version TEXT NOT NULL DEFAULT '1.0.0',
    llm_provider TEXT NOT NULL,
    llm_model TEXT NOT NULL,
    compliance_score INTEGER CHECK (compliance_score BETWEEN 0 AND 100),
    risk_level TEXT DEFAULT 'low',
    iva_validation JSONB DEFAULT '{}',
    saft_compliance JSONB DEFAULT '{}',
    recoverable_tax JSONB DEFAULT '{}',
    issues JSONB DEFAULT '[]',
    raw_response JSONB DEFAULT '{}',
    confidence_score DECIMAL(3,2),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE analyses IS 'Analises de conformidade geradas pela IA';

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
    severity TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    suggested_action TEXT,
    auto_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    notified_at TIMESTAMPTZ,
    notification_channel TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE alerts IS 'Alertas de conformidade';

-- Audit Logs (Immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    changes JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    ai_provider TEXT,
    ai_model TEXT,
    ai_prompt_version TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    _immutable_hash TEXT
);

COMMENT ON TABLE audit_logs IS 'Logs de auditoria imutaveis';

-- Firm Settings
CREATE TABLE firm_settings (
    firm_id UUID PRIMARY KEY REFERENCES firms(id) ON DELETE CASCADE,
    alert_threshold TEXT DEFAULT 'medium',
    auto_notify_client BOOLEAN DEFAULT false,
    data_retention_days INTEGER DEFAULT 2555,
    whatsapp_config JSONB DEFAULT '{}',
    webhook_url TEXT,
    preferred_llm TEXT DEFAULT 'siliconflow',
    ai_temperature DECIMAL(3,2) DEFAULT 0.3,
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE firm_settings IS 'Configuracoes por escritorio';

-- Analysis DLQ (Dead Letter Queue)
CREATE TABLE analysis_dlq (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL,
    firm_id UUID NOT NULL,
    error_message TEXT NOT NULL,
    error_code TEXT,
    failed_at TIMESTAMPTZ DEFAULT now(),
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    original_payload JSONB DEFAULT '{}',
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE analysis_dlq IS 'Fila de mensagens mortas para analises';

-- =====================================================
-- INDEXES
-- =====================================================

-- Performance indexes
CREATE INDEX idx_invoices_firm_status ON invoices(firm_id, status);
CREATE INDEX idx_invoices_client_created ON invoices(client_id, created_at DESC);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_file_hash ON invoices(file_hash);
CREATE INDEX idx_analyses_firm_risk ON analyses(firm_id, risk_level);
CREATE INDEX idx_alerts_firm_severity ON alerts(firm_id, severity) WHERE resolved_at IS NULL;
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_audit_logs_firm_action ON audit_logs(firm_id, action_type, created_at DESC);
CREATE INDEX idx_clients_firm_active ON clients(firm_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_firm ON users(firm_id, is_active);

-- Full-text search
CREATE INDEX idx_invoices_search ON invoices USING gin(to_tsvector('portuguese', 
    coalesce(raw_text, '') || ' ' || 
    coalesce(supplier_name, '') || ' ' || 
    coalesce(invoice_number, '')
));

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_settings ENABLE ROW LEVEL SECURITY;

-- Firms
CREATE POLICY "Firm isolation" ON firms
    FOR ALL USING (id = current_setting('app.current_firm_id', true)::UUID);

-- Users
CREATE POLICY "Users view own firm" ON users
    FOR SELECT USING (firm_id = current_setting('app.current_firm_id', true)::UUID);

CREATE POLICY "Users update self" ON users
    FOR UPDATE USING (id = current_setting('app.current_user_id', true)::UUID);

-- Clients
CREATE POLICY "Clients view own firm" ON clients
    FOR SELECT USING (
        firm_id = current_setting('app.current_firm_id', true)::UUID 
        AND deleted_at IS NULL
    );

CREATE POLICY "Clients manage own firm" ON clients
    FOR ALL USING (firm_id = current_setting('app.current_firm_id', true)::UUID);

-- Invoices
CREATE POLICY "Invoices view own firm" ON invoices
    FOR SELECT USING (
        firm_id = current_setting('app.current_firm_id', true)::UUID 
        AND deleted_at IS NULL
    );

CREATE POLICY "Invoices manage own firm" ON invoices
    FOR ALL USING (firm_id = current_setting('app.current_firm_id', true)::UUID);

-- Analyses
CREATE POLICY "Analyses view own firm" ON analyses
    FOR SELECT USING (firm_id = current_setting('app.current_firm_id', true)::UUID);

-- Alerts
CREATE POLICY "Alerts view own firm" ON alerts
    FOR SELECT USING (firm_id = current_setting('app.current_firm_id', true)::UUID);

CREATE POLICY "Alerts manage own firm" ON alerts
    FOR UPDATE USING (firm_id = current_setting('app.current_firm_id', true)::UUID);

-- Audit Logs
CREATE POLICY "Audit logs view own firm" ON audit_logs
    FOR SELECT USING (firm_id = current_setting('app.current_firm_id', true)::UUID);

CREATE POLICY "Audit logs insert" ON audit_logs
    FOR INSERT WITH CHECK (firm_id = current_setting('app.current_firm_id', true)::UUID);

-- Firm Settings
CREATE POLICY "Firm settings view own" ON firm_settings
    FOR SELECT USING (firm_id = current_setting('app.current_firm_id', true)::UUID);

CREATE POLICY "Firm settings manage own" ON firm_settings
    FOR ALL USING (firm_id = current_setting('app.current_firm_id', true)::UUID);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(
    p_firm_id UUID,
    p_user_id UUID
) RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_firm_id', p_firm_id::text, false);
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compute audit hash
CREATE OR REPLACE FUNCTION compute_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
    data_to_hash TEXT;
BEGIN
    data_to_hash := NEW.id::text || NEW.firm_id::text || COALESCE(NEW.action_type, '') || NEW.created_at::text;
    NEW._immutable_hash := encode(digest(data_to_hash, 'sha256'), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable_hash
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION compute_audit_hash();

-- Prevent audit modification
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON firms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_firm_settings_updated_at BEFORE UPDATE ON firm_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS
-- =====================================================

-- Dashboard metrics view
CREATE VIEW v_dashboard_metrics AS
SELECT 
    f.id as firm_id,
    COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL) as total_clients,
    COUNT(DISTINCT i.id) FILTER (WHERE i.deleted_at IS NULL AND i.created_at >= date_trunc('month', now())) as invoices_this_month,
    COUNT(DISTINCT a.id) FILTER (WHERE a.resolved_at IS NULL AND a.severity IN ('warning', 'critical')) as pending_alerts,
    COALESCE(SUM(i.tax_amount) FILTER (WHERE i.deleted_at IS NULL AND i.created_at >= date_trunc('month', now())), 0) as total_iva_this_month,
    AVG(an.compliance_score) FILTER (WHERE an.created_at >= date_trunc('month', now())) as avg_compliance_score
FROM firms f
LEFT JOIN clients c ON c.firm_id = f.id
LEFT JOIN invoices i ON i.firm_id = f.id
LEFT JOIN alerts a ON a.firm_id = f.id
LEFT JOIN analyses an ON an.firm_id = f.id
GROUP BY f.id;

-- Recent activity view
CREATE VIEW v_recent_activity AS
SELECT 
    al.*,
    u.full_name as user_name,
    c.name as client_name
FROM audit_logs al
LEFT JOIN users u ON u.id = al.user_id
LEFT JOIN clients c ON c.id = al.client_id
ORDER BY al.created_at DESC
LIMIT 100;
