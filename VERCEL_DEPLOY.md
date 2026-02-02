# Deploy na Vercel - Passo a Passo

## 1. Preparação

### 1.1 Certifique-se de que tem:
- Conta GitHub com o código pushado
- Conta Vercel (pode usar login com GitHub)
- Projeto Supabase criado e configurado

### 1.2 Arquivos necessários no repo:
```
auditpack/
├── apps/web/
│   ├── app/
│   ├── lib/
│   ├── package.json
│   └── ...
├── supabase/migrations/
├── package.json (root)
└── ...
```

## 2. Configurar Supabase

### 2.1 SQL a executar no SQL Editor do Supabase:

Vá para: `https://app.supabase.com/project/_/sql`

Cole e execute o conteúdo de `supabase/migrations/001_initial_schema.sql`

### 2.2 Configurar Storage:

1. Vá para Storage no menu lateral
2. Crie um novo bucket chamado `invoices`
3. Desative "Restrict Public Access" (vamos usar RLS)
4. Copie as credenciais do projeto (Settings > API)

## 3. Deploy na Vercel

### 3.1 Importar projeto:

1. Acesse [vercel.com](https://vercel.com)
2. Clique "Add New Project"
3. Importe do GitHub
4. Selecione o repositório `auditpack`

### 3.2 Configurar build:

**Framework Preset:** Next.js

**Build Command:**
```bash
cd apps/web && npm run build
```

**Output Directory:**
```
apps/web/.next
```

**Install Command:**
```bash
npm install
```

### 3.3 Configurar Environment Variables:

Clique em "Environment Variables" e adicione:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ENCRYPTION_KEY=sua-chave-de-32-caracteres!
SILICONFLOW_API_KEY=sk-...
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-evolution
EVOLUTION_INSTANCE_NAME=auditpack
```

### 3.4 Deploy:

Clique "Deploy" e aguarde!

## 4. Configurações Pós-Deploy

### 4.1 Configurar Domínio:

1. Em Project Settings > Domains
2. Adicione seu domínio personalizado (opcional)
3. Ou use o domínio `.vercel.app`

### 4.2 Atualizar Webhooks Evolution API:

No seu servidor Evolution API, configure:

```bash
curl -X POST https://sua-evolution-api.com/webhook/set/auditpack \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_CHAVE" \
  -d '{
    "webhook": {
      "url": "https://seu-app.vercel.app/api/webhooks/whatsapp",
      "events": ["messages.upsert"]
    }
  }'
```

### 4.3 Configurar Supabase Auth:

1. Vá para Authentication > Settings no Supabase
2. Em "Site URL", adicione: `https://seu-app.vercel.app`
3. Em "Redirect URLs", adicione: `https://seu-app.vercel.app/auth/callback`

### 4.4 Criar primeiro usuário:

Execute no SQL Editor:

```sql
-- Criar usuário no Auth (substitua a senha!)
-- Ou use a interface do Supabase: Authentication > Users > Add User
```

## 5. Verificação

Acesse seu app e verifique:

- [ ] Página de login carrega
- [ ] Consegue fazer login
- [ ] Dashboard mostra dados
- [ ] Webhook responde (teste enviando mensagem)

## 6. Troubleshooting

### Erro 500 na API:
```bash
# Ver logs na Vercel
Project > Deployments > Latest > Functions
```

### Problemas de CORS:
Adicione em `next.config.js`:
```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
      ],
    },
  ];
}
```

### Webhook não funciona:
1. Verifique se a URL está correta
2. Teste com curl: `curl -X POST https://seu-app.vercel.app/api/webhooks/whatsapp`
3. Verifique logs na Vercel

## 7. Otimizações (Opcional)

### Configurar Edge Functions:
Para melhor performance, migre algumas APIs para Edge Functions no Supabase.

### Configurar Cache:
Na Vercel, habilite "Incremental Static Regeneration" para páginas que não mudam muito.

### Configurar Analytics:
Habilite "Vercel Analytics" para monitoramento.

---

**Pronto!** Seu AuditPack está no ar! 🚀
