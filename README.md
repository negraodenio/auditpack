# AuditPack - Sistema de Conformidade Fiscal

Sistema completo de auditoria e conformidade fiscal para escritórios de contabilidade.

## 🚀 Tecnologias

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Supabase
- **Database**: PostgreSQL (Supabase)
- **AI**: SiliconFlow (DeepSeek)
- **WhatsApp**: Evolution API
- **Deploy**: Vercel

## 📋 Pré-requisitos

- Node.js 18+
- Conta Supabase
- Chave API SiliconFlow
- Servidor Evolution API

## 🛠️ Setup

### 1. Clone e instale dependências

```bash
git clone <repo>
cd auditpack
npm install
```

### 2. Configure variáveis de ambiente

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edite `apps/web/.env.local` com suas credenciais:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENCRYPTION_KEY=your-32-char-encryption-key!
SILICONFLOW_API_KEY=your-siliconflow-api-key
EVOLUTION_API_URL=https://your-evolution-api.com
EVOLUTION_API_KEY=your-evolution-api-key
```

### 3. Configure o Supabase

1. Crie um novo projeto em [supabase.com](https://supabase.com)
2. Execute o SQL em `supabase/migrations/001_initial_schema.sql`
3. Execute o seed: `supabase/seed/seed_data.sql`
4. Habilite Storage e crie bucket "invoices"

### 4. Configure Evolution API

1. Configure seu servidor Evolution API
2. Crie uma instância "auditpack"
3. Configure o webhook para: `https://your-app.com/api/webhooks/whatsapp`

### 5. Rode localmente

```bash
npm run dev
```

Acesse: http://localhost:3000

Login padrão (após seed):
- Email: carlos.mendes@contabilidade.pt
- Senha: (configurar no Supabase Auth)

## 📦 Deploy na Vercel

### 1. Push para GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy na Vercel

1. Importe o projeto na [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente
3. Deploy!

### 3. Atualize webhooks

Após deploy, atualize os webhooks do Evolution API para a URL de produção.

## 🏗️ Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  WhatsApp   │────▶│   Webhook   │────▶│   Next.js   │
│  (Evolution)│     │  /api/webhooks  │     │   API       │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                       ┌────────────────────────┼────────────────────────┐
                       │                        │                        │
                       ▼                        ▼                        ▼
               ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
               │   Supabase   │        │  SiliconFlow │        │   Storage    │
               │  PostgreSQL  │        │      AI      │        │  (Supabase)  │
               └──────────────┘        └──────────────┘        └──────────────┘
```

## 🔒 Segurança

- RLS (Row Level Security) ativado em todas as tabelas
- Criptografia AES-256 para dados sensíveis
- Audit logs imutáveis
- Rate limiting por tenant

## 📊 Funcionalidades

✅ Recebimento de faturas via WhatsApp  
✅ Análise de conformidade com IA  
✅ Dashboard de métricas  
✅ Alertas automáticos  
✅ Gestão de clientes  
✅ Logs de auditoria  

## 📝 Licença

Proprietário - AuditPack
