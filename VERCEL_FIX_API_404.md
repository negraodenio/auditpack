# 🔧 FIX: Rotas de API retornando 404 na Vercel

## ✅ Arquivos Modificados

1. **`/vercel.json`** - Configuração de build do monorepo
2. **`/apps/web/vercel.json`** - Configuração específica do Next.js
3. **`/apps/web/next.config.js`** - Adicionado headers CORS e configurações

---

## 🚀 PASSOS PARA APLICAR A CORREÇÃO

### ETAPA 1: Configuração no Dashboard da Vercel (CRÍTICO!)

Acesse seu projeto na Vercel e configure:

#### 1.1 Project Settings → General

| Configuração | Valor |
|-------------|-------|
| **Framework Preset** | `Next.js` |
| **Root Directory** | `apps/web` ⭐ IMPORTANTE! |
| **Build Command** | `next build` (ou deixe em branco para auto-detect) |
| **Output Directory** | `.next` (ou deixe em branco para auto-detect) |
| **Install Command** | `npm install` |

**⚠️ CRÍTICO:** O campo `Root Directory` DEVE estar configurado como `apps/web`

Isso faz o Vercel tratar o diretório `apps/web` como a raiz do projeto Next.js.

#### 1.2 Como verificar/configurar:

1. Vá para [vercel.com](https://vercel.com)
2. Selecione seu projeto `auditpack`
3. Clique na aba **"Settings"**
4. No menu lateral, clique em **"General"**
5. Role até a seção **"Root Directory"**
6. Digite: `apps/web`
7. Clique **"Save"**

![Root Directory Config](https://vercel.com/docs/concepts/deployments/configure-a-build#root-directory)

---

### ETAPA 2: Redeploy

Depois de configurar o Root Directory:

1. Vá para a aba **"Deployments"**
2. Encontre o deploy mais recente
3. Clique nos 3 pontos (⋯) → **"Redeploy"**
4. Selecione **"Use existing Build Cache"** = ❌ Não (para garantir build limpo)
5. Clique **"Redeploy"**

---

### ETAPA 3: Verificar se funcionou

Após o deploy completo, teste suas APIs:

```bash
# Teste a API de login
curl -X POST https://seu-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'

# Teste outras APIs
curl https://seu-app.vercel.app/api/clients
curl https://seu-app.vercel.app/api/invoices
curl https://seu-app.vercel.app/api/alerts
```

---

## 🔍 DIAGNÓSTICO

### Verifique os logs:

1. No Dashboard Vercel → **"Deployments"**
2. Clique no deploy atual
3. Vá para a aba **"Functions"**
4. Clique em uma função de API (ex: `/api/auth/login`)
5. Verifique se aparece **"Serverless Function"** e não "Static File"

### Se ainda der 404:

Verifique se no build log aparece:

```
✓  (serer)  server-side renders at runtime
✓  (ssg)    statically generates
ƒ  (dynamic) server-rendered on demand  ← Suas APIs devem aparecer assim
```

---

## 🛠️ ALTERNATIVA: Deploy como novo projeto

Se a correção acima não funcionar, crie um novo projeto:

1. Delete o projeto atual na Vercel (ou crie um novo)
2. Na hora de importar, configure **imediatamente**:
   - **Root Directory**: `apps/web`
   - **Framework**: Next.js
3. Adicione as variáveis de ambiente
4. Deploy

---

## 📋 Checklist de Configuração

- [ ] Root Directory configurado como `apps/web` no Dashboard
- [ ] Framework Preset = Next.js
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado após alterações
- [ ] APIs testadas com `curl` ou navegador
- [ ] Logs verificados na aba "Functions"

---

## 🆘 Se nada funcionar

Execute localmente para verificar:

```bash
cd apps/web
npm run build
npm start
```

Teste `http://localhost:3000/api/auth/login` - deve funcionar.

Se funcionar localmente mas não na Vercel, o problema é **exclusivamente** na configuração do Dashboard.

---

**Contato para suporte:** Verifique os logs de build na Vercel e compartilhe se precisar de ajuda adicional.
