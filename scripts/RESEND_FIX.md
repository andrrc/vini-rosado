# 🔧 Como Resolver o Erro 403 do Resend

## Problema

Você está recebendo este erro:
```
403 - You can only send testing emails to your own email address (contato.valida.ai@gmail.com)
```

## Solução Rápida (Teste)

Para testar agora, use o email cadastrado na sua conta Resend:

```bash
# No arquivo .env, adicione:
TEST_EMAIL=contato.valida.ai@gmail.com

# Ou edite scripts/send-test-email.js e altere a linha:
const testEmail = 'contato.valida.ai@gmail.com'
```

## Solução Definitiva (Produção)

Para enviar emails para **qualquer destinatário**, você precisa verificar um domínio no Resend:

### Passo 1: Verificar Domínio

1. Acesse: https://resend.com/domains
2. Clique em **Add Domain**
3. Digite seu domínio (ex: `valida.ai` ou `seudominio.com`)
4. Copie os registros DNS que aparecerem

### Passo 2: Configurar DNS

Vá no painel do seu provedor de domínio (Hostinger, GoDaddy, etc.) e adicione os registros:

**Exemplo de registros:**
```
Tipo: TXT
Nome: @
Valor: resend-domain-verification=xxxxxxxxx

Tipo: MX
Nome: @
Valor: feedback-smtp.resend.com
Prioridade: 10
```

### Passo 3: Aguardar Verificação

- Pode levar de alguns minutos até 24 horas
- O Resend verificará automaticamente
- Você receberá um email quando estiver verificado

### Passo 4: Atualizar Código

Após verificar o domínio, atualize o `from` no código:

**Em `supabase/functions/hotmart-webhook/index.ts`:**
```typescript
from: 'Valida AI <noreply@valida.ai>', // Use seu domínio verificado
```

**Em `scripts/send-test-email.js`:**
```javascript
from: 'Valida AI <noreply@valida.ai>', // Use seu domínio verificado
```

### Passo 5: Testar

```bash
npm run send-test-email
```

Agora você poderá enviar para qualquer email! 🎉

---

## Alternativa: Usar Outro Serviço

Se preferir não verificar um domínio, você pode usar:

- **SendGrid**: https://sendgrid.com (mais fácil de configurar)
- **Mailgun**: https://mailgun.com
- **Amazon SES**: https://aws.amazon.com/ses/

