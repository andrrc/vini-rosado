# 🚀 Production Readiness Checklist

Checklist completo para deploy em produção - Revisão técnica rigorosa

---

## 🔴 **CRÍTICO** - O site vai quebrar se não corrigir

### 1. CORS das Edge Functions - Domínio de Produção
**Status:** ❌ **BLOQUEANDO REQUISIÇÕES DE PRODUÇÃO**

**Problema:** Todas as Edge Functions têm `ALLOWED_ORIGINS` apenas com localhost. Requisições do domínio de produção serão bloqueadas.

**Arquivos afetados:**
- `supabase/functions/process-image/index.ts` (linha 9-13)
- `supabase/functions/generate-copy/index.ts` (linha 9-13)
- `supabase/functions/process-image-n8n/index.ts` (linha 8-12)
- `supabase/functions/process-image-openai/index.ts` (linha 8-12)

**Ação obrigatória:**
```typescript
// Antes do deploy, ADICIONE o domínio de produção em TODAS as funções:
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://seu-dominio.com', // ← ADICIONAR AQUI
  // Se usar Vercel: 'https://seu-projeto.vercel.app'
  // Se usar Netlify: 'https://seu-projeto.netlify.app'
]
```

**⚠️ IMPORTANTE:** Após adicionar, fazer **novo deploy de todas as Edge Functions**.

---

### 2. Variáveis de Ambiente no Vercel/Netlify
**Status:** ❌ **NÃO CONFIGURADO**

**Ação obrigatória no painel de hospedagem (Vercel/Netlify):**

Adicionar estas variáveis de ambiente:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_key_aqui
```

**Como configurar:**
- **Vercel:** Settings → Environment Variables → Add New
- **Netlify:** Site settings → Environment variables → Add variable

---

### 3. Migration 005 - Política DELETE não executada
**Status:** ❌ **EXCLUSÃO DE ANÁLISES NÃO FUNCIONA**

**Problema:** A migration `005_add_delete_policy_for_generations.sql` foi criada mas provavelmente não foi executada no Supabase.

**Ação obrigatória:**
1. Acesse Dashboard do Supabase → SQL Editor
2. Execute o conteúdo de `supabase/migrations/005_add_delete_policy_for_generations.sql`
3. OU use CLI: `npx supabase db push`

---

### 4. Rota 404 - Página não encontrada
**Status:** ❌ **FALTA ROTA CATCH-ALL**

**Problema:** Usuários acessando rotas inexistentes verão tela branca ou erro do React Router.

**Arquivo:** `src/App.tsx`

**Ação obrigatória:**
Adicionar rota catch-all no final das rotas:
```tsx
<Route path="*" element={<Navigate to="/" replace />} />
// OU criar componente NotFoundPage.tsx
```

---

### 5. Variáveis de Ambiente das Edge Functions no Supabase
**Status:** ⚠️ **VERIFICAR SE ESTÃO TODAS CONFIGURADAS**

**Ação obrigatória no Supabase Dashboard → Settings → Edge Functions:**

Verificar se TODAS estas variáveis estão configuradas:
- ✅ `SUPABASE_URL` (geralmente já existe)
- ✅ `SUPABASE_ANON_KEY` (geralmente já existe)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (geralmente já existe)
- ❓ `REMOVE_BG_API_KEY` (necessária para `process-image`)
- ❓ `GEMINI_API_KEY` (necessária para `generate-copy`)
- ❓ `HOTMART_SECRET` (necessária para `hotmart-webhook`)
- ❓ `OPENAI_API_KEY` (necessária para `process-image-openai`, se usar)
- ❓ `RESEND_API_KEY` (necessária para emails do webhook Hotmart, se usar)

---

## 🟡 **IMPORTANTE** - Segurança e Boas Práticas

### 6. Uso de `alert()` e `confirm()` em produção
**Status:** ⚠️ **UX RUIM**

**Arquivos afetados:**
- `src/pages/HistoryDashboard.tsx` (linhas 113, 139, 197)
- `src/pages/AnalysisDetails.tsx` (linha 151)
- `src/pages/AdminDashboard.tsx` (linhas 152, 168)

**Recomendação:** Substituir por componentes de modal/toast. Mas não é crítico - funciona, só tem UX ruim.

---

### 7. Console.logs em produção
**Status:** ⚠️ **EXPOSIÇÃO DE INFORMAÇÕES**

**Arquivos com console.error (aceitável, mas ideal remover):**
- `src/pages/HistoryDashboard.tsx` (3 ocorrências)
- `src/pages/AnalysisDetails.tsx` (2 ocorrências)
- `src/components/ImageUpload.tsx` (1 ocorrência)
- `src/pages/AdminDashboard.tsx` (4 ocorrências)
- `src/components/AdminRoute.tsx` (1 ocorrência)
- `src/pages/Dashboard.tsx` (1 ocorrência)

**Recomendação:** 
- Manter `console.error` para debug (é aceitável)
- Remover logs com dados sensíveis (emails, IDs de usuário)
- Considerar usar biblioteca de logging em produção (ex: Sentry)

**Análise:** Os logs atuais são apenas de erros genéricos, não expõem dados sensíveis diretamente. **Aceitável para primeira versão.**

---

### 8. Vite.config.ts não otimizado
**Status:** ⚠️ **BUILD NÃO OTIMIZADO**

**Arquivo:** `vite.config.ts`

**Problema:** Configuração básica, sem otimizações de produção.

**Recomendação:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
```

---

### 9. Falta tratamento de erro de rede/offline
**Status:** ⚠️ **UX MELHORÁVEL**

**Problema:** Se o usuário estiver offline ou a API falhar, o erro pode não ser claro.

**Recomendação:** Adicionar tratamento global de erros de rede:
```typescript
// Em catch blocks, verificar:
if (!navigator.onLine) {
  showToast('Sem conexão com a internet', 'error')
} else if (error.message.includes('fetch')) {
  showToast('Erro de conexão. Tente novamente.', 'error')
}
```

**Status atual:** Os erros são tratados, mas mensagens genéricas. **Funcional, mas melhorável.**

---

### 10. Falta arquivo .env.example
**Status:** ⚠️ **DOCUMENTAÇÃO INCOMPLETA**

**Ação:** Criar `.env.example` na raiz:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_key_aqui
```

**Benefício:** Facilita onboarding de novos desenvolvedores.

---

## 🟢 **MELHORIA** - Otimizações e Limpeza

### 11. Código morto - Dashboard.tsx não utilizado
**Status:** 🟢 **CÓDIGO NÃO UTILIZADO**

**Arquivo:** `src/pages/Dashboard.tsx`

**Problema:** Este componente não é importado em `App.tsx`. O projeto usa `HistoryDashboard` em vez de `Dashboard`.

**Ação:** 
- ✅ Opção 1: Remover o arquivo (recomendado)
- ✅ Opção 2: Manter para uso futuro (se planeja usar)

**Recomendação:** Remover para manter código limpo.

---

### 12. Tratamento de erro ao fazer fetch de Edge Functions
**Status:** 🟢 **MELHORÁVEL**

**Problema:** Em alguns lugares, se `response.json()` falhar, pode quebrar.

**Exemplo problemático:**
```typescript
const errorData = await response.json() // Pode falhar se resposta não for JSON
```

**Recomendação:** Adicionar try-catch ao redor de `response.json()`.

**Status atual:** Funciona na maioria dos casos, mas pode melhorar.

---

### 13. Validação de entrada do usuário
**Status:** 🟢 **BÁSICA, MAS FUNCIONAL**

**Análise:** Validações básicas existem (campos obrigatórios). Não há sanitização avançada, mas Supabase e RLS protegem o backend.

**Recomendação:** Considerar sanitização adicional no frontend, mas não crítico pois:
- Edge Functions validam entrada
- RLS protege banco de dados
- Gemini API trata entrada

---

### 14. TypeScript strict mode
**Status:** ✅ **JÁ CONFIGURADO**

**Análise:** `tsconfig.json` tem `"strict": true`. ✅ Bom!

---

## ✅ **PONTOS POSITIVOS ENCONTRADOS**

1. ✅ Variáveis de ambiente corretamente prefixadas com `VITE_`
2. ✅ RLS (Row Level Security) configurado corretamente
3. ✅ Autenticação JWT validada nas Edge Functions críticas
4. ✅ CORS restritivo implementado (só falta adicionar domínio de produção)
5. ✅ TypeScript strict mode habilitado
6. ✅ Tratamento de erros básico presente
7. ✅ Componentes de rota protegida (ProtectedRoute, AdminRoute)
8. ✅ Toasts/notificações visuais implementadas
9. ✅ Sem chaves secretas expostas no código do frontend

---

## 📋 **CHECKLIST RESUMIDO PARA DEPLOY**

### Antes do Deploy:

- [ ] **CRÍTICO:** Adicionar domínio de produção em `ALLOWED_ORIGINS` de todas as Edge Functions
- [ ] **CRÍTICO:** Fazer deploy das Edge Functions atualizadas
- [ ] **CRÍTICO:** Executar migration 005 no Supabase (política DELETE)
- [ ] **CRÍTICO:** Adicionar variáveis de ambiente no Vercel/Netlify:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] **CRÍTICO:** Adicionar rota 404 no `App.tsx`
- [ ] **CRÍTICO:** Verificar todas as variáveis de ambiente das Edge Functions no Supabase Dashboard

### Após o Deploy (testar):

- [ ] Testar login/logout
- [ ] Testar criação de análise
- [ ] Testar exclusão de análise
- [ ] Testar acesso a rota inexistente (deve redirecionar)
- [ ] Testar Edge Functions do domínio de produção
- [ ] Verificar console do navegador (sem erros críticos)

---

## 🎯 **PRIORIZAÇÃO FINAL**

### Deve fazer ANTES do deploy (crítico):
1. CORS - adicionar domínio de produção ✅
2. Variáveis de ambiente no Vercel/Netlify ✅
3. Migration 005 - executar no Supabase ✅
4. Rota 404 - adicionar ✅
5. Deploy das Edge Functions ✅

### Pode fazer DEPOIS do deploy (melhorias):
1. Remover Dashboard.tsx (código morto)
2. Otimizar vite.config.ts
3. Criar .env.example
4. Melhorar tratamento de erros de rede
5. Substituir alert()/confirm() por modals (opcional)

---

**Data da revisão:** $(date)
**Revisado por:** AI Assistant (Tech Lead Sênior / DevOps)


