# 🔧 CORREÇÃO DO ERRO 404 NA API

## ⚠️ PASSO CRÍTICO - Configure no Dashboard da Vercel

### 1. Acesse seu projeto na Vercel
- URL: https://vercel.com/dashboard → auditpack-web

### 2. Vá em Settings → General

### 3. Configure os campos:

| Campo | Valor |
|-------|-------|
| **Framework Preset** | `Next.js` |
| **Root Directory** | **`apps/web`** ⭐ (MUITO IMPORTANTE!) |
| **Build Command** | Deixe em branco (auto-detect) |
| **Output Directory** | Deixe em branco (auto-detect) |
| **Install Command** | `npm install` |

### 4. Salve as alterações (Save)

### 5. Faça um novo deploy:
- Deployments → 3 pontos no deploy atual → Redeploy
- **DESMARQUE** "Use existing Build Cache"
- Clique Redeploy

---

## 🧪 Teste a API

Após o deploy, teste:

```bash
curl -X POST https://seu-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

Ou pelo browser:
- Abra: `https://seu-app.vercel.app/api/auth/login`
- Deve retornar erro 405 (Method Not Allowed) - isso é NORMAL!
- Significa que a rota existe mas só aceita POST

---

## ✅ Se ainda der erro

1. Verifique se o arquivo `apps/web/app/api/auth/login/route.ts` existe no GitHub
2. Verifique as variáveis de ambiente no Vercel:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY

3. Tente limpar o cache e fazer deploy novamente
