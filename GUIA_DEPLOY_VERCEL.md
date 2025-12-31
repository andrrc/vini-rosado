# 🚀 Guia Completo: Deploy na Vercel - Passo a Passo

Este guia vai te ensinar como hospedar seu projeto de teste na Vercel de forma completa e profissional.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Preparação do Projeto](#preparação-do-projeto)
3. [Configuração do Supabase](#configuração-do-supabase)
4. [Criar Conta na Vercel](#criar-conta-na-vercel)
5. [Configurar Variáveis de Ambiente](#configurar-variáveis-de-ambiente)
6. [Fazer o Deploy](#fazer-o-deploy)
7. [Configurar CORS nas Edge Functions](#configurar-cors-nas-edge-functions)
8. [Testar o Deploy](#testar-o-deploy)
9. [Troubleshooting](#troubleshooting)

---

## 📦 Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ Conta no **Supabase** (gratuita)
- ✅ Conta no **Vercel** (gratuita)
- ✅ Conta no **GitHub** (para conectar o repositório)
- ✅ **Node.js 18+** instalado localmente
- ✅ Projeto funcionando localmente (`npm run dev`)

---

## 🔧 Preparação do Projeto

### Passo 1: Verificar se o projeto compila

No terminal, na raiz do projeto, execute:

```bash
npm run build
```

Se aparecer algum erro, corrija antes de continuar. O build deve completar sem erros.

### Passo 2: Verificar arquivos importantes

Certifique-se de que estes arquivos existem:
- ✅ `package.json`
- ✅ `vite.config.ts`
- ✅ `tsconfig.json`
- ✅ `index.html`

### Passo 3: Criar arquivo `.gitignore` (se não existir)

Certifique-se de que o `.gitignore` inclui:

```
node_modules/
dist/
.env
.env.local
.DS_Store
```

---

## 🗄️ Configuração do Supabase

### Passo 1: Obter credenciais do Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login e selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie estas informações:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon/public key** (chave pública)

### Passo 2: Configurar Edge Functions no Supabase

1. No Supabase Dashboard, vá em **Settings** → **Edge Functions**
2. Adicione as seguintes variáveis de ambiente:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
GEMINI_API_KEY=sua_chave_gemini
```

**Onde encontrar:**
- `SUPABASE_URL` e `SUPABASE_ANON_KEY`: Settings → API
- `SUPABASE_SERVICE_ROLE_KEY`: Settings → API → service_role (⚠️ NUNCA exponha no frontend)
- `GEMINI_API_KEY`: [Google AI Studio](https://makersuite.google.com/app/apikey)

### Passo 3: Fazer deploy das Edge Functions

No terminal, na raiz do projeto:

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Fazer login no Supabase
supabase login

# Linkar com seu projeto
supabase link --project-ref seu-project-ref

# Fazer deploy de todas as Edge Functions
supabase functions deploy generate-copy
supabase functions deploy process-image
supabase functions deploy hotmart-webhook
```

**Onde encontrar o `project-ref`:**
- No Supabase Dashboard → Settings → General → Reference ID

---

## 🌐 Criar Conta na Vercel

### Passo 1: Criar conta

1. Acesse [https://vercel.com](https://vercel.com)
2. Clique em **Sign Up**
3. Escolha **Continue with GitHub** (recomendado)
4. Autorize a Vercel a acessar seus repositórios

### Passo 2: Instalar Vercel CLI (opcional, mas recomendado)

```bash
npm install -g vercel
```

---

## ⚙️ Configurar Variáveis de Ambiente

### Opção 1: Via Dashboard da Vercel (Recomendado)

1. Acesse [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique em **Add New Project**
3. Importe seu repositório do GitHub
4. **ANTES de fazer o deploy**, clique em **Environment Variables**
5. Adicione as seguintes variáveis:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `VITE_SUPABASE_URL` | `https://seu-projeto.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `sua_chave_anon_key` | Production, Preview, Development |

**Importante:**
- ✅ Marque todas as opções: Production, Preview, Development
- ✅ Use os valores do Supabase que você copiou anteriormente

### Opção 2: Via CLI

```bash
# Na raiz do projeto
vercel env add VITE_SUPABASE_URL
# Cole o valor quando solicitado
# Escolha: Production, Preview, Development

vercel env add VITE_SUPABASE_ANON_KEY
# Cole o valor quando solicitado
# Escolha: Production, Preview, Development
```

---

## 🚀 Fazer o Deploy

### Opção 1: Deploy via Dashboard (Mais Fácil)

1. Acesse [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique em **Add New Project**
3. **Import Git Repository:**
   - Se seu projeto já está no GitHub, selecione-o
   - Se não está, clique em **Import Third-Party Git Repository** e siga as instruções
4. **Configure Project:**
   - **Framework Preset:** Vite (deve detectar automaticamente)
   - **Root Directory:** `./` (raiz)
   - **Build Command:** `npm run build` (já deve estar preenchido)
   - **Output Directory:** `dist` (já deve estar preenchido)
   - **Install Command:** `npm install` (já deve estar preenchido)
5. **Environment Variables:**
   - Certifique-se de que adicionou `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
6. Clique em **Deploy**

### Opção 2: Deploy via CLI

```bash
# Na raiz do projeto
vercel

# Siga as instruções:
# - Set up and deploy? Y
# - Which scope? (escolha sua conta)
# - Link to existing project? N (primeira vez)
# - Project name? (pressione Enter para usar o padrão)
# - Directory? ./
# - Override settings? N
```

---

## 🔒 Configurar CORS nas Edge Functions

**⚠️ CRÍTICO:** Após fazer o deploy na Vercel, você receberá uma URL como:
`https://seu-projeto.vercel.app`

Você precisa atualizar o CORS nas Edge Functions para aceitar essa URL.

### Passo 1: Obter a URL do seu projeto na Vercel

Após o deploy, a Vercel mostrará a URL. Anote essa URL.

### Passo 2: Atualizar CORS nas Edge Functions

**Boa notícia:** Já atualizamos o código para aceitar automaticamente subdomínios `.vercel.app`! 

Mas se você quiser adicionar uma URL específica, edite estes arquivos:

1. `supabase/functions/generate-copy/index.ts`
2. `supabase/functions/process-image/index.ts`

Em cada arquivo, encontre a linha com `ALLOWED_ORIGINS` e adicione sua URL:

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://seu-projeto.vercel.app', // ← ADICIONE AQUI
]
```

### Passo 3: Fazer redeploy das Edge Functions

```bash
supabase functions deploy generate-copy
supabase functions deploy process-image
```

**Nota:** O código já foi atualizado para aceitar qualquer subdomínio `.vercel.app` automaticamente, então isso pode não ser necessário. Mas é bom adicionar sua URL específica para maior segurança.

---

## ✅ Testar o Deploy

### Passo 1: Acessar o site

1. Após o deploy, a Vercel mostrará a URL do seu site
2. Acesse a URL (ex: `https://seu-projeto.vercel.app`)
3. Verifique se a página carrega corretamente

### Passo 2: Testar funcionalidades

1. **Login:**
   - Tente fazer login com um usuário de teste
   - Verifique se a autenticação funciona

2. **Gerar Copy:**
   - Crie uma nova análise
   - Verifique se a geração de copy funciona
   - Verifique se não há erros de CORS no console do navegador

3. **Upload de Imagens:**
   - Tente fazer upload de uma imagem
   - Verifique se o processamento funciona

### Passo 3: Verificar logs

1. No Dashboard da Vercel, vá em **Deployments**
2. Clique no deployment mais recente
3. Vá em **Functions** ou **Logs** para ver se há erros

---

## 🔍 Troubleshooting

### Erro: "Missing Supabase environment variables"

**Solução:**
1. Vá em Vercel Dashboard → Settings → Environment Variables
2. Verifique se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configuradas
3. Certifique-se de que estão marcadas para **Production**
4. Faça um novo deploy

### Erro: "CORS policy blocked"

**Solução:**
1. Verifique se atualizou o CORS nas Edge Functions
2. Adicione a URL da Vercel em `ALLOWED_ORIGINS`
3. Faça redeploy das Edge Functions
4. Aguarde alguns minutos e teste novamente

### Erro: "Build failed"

**Solução:**
1. Teste localmente: `npm run build`
2. Se funcionar localmente, verifique os logs na Vercel
3. Verifique se todas as dependências estão no `package.json`
4. Verifique se não há erros de TypeScript

### Site carrega mas não funciona

**Solução:**
1. Abra o Console do navegador (F12)
2. Verifique se há erros de JavaScript
3. Verifique se as variáveis de ambiente estão sendo carregadas:
   - No console, digite: `console.log(import.meta.env)`
   - Deve mostrar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

### Erro 404 em rotas

**Solução:**
1. Vercel precisa de um arquivo `vercel.json` para SPA (Single Page Application)
2. Crie o arquivo `vercel.json` na raiz do projeto:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

3. Faça commit e push
4. A Vercel fará redeploy automaticamente

---

## 📝 Checklist Final

Antes de considerar o deploy completo, verifique:

- [ ] Build local funciona (`npm run build`)
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Edge Functions deployadas no Supabase
- [ ] CORS configurado nas Edge Functions
- [ ] Site acessível na URL da Vercel
- [ ] Login funciona
- [ ] Geração de copy funciona
- [ ] Upload de imagens funciona
- [ ] Sem erros no console do navegador
- [ ] Sem erros nos logs da Vercel

---

## 🎉 Próximos Passos

Após o deploy bem-sucedido:

1. **Configurar domínio customizado (opcional):**
   - Vercel Dashboard → Settings → Domains
   - Adicione seu domínio personalizado

2. **Configurar CI/CD:**
   - A Vercel já faz deploy automático a cada push no GitHub
   - Configure branch protection se necessário

3. **Monitoramento:**
   - Use o Analytics da Vercel para monitorar performance
   - Configure alertas se necessário

4. **Backup:**
   - Certifique-se de ter backup do banco de dados Supabase
   - Documente todas as configurações

---

## 📚 Recursos Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [React Router Deployment](https://reactrouter.com/en/main/start/deploying)

---

## 💡 Dicas Importantes

1. **Sempre teste localmente primeiro** com `npm run build`
2. **Mantenha as variáveis de ambiente seguras** - nunca commite `.env`
3. **Use Preview Deployments** para testar antes de ir para produção
4. **Monitore os logs** regularmente para identificar problemas
5. **Faça backup** das configurações importantes

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas:

1. Verifique os logs na Vercel Dashboard
2. Verifique o console do navegador (F12)
3. Verifique os logs do Supabase (Edge Functions)
4. Consulte a documentação oficial
5. Verifique se todas as variáveis de ambiente estão configuradas

---

**Boa sorte com seu deploy! 🚀**


