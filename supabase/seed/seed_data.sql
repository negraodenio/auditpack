-- =====================================================
-- AuditPack Seed Data
-- =====================================================

-- Insert test firm
INSERT INTO firms (id, name, tax_id, tax_id_hash, country_code, address, plan_type, max_clients, max_invoices_monthly)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Contabilidade Mendes & Associados',
    '123456789',
    encode(digest('123456789', 'sha256'), 'hex'),
    'PT',
    '{"street": "Rua da Liberdade, 100", "city": "Lisboa", "postal_code": "1250-096"}',
    'professional',
    200,
    5000
);

-- Insert test user
INSERT INTO users (id, firm_id, email, full_name, role, phone, is_active)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'carlos.mendes@contabilidade.pt',
    'Carlos Mendes',
    'admin',
    '+351912345678',
    true
);

-- Insert test clients
INSERT INTO clients (id, firm_id, tax_id, tax_id_hash, name, legal_name, whatsapp_number, regime_iva, sector, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', '987654321', encode(digest('987654321', 'sha256'), 'hex'), 'Restaurante Sabor Nacional', 'Sabor Nacional Lda', '+351912345678', 'geral', 'Restauração', true),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', '987654322', encode(digest('987654322', 'sha256'), 'hex'), 'Construções Silva', 'Silva Construções Lda', '+351912345679', 'geral', 'Construção', true),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', '987654323', encode(digest('987654323', 'sha256'), 'hex'), 'Consultoria Tech', 'Tech Consulting Unipessoal', '+351912345680', 'simplificado', 'Consultoria', true);

-- Insert firm settings
INSERT INTO firm_settings (firm_id, alert_threshold, auto_notify_client, whatsapp_config, preferred_llm)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'medium',
    false,
    '{"webhook_url": "", "api_key": ""}',
    'siliconflow'
);
