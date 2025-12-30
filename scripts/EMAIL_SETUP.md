# 📧 Configuração de Envio de Emails

## Como configurar o Resend (Recomendado)

### 1. Criar conta no Resend
1. Acesse: https://resend.com
2. Crie uma conta gratuita (100 emails/dia grátis)
3. Vá em **API Keys** → **Create API Key**
4. Copie a chave gerada

### 2. Configurar variáveis de ambiente

**No arquivo `.env` (local):**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
SITE_URL=https://seudominio.com
```

**No Supabase Dashboard (Edge Functions):**
1. Vá em **Settings** > **Edge Functions**
2. Adicione as variáveis:
   - `RESEND_API_KEY`: Sua chave do Resend
   - `SITE_URL`: URL do seu site (ex: https://seudominio.com)

### 3. Modo de Teste vs Produção

**⚠️ IMPORTANTE: Em modo de teste, você só pode enviar para o email cadastrado na sua conta Resend.**

**Para enviar para qualquer email:**
1. No Resend, vá em **Domains** → **Add Domain**
2. Adicione seu domínio (ex: `seudominio.com`)
3. Configure os registros DNS conforme instruções
4. Atualize o `from` no código para: `Valida AI <noreply@seudominio.com>`

**Atualmente o código usa:**
- `onboarding@resend.dev` - Permite enviar para qualquer email (mas requer domínio verificado para produção)
- Se você estiver em modo de teste, só pode enviar para o email cadastrado na conta

### 4. Testar envio

```bash
npm run send-test-email
```

## Alternativas ao Resend

Se preferir usar outro serviço, você pode substituir a função `sendWelcomeEmail`:

- **SendGrid**: https://sendgrid.com
- **Mailgun**: https://mailgun.com
- **Amazon SES**: https://aws.amazon.com/ses/
- **SMTP direto**: Configurar SMTP no Supabase

## Estrutura do Email

O email enviado contém:
- ✅ Boas-vindas personalizadas
- ✅ Email de login
- ✅ Código da transação (senha inicial)
- ✅ Link direto para login
- ✅ Instruções claras
- ✅ Design responsivo e profissional

