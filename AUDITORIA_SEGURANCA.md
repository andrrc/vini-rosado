# 🔒 Auditoria de Segurança - Relatório Completo

**Projeto:** Vini Rosado - Gerador de Copy  
**Data:** 30/12/2025  
**Auditor:** Engenheiro Sênior de Segurança (AppSec)

---

## 📋 Sumário Executivo

Esta auditoria identificou **15 vulnerabilidades de segurança** distribuídas entre os níveis Crítico (3), Alto (5), Médio (4) e Baixo (3). As principais áreas de preocupação são: **CORS permissivo**, **falta de rate limiting**, **validação de entrada insuficiente** e **falta de headers de segurança**.

---

## 1. 🛡️ Análise de Vulnerabilidade de Rotas e Endpoints

### 1.1 Mapeamento de Rotas Identificadas

#### **Frontend (React Router)**
| Rota | Sensibilidade | Proteção Atual | Status |
|------|--------------|----------------|--------|
| `/` | Pública | Nenhuma | ✅ OK |
| `/login` | Pública | Nenhuma | ✅ OK |
| `/reset-password` | Pública | Nenhuma | ✅ OK |
| `/update-password` | Pública | Nenhuma | ⚠️ RISCO |
| `/app` | Privada | `ProtectedRoute` | ✅ OK |
| `/app/nova-analise` | Privada | `ProtectedRoute` | ✅ OK |
| `/app/analise/:id` | Privada | `ProtectedRoute` + RLS | ✅ OK |
| `/app/estudio-imagem/:id` | Privada | `ProtectedRoute` + RLS | ✅ OK |
| `/admin` | Crítica | `AdminRoute` + RLS | ✅ OK |

#### **Backend (Edge Functions)**
| Endpoint | Sensibilidade | Autenticação | Status |
|----------|--------------|--------------|--------|
| `/functions/v1/generate-copy` | Alta | Header `apikey` apenas | 🔴 CRÍTICO |
| `/functions/v1/process-image` | Alta | Header `apikey` apenas | 🔴 CRÍTICO |
| `/functions/v1/process-image-n8n` | Alta | Header `apikey` apenas | 🔴 CRÍTICO |
| `/functions/v1/process-image-openai` | Alta | Header `apikey` apenas | 🔴 CRÍTICO |
| `/functions/v1/hotmart-webhook` | Crítica | Nenhuma | 🔴 CRÍTICO |

---

### 1.2 Validação de Entrada

#### 🔴 **VULNERABILIDADE CRÍTICA #1: Validação Insuficiente de Entrada**

**Severidade:** CRÍTICO  
**Localização:** Todas as Edge Functions

**Problema:**
As Edge Functions não utilizam bibliotecas de validação (Zod, Joi, Typebox) e fazem validações manuais básicas que podem ser contornadas.

**Código Vulnerável:**
```typescript
// supabase/functions/process-image/index.ts:16
const { image_url, product_id } = await req.json()

if (!image_url) {
  return new Response(JSON.stringify({ error: 'Campo obrigatório: image_url' }), {
    status: 400,
  })
}
```

**Riscos:**
- **Injection Attacks**: Inputs não validados podem conter payloads maliciosos
- **Type Confusion**: Não há garantia de tipos (ex: `product_id` pode ser `null`, objeto, array)
- **Buffer Overflow**: `image_url` não valida tamanho máximo, podendo causar DoS
- **SSRF**: `image_url` não valida se é URL externa ou interna (Server-Side Request Forgery)

**Código Corrigido:**
```typescript
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const requestSchema = z.object({
  image_url: z.string()
    .url('URL inválida')
    .max(2048, 'URL muito longa')
    .refine(url => {
      try {
        const parsed = new URL(url)
        // Prevenir SSRF - bloquear localhost/private IPs
        const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254']
        return !blockedHosts.includes(parsed.hostname)
      } catch {
        return false
      }
    }, 'URL não permitida'),
  product_id: z.string().uuid('ID inválido')
})

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const validatedData = requestSchema.parse(body) // Lança erro se inválido
    
    // Usar validatedData.image_url e validatedData.product_id (tipados)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Validação falhou', details: error.errors }),
        { status: 400, headers: corsHeaders }
      )
    }
    throw error
  }
})
```

---

#### 🟡 **VULNERABILIDADE MÉDIA #2: Falta de Sanitização de Inputs**

**Severidade:** MÉDIO  
**Localização:** `generate-copy/index.ts:48`

**Problema:**
Entrada do usuário (`product_name`, `features`, `category`) é inserida diretamente no prompt sem sanitização, permitindo prompt injection.

**Código Vulnerável:**
```typescript
const userPrompt = `Produto: ${product_name}
Categoria: ${category}
Características: ${features}`
```

**Riscos:**
- **Prompt Injection**: Usuário pode injetar instruções que alteram o comportamento da IA
- **XSS em emails**: Se o resultado for enviado por email, pode conter HTML malicioso

**Código Corrigido:**
```typescript
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remover HTML tags
    .replace(/[\r\n]{3,}/g, '\n\n') // Limitar quebras de linha
    .slice(0, 500) // Limitar tamanho
}

const requestSchema = z.object({
  product_name: z.string().min(1).max(100).transform(sanitizeInput),
  features: z.string().min(1).max(500).transform(sanitizeInput),
  category: z.string().min(1).max(50).transform(sanitizeInput),
})
```

---

### 1.3 Exposição de Dados

#### 🟡 **VULNERABILIDADE MÉDIA #3: Exposição de Dados Sensíveis em Logs**

**Severidade:** MÉDIO  
**Localização:** `hotmart-webhook/index.ts:172`

**Problema:**
Senhas/códigos de transação são logados no console, podendo aparecer em logs de produção.

**Código Vulnerável:**
```typescript
console.log(`📝 Senha inicial definida para ${email}: ${initialPassword.substring(0, 10)}...`)
```

**Riscos:**
- Credenciais aparecem em logs do Supabase
- Violação de LGPD/GDPR
- Logs podem ser acessados por terceiros

**Código Corrigido:**
```typescript
// Nunca logar senhas/códigos
console.log(`📝 Senha inicial definida para ${email}`)
// OU usar hash irreversível para debugging
const hashPreview = initialPassword.substring(0, 2) + '***'
console.log(`📝 Senha inicial definida para ${email}: ${hashPreview}`)
```

---

#### 🟢 **VULNERABILIDADE BAIXA #4: Respostas de Erro Informativas Demais**

**Severidade:** BAIXO  
**Localização:** Todas as Edge Functions

**Problema:**
Mensagens de erro expõem detalhes da stack interna.

**Código Vulnerável:**
```typescript
catch (error) {
  return new Response(
    JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
    { status: 500 }
  )
}
```

**Código Corrigido:**
```typescript
catch (error) {
  // Log detalhado apenas no servidor
  console.error('Erro interno:', error)
  
  // Resposta genérica para o cliente
  return new Response(
    JSON.stringify({ error: 'Erro interno do servidor' }),
    { status: 500 }
  )
}
```

---

## 2. 🔐 Autenticação e Controle de Acesso (AuthN & AuthZ)

### 2.1 Mecanismos de Autenticação

#### ✅ **PONTO POSITIVO: Supabase Auth**
- Utiliza JWT tokens gerenciados pelo Supabase
- Tokens são assinados e verificados automaticamente
- Refresh tokens implementados

#### 🟡 **VULNERABILIDADE MÉDIA #5: Edge Functions Não Validam JWT**

**Severidade:** MÉDIO  
**Localização:** Todas as Edge Functions

**Problema:**
Edge Functions aceitam requisições apenas com `apikey` no header, sem validar o JWT do usuário autenticado.

**Código Vulnerável:**
```typescript
// process-image/index.ts - Não há verificação de autenticação
const { image_url, product_id } = await req.json()
// Qualquer pessoa com anon key pode chamar
```

**Riscos:**
- **Acesso Não Autorizado**: Qualquer pessoa com `VITE_SUPABASE_ANON_KEY` pode chamar as funções
- **Abuse de API**: Não há rastreamento de quem está usando a API
- **Custo**: Requisições maliciosas geram custos (remove.bg, Gemini API)

**Código Corrigido:**
```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Validar autenticação
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Não autorizado' }),
      { status: 401, headers: corsHeaders }
    )
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Token inválido ou expirado' }),
      { status: 401, headers: corsHeaders }
    )
  }

  // Verificar se usuário está banido
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .single()

  if (profile?.is_banned) {
    return new Response(
      JSON.stringify({ error: 'Usuário banido' }),
      { status: 403, headers: corsHeaders }
    )
  }

  // Continuar processamento...
})
```

---

#### 🔴 **VULNERABILIDADE CRÍTICA #6: Webhook Hotmart Sem Autenticação**

**Severidade:** CRÍTICO  
**Localização:** `hotmart-webhook/index.ts:114`

**Problema:**
Webhook público sem autenticação permite que qualquer pessoa crie usuários no sistema.

**Código Vulnerável:**
```typescript
Deno.serve(async (req) => {
  const webhookData = await req.json()
  // Nenhuma verificação de autenticação!
})
```

**Riscos:**
- **Criação Arbitrária de Usuários**: Atacante pode criar contas falsas
- **Spam de Emails**: Envio de emails para endereços arbitrários
- **DoS**: Preenchimento do banco com dados falsos

**Código Corrigido:**
```typescript
Deno.serve(async (req) => {
  // Verificar assinatura do webhook Hotmart
  const signature = req.headers.get('X-Hotmart-Hottok')
  const hottokSecret = Deno.env.get('HOTMART_WEBHOOK_SECRET')
  
  if (!signature || signature !== hottokSecret) {
    return new Response(
      JSON.stringify({ error: 'Assinatura inválida' }),
      { status: 401, headers: corsHeaders }
    )
  }

  // OU usar método de assinatura HMAC se o Hotmart suportar
  const body = await req.text()
  const expectedSignature = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(hottokSecret + body)
  )
  
  // Continuar apenas se assinatura válida...
})
```

---

### 2.2 Middlewares de Autorização

#### ✅ **PONTO POSITIVO: ProtectedRoute e AdminRoute**
- Frontend possui componentes de proteção de rotas
- `AdminRoute` verifica `is_admin` no banco

#### 🟡 **VULNERABILIDADE MÉDIA #7: Race Condition em AdminRoute**

**Severidade:** MÉDIO  
**Localização:** `components/AdminRoute.tsx:11`

**Problema:**
Verificação de admin acontece no cliente e pode ser contornada com manipulação de estado.

**Código Vulnerável:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single()
```

**Riscos:**
- Atacante pode modificar resposta da API no DevTools
- Apenas RLS protege, mas cliente pode ver conteúdo antes de redirecionar

**Mitigação:**
RLS já protege no banco, mas adicionar verificação no servidor também.

---

### 2.3 RBAC/ABAC e IDOR

#### ✅ **PONTO POSITIVO: RLS Implementado Corretamente**
- Row Level Security habilitado em `generations` e `profiles`
- Políticas verificam `auth.uid() = user_id`
- Admin pode ver todos via `is_current_user_admin()`

#### 🟡 **VULNERABILIDADE MÉDIA #8: IDOR Potencial em Edge Functions**

**Severidade:** MÉDIO  
**Localização:** `process-image/index.ts:128`

**Problema:**
Edge Function atualiza `generations` usando apenas `product_id` sem verificar se o usuário autenticado é dono.

**Código Vulnerável:**
```typescript
const { error: updateError } = await supabase
  .from('generations')
  .update({ image_url: finalImageUrl })
  .eq('id', product_id)
// Não verifica user_id!
```

**Riscos:**
- Com autenticação implementada (fix #5), RLS já protegeria
- Mas se usar service role key, bypassa RLS

**Código Corrigido:**
```typescript
// Usar cliente autenticado (não service role) para esta operação
// OU adicionar verificação explícita:
const { data: generation, error: checkError } = await supabase
  .from('generations')
  .select('user_id')
  .eq('id', product_id)
  .single()

if (checkError || generation.user_id !== user.id) {
  return new Response(
    JSON.stringify({ error: 'Acesso negado' }),
    { status: 403, headers: corsHeaders }
  )
}
```

---

## 3. 🛡️ Proteção Contra Vetores de Ataque (OWASP Top 10)

### 3.1 Injeção (SQL, NoSQL, Command)

#### ✅ **PONTO POSITIVO: Supabase Client**
- Utiliza Supabase JS Client que usa prepared statements
- Não há queries SQL raw concatenadas
- RLS é aplicado na camada do banco

**Status:** ✅ Protegido contra SQL Injection

---

### 3.2 XSS & CSRF

#### 🟡 **VULNERABILIDADE MÉDIA #9: Falta de Proteção CSRF**

**Severidade:** MÉDIO  
**Localização:** Frontend (React)

**Problema:**
Não há tokens CSRF implementados. Supabase Auth usa cookies, mas não há proteção adicional.

**Riscos:**
- Ataques CSRF em ações críticas (deletar gerações, atualizar perfil)
- Supabase protege parcialmente, mas pode ser melhorado

**Código Corrigido:**
```typescript
// Em App.tsx ou AuthContext.tsx
useEffect(() => {
  // Gerar CSRF token no login
  const csrfToken = crypto.randomUUID()
  sessionStorage.setItem('csrf_token', csrfToken)
  
  // Adicionar a todas as requisições mutantes
}, [])

// Em requisições DELETE/PUT/POST
headers: {
  'X-CSRF-Token': sessionStorage.getItem('csrf_token'),
}
```

---

#### ✅ **PONTO POSITIVO: React Escapa HTML Automaticamente**
- React escapa strings por padrão
- Não há uso de `dangerouslySetInnerHTML` identificado

---

### 3.3 Força Bruta e Credential Stuffing

#### 🔴 **VULNERABILIDADE CRÍTICA #10: Falta de Rate Limiting em Login**

**Severidade:** CRÍTICO  
**Localização:** `pages/Login.tsx:15`

**Problema:**
Rota de login não possui rate limiting, permitindo brute force attacks.

**Riscos:**
- Atacante pode tentar milhões de combinações email/senha
- Sem bloqueio após X tentativas
- Credential stuffing de listas vazadas

**Código Corrigido (Supabase Edge Function):**
```typescript
// Criar função: supabase/functions/rate-limit-login/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos

Deno.serve(async (req) => {
  const { email } = await req.json()
  
  // Usar Supabase KV ou tabela para tracking
  const supabase = createClient(/* ... */)
  
  const { data: attempts } = await supabase
    .from('login_attempts')
    .select('attempts, blocked_until')
    .eq('email', email)
    .gte('blocked_until', new Date().toISOString())
    .single()
  
  if (attempts && attempts.blocked_until > new Date()) {
    return new Response(
      JSON.stringify({ error: 'Muitas tentativas. Tente novamente mais tarde.' }),
      { status: 429 }
    )
  }
  
  if (attempts && attempts.attempts >= MAX_ATTEMPTS) {
    // Bloquear por 15 minutos
    await supabase
      .from('login_attempts')
      .update({ 
        blocked_until: new Date(Date.now() + WINDOW_MS).toISOString(),
        attempts: 0
      })
      .eq('email', email)
    
    return new Response(
      JSON.stringify({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' }),
      { status: 429 }
    )
  }
  
  // Incrementar tentativas
  // ... lógica de login
})
```

**Migração SQL Necessária:**
```sql
CREATE TABLE IF NOT EXISTS login_attempts (
  email TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  blocked_until TIMESTAMP WITH TIME ZONE,
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_blocked ON login_attempts(blocked_until);
```

---

## 4. 🔒 Hardening de Configuração e Infraestrutura

### 4.1 Headers de Segurança HTTP

#### 🔴 **VULNERABILIDADE ALTA #11: Falta de Headers de Segurança**

**Severidade:** ALTO  
**Localização:** Todas as Edge Functions

**Problema:**
Respostas não incluem headers essenciais de segurança.

**Headers Ausentes:**
- `Content-Security-Policy` (CSP)
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy`
- `Permissions-Policy`

**Código Corrigido:**
```typescript
const securityHeaders = {
  ...corsHeaders,
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
}

return new Response(
  JSON.stringify(data),
  { status: 200, headers: securityHeaders }
)
```

---

### 4.2 Rate Limiting / Throttling

#### 🔴 **VULNERABILIDADE ALTA #12: Ausência de Rate Limiting Global**

**Severidade:** ALTO  
**Localização:** Todas as Edge Functions

**Problema:**
Nenhuma função possui rate limiting, permitindo abuso e DoS.

**Riscos:**
- **DoS**: Atacante pode fazer milhares de requisições simultâneas
- **Custo**: APIs externas (Gemini, remove.bg) geram custos altos
- **Degradação de Serviço**: Sistema fica lento para usuários legítimos

**Código Corrigido (Middleware Reutilizável):**
```typescript
// supabase/functions/_shared/rate-limit.ts
interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator: (req: Request) => string
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export async function rateLimit(
  req: Request,
  config: RateLimitConfig
): Promise<Response | null> {
  const key = config.keyGenerator(req)
  const now = Date.now()
  
  const entry = rateLimitStore.get(key)
  
  if (entry && entry.resetAt > now) {
    if (entry.count >= config.maxRequests) {
      return new Response(
        JSON.stringify({ error: 'Rate limit excedido' }),
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((entry.resetAt - now) / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }
    entry.count++
  } else {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
  }
  
  // Limpar entradas expiradas (prevenir memory leak)
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) rateLimitStore.delete(k)
    }
  }
  
  return null // Não bloqueou
}

// Uso em process-image/index.ts
const authHeader = req.headers.get('Authorization')
const userId = authHeader ? await getUserIdFromToken(authHeader) : req.headers.get('x-forwarded-for') || 'anonymous'

const rateLimitResponse = await rateLimit(req, {
  maxRequests: 10, // 10 requisições
  windowMs: 60000, // por minuto
  keyGenerator: () => `process-image:${userId}`,
})

if (rateLimitResponse) return rateLimitResponse
```

**Nota:** Para produção, use Redis ou Supabase Realtime para rate limiting distribuído.

---

### 4.3 CORS

#### 🔴 **VULNERABILIDADE ALTA #13: CORS Extremamente Permissivo**

**Severidade:** ALTO  
**Localização:** Todas as Edge Functions

**Problema:**
CORS permite **qualquer origem** (`*`), permitindo que qualquer site faça requisições.

**Código Vulnerável:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

**Riscos:**
- **Ataques CSRF**: Sites maliciosos podem fazer requisições em nome do usuário
- **Vazamento de Dados**: Dados podem ser acessados por scripts em qualquer domínio
- **Credential Theft**: Tokens podem ser interceptados

**Código Corrigido:**
```typescript
const ALLOWED_ORIGINS = [
  'https://seudominio.com',
  'https://www.seudominio.com',
  'http://localhost:5173', // Apenas desenvolvimento
]

const origin = req.headers.get('Origin')
const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin : null

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin || 'null',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
}
```

---

## 5. 📊 Monitoramento e Detecção de Intrusão

### 5.1 Logging Estruturado

#### 🟡 **VULNERABILIDADE MÉDIA #14: Logging Inadequado**

**Severidade:** MÉDIO  
**Localização:** Todas as Edge Functions

**Problema:**
Logs não são estruturados e não capturam informações de segurança relevantes.

**Código Atual:**
```typescript
console.log('✅ Imagem processada:', processedImageUrl)
console.error('❌ Erro na função process-image:', error)
```

**Código Corrigido:**
```typescript
interface SecurityLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'security'
  event: string
  userId?: string
  ip?: string
  userAgent?: string
  details?: Record<string, unknown>
}

function logSecurity(event: SecurityLog) {
  // Estruturar logs para análise
  console.log(JSON.stringify({
    ...event,
    timestamp: new Date().toISOString(),
  }))
}

// Uso
logSecurity({
  level: 'security',
  event: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  ip: req.headers.get('x-forwarded-for') || 'unknown',
  userAgent: req.headers.get('user-agent') || 'unknown',
  details: { endpoint: '/functions/v1/process-image' },
})

logSecurity({
  level: 'info',
  event: 'IMAGE_PROCESSED',
  userId: user.id,
  details: { product_id, image_size: imageBuffer.byteLength },
})
```

**Tabela SQL para Logs:**
```sql
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  level TEXT NOT NULL,
  event TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  ip TEXT,
  user_agent TEXT,
  endpoint TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp DESC);
CREATE INDEX idx_security_logs_event ON security_logs(event);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
```

---

### 5.2 Alertas e Detecção

#### 🟢 **VULNERABILIDADE BAIXA #15: Falta de Sistema de Alertas**

**Severidade:** BAIXO  
**Localização:** Sistema

**Recomendação:**
Implementar alertas para eventos críticos:

```typescript
// supabase/functions/_shared/alerts.ts
async function sendSecurityAlert(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, unknown>
) {
  // Integrar com serviço de alertas (ex: PagerDuty, Slack, Email)
  const webhookUrl = Deno.env.get('SECURITY_ALERTS_WEBHOOK')
  
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        severity,
        timestamp: new Date().toISOString(),
        details,
      }),
    })
  }
}

// Gatilhos de alerta:
// - Múltiplos erros 401/403 do mesmo IP
// - Rate limit excedido consistentemente
// - Tentativas de acesso a recursos de outros usuários
// - Criar usuário via webhook sem assinatura válida
```

---

## 6. 🧪 Scripts de Validação e Pentest

### 6.1 Scripts de Teste Automatizados

#### Script Python para Testar Autenticação
```python
# tests/test_authentication.py
import requests
import json

BASE_URL = "https://bxggsjytnfupdoptcpeq.supabase.co/functions/v1"
ANON_KEY = "sua_anon_key_aqui"  # Nunca commitar!

def test_process_image_without_auth():
    """Teste: Deve falhar sem autenticação"""
    response = requests.post(
        f"{BASE_URL}/process-image",
        json={"image_url": "https://example.com/image.jpg", "product_id": "123"},
        headers={"apikey": ANON_KEY}
    )
    assert response.status_code == 401, "Endpoint deve requerer autenticação"
    print("✅ Teste de autenticação passou")

def test_process_image_with_invalid_jwt():
    """Teste: Deve falhar com JWT inválido"""
    response = requests.post(
        f"{BASE_URL}/process-image",
        json={"image_url": "https://example.com/image.jpg", "product_id": "123"},
        headers={
            "apikey": ANON_KEY,
            "Authorization": "Bearer token_invalido_12345"
        }
    )
    assert response.status_code == 401, "JWT inválido deve ser rejeitado"
    print("✅ Teste de JWT inválido passou")

def test_rate_limiting():
    """Teste: Deve limitar requisições excessivas"""
    # Fazer 20 requisições rápidas
    for i in range(20):
        response = requests.post(
            f"{BASE_URL}/process-image",
            json={"image_url": f"https://example.com/image{i}.jpg", "product_id": str(i)},
            headers={"apikey": ANON_KEY}
        )
        if response.status_code == 429:
            print(f"✅ Rate limiting ativado na requisição {i+1}")
            return
    print("⚠️ Rate limiting não foi ativado")

def test_ssrf_protection():
    """Teste: Deve bloquear SSRF (localhost)"""
    response = requests.post(
        f"{BASE_URL}/process-image",
        json={
            "image_url": "http://localhost:8080/secret",
            "product_id": "123"
        },
        headers={"apikey": ANON_KEY}
    )
    assert response.status_code == 400, "SSRF deve ser bloqueado"
    print("✅ Proteção SSRF funcionando")

def test_idor_protection():
    """Teste: Usuário não pode acessar geração de outro usuário"""
    # Este teste requer 2 usuários autenticados
    # user1_token = "token_do_usuario_1"
    # user2_generation_id = "id_da_geracao_do_usuario_2"
    
    # response = requests.get(
    #     f"{BASE_URL}/generations/{user2_generation_id}",
    #     headers={"Authorization": f"Bearer {user1_token}"}
    # )
    # assert response.status_code == 403, "IDOR deve ser bloqueado"
    print("⚠️ Teste IDOR requer setup de usuários")

if __name__ == "__main__":
    print("🧪 Executando testes de segurança...")
    test_process_image_without_auth()
    test_process_image_with_invalid_jwt()
    test_rate_limiting()
    test_ssrf_protection()
    test_idor_protection()
    print("✅ Testes concluídos")
```

#### Script Shell para Testar Webhook
```bash
#!/bin/bash
# tests/test_webhook.sh

WEBHOOK_URL="https://bxggsjytnfupdoptcpeq.supabase.co/functions/v1/hotmart-webhook"

echo "🧪 Testando webhook Hotmart..."

# Teste 1: Requisição sem autenticação (deve falhar após fix)
echo "Teste 1: Requisição sem assinatura"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "buyer": {
      "email": "teste@example.com",
      "name": "Teste"
    }
  }'

echo -e "\n\n"

# Teste 2: Tentativa de criar usuário malicioso
echo "Teste 2: Tentativa de criar usuário com email inválido"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "buyer": {
      "email": "<script>alert(1)</script>@evil.com",
      "name": "Hacker"
    }
  }'

echo -e "\n✅ Testes concluídos"
```

---

### 6.2 Cenários de Ataque - Roteiro de Pentest

#### **Cenário 1: SQL Injection (Mitigado, mas validar)**
```bash
# Tentar SQL injection via product_id
curl -X POST "https://.../functions/v1/process-image" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "image_url": "https://example.com/img.jpg",
    "product_id": "123'; DROP TABLE generations; --"
  }'

# Resultado Esperado: Erro de validação (UUID inválido)
# Status: ✅ Protegido (Supabase usa prepared statements)
```

#### **Cenário 2: Acesso Não Autorizado a Recurso de Outro Usuário (IDOR)**
```bash
# Usuário A tenta acessar geração do Usuário B
USER_A_TOKEN="token_do_usuario_a"
GENERATION_B_ID="uuid_da_geracao_do_usuario_b"

curl -X GET "https://.../rest/v1/generations?id=eq.$GENERATION_B_ID" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "apikey: $ANON_KEY"

# Resultado Esperado: [] (array vazio - RLS bloqueou)
# Status: ✅ Protegido (RLS funcionando)
```

#### **Cenário 3: SSRF (Server-Side Request Forgery)**
```bash
# Tentar fazer requisição para localhost
curl -X POST "https://.../functions/v1/process-image" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "image_url": "http://169.254.169.254/latest/meta-data/",
    "product_id": "123e4567-e89b-12d3-a456-426614174000"
  }'

# Resultado Esperado: Erro de validação (URL bloqueada)
# Status: 🔴 Vulnerável (não implementado ainda)
```

#### **Cenário 4: Rate Limiting Bypass**
```bash
# Fazer 100 requisições simultâneas
for i in {1..100}; do
  curl -X POST "https://.../functions/v1/process-image" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"image_url\": \"https://example.com/img$i.jpg\", \"product_id\": \"$UUID\"}" &
done
wait

# Resultado Esperado: Após 10 requisições, retornar 429
# Status: 🔴 Vulnerável (rate limiting não implementado)
```

---

## 📊 Resumo de Vulnerabilidades

| ID | Severidade | Categoria | Localização | Status |
|----|-----------|-----------|-------------|--------|
| #1 | 🔴 CRÍTICO | Validação de Entrada | Todas Edge Functions | 🔴 Não Corrigido |
| #2 | 🟡 MÉDIO | Sanitização | generate-copy | 🔴 Não Corrigido |
| #3 | 🟡 MÉDIO | Exposição de Dados | hotmart-webhook | 🔴 Não Corrigido |
| #4 | 🟢 BAIXO | Exposição de Erros | Todas Edge Functions | 🔴 Não Corrigido |
| #5 | 🟡 MÉDIO | Autenticação | Todas Edge Functions | 🔴 Não Corrigido |
| #6 | 🔴 CRÍTICO | Autenticação | hotmart-webhook | 🔴 Não Corrigido |
| #7 | 🟡 MÉDIO | Autorização | AdminRoute | ✅ Mitigado (RLS) |
| #8 | 🟡 MÉDIO | IDOR | process-image | ✅ Mitigado (RLS) |
| #9 | 🟡 MÉDIO | CSRF | Frontend | 🔴 Não Corrigido |
| #10 | 🔴 CRÍTICO | Brute Force | Login | 🔴 Não Corrigido |
| #11 | 🔴 ALTO | Headers Segurança | Todas Edge Functions | 🔴 Não Corrigido |
| #12 | 🔴 ALTO | Rate Limiting | Todas Edge Functions | 🔴 Não Corrigido |
| #13 | 🔴 ALTO | CORS | Todas Edge Functions | 🔴 Não Corrigido |
| #14 | 🟡 MÉDIO | Logging | Todas Edge Functions | 🔴 Não Corrigido |
| #15 | 🟢 BAIXO | Alertas | Sistema | 🔴 Não Corrigido |

---

## ✅ Pontos Positivos Identificados

1. ✅ **RLS (Row Level Security) implementado corretamente**
2. ✅ **Supabase Auth com JWT gerenciado automaticamente**
3. ✅ **Proteção contra SQL Injection (Supabase Client)**
4. ✅ **React escapa HTML automaticamente (proteção XSS)**
5. ✅ **Rotas protegidas no frontend (ProtectedRoute/AdminRoute)**
6. ✅ **Service Role Key usada apenas em Edge Functions (isolamento)**

---

## 🎯 Priorização de Correções

### **Fase 1 - Crítico (Implementar Imediatamente)**
1. ✅ **#6**: Autenticar webhook Hotmart
2. ✅ **#5**: Validar JWT em todas Edge Functions
3. ✅ **#13**: Restringir CORS para domínios permitidos
4. ✅ **#10**: Implementar rate limiting em login

### **Fase 2 - Alto (Implementar em 1-2 semanas)**
5. ✅ **#12**: Rate limiting global nas Edge Functions
6. ✅ **#11**: Adicionar headers de segurança
7. ✅ **#1**: Validação de entrada com Zod

### **Fase 3 - Médio (Implementar em 1 mês)**
8. ✅ **#2**: Sanitização de inputs
9. ✅ **#9**: Proteção CSRF
10. ✅ **#14**: Logging estruturado
11. ✅ **#3**: Remover logs de dados sensíveis

### **Fase 4 - Baixo (Melhorias Contínuas)**
12. ✅ **#4**: Melhorar mensagens de erro
13. ✅ **#15**: Sistema de alertas

---

## 📝 Notas Finais

Esta auditoria identificou vulnerabilidades significativas que devem ser corrigidas antes do lançamento em produção. As correções críticas (#6, #5, #13, #10) devem ser implementadas **imediatamente**, pois expõem o sistema a riscos graves de segurança.

Recomenda-se também:
- Implementar testes de segurança automatizados no CI/CD
- Realizar auditorias periódicas (trimestrais)
- Treinar equipe em segurança de aplicações
- Estabelecer processo de revisão de código (code review) com foco em segurança

---

**Fim do Relatório**

