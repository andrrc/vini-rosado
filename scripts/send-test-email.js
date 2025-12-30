import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar variáveis de ambiente do arquivo .env
function loadEnv() {
  const envPath = join(__dirname, '..', '.env')
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          if (!process.env[key]) {
            process.env[key] = value
          }
        }
      }
    }
  }
}

async function sendTestEmail() {
  loadEnv()

  const resendApiKey = process.env.RESEND_API_KEY
  // Para contas em modo de teste, você só pode enviar para o email cadastrado
  // O erro indica que o email cadastrado é: contato.valida.ai@gmail.com
  // Para enviar para qualquer email, verifique um domínio no Resend
  const testEmail = process.env.TEST_EMAIL || 'contato.valida.ai@gmail.com'
  const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
  const loginUrl = `${siteUrl}/login`

  if (!resendApiKey) {
    console.error('❌ Erro: RESEND_API_KEY não configurada!')
    console.error('')
    console.error('Configure no arquivo .env:')
    console.error('  RESEND_API_KEY=sua_chave_resend_aqui')
    console.error('')
    console.error('Para obter uma chave:')
    console.error('  1. Acesse https://resend.com')
    console.error('  2. Crie uma conta gratuita')
    console.error('  3. Vá em API Keys e crie uma nova chave')
    console.error('')
    console.error('⚠️  IMPORTANTE: Em modo de teste, você só pode enviar para o email cadastrado.')
    console.error('   Para enviar para qualquer email, verifique um domínio em: https://resend.com/domains')
    process.exit(1)
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .credentials-box { background: white; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .code { font-size: 24px; font-weight: bold; color: #3b82f6; letter-spacing: 2px; text-align: center; padding: 15px; background: #eff6ff; border-radius: 5px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bem-vindo ao Valida AI!</h1>
      <p>Sua conta foi criada com sucesso</p>
    </div>
    <div class="content">
      <p>Olá <strong>Andre</strong>,</p>
      <p>Sua compra foi aprovada e sua conta no <strong>Valida AI</strong> está pronta para uso!</p>
      
      <div class="credentials-box">
        <h3 style="margin-top: 0; color: #1e40af;">📋 Suas Credenciais de Acesso</h3>
        <p><strong>Email:</strong> ${testEmail}</p>
        <p><strong>Senha Inicial (Código da Transação):</strong></p>
        <div class="code">HP123456789</div>
        <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
          ⚠️ Use este código como senha no primeiro acesso. Você poderá definir uma senha pessoal após o login.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${loginUrl}" class="button">Acessar Minha Conta</a>
      </div>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <p style="margin: 0; color: #92400e;">
          <strong>💡 Dica:</strong> Guarde este email em local seguro. Você precisará do código da transação para fazer o primeiro login.
        </p>
      </div>

      <p>Se tiver dúvidas, entre em contato conosco.</p>
      <p>Atenciosamente,<br><strong>Equipe Valida AI</strong></p>
    </div>
    <div class="footer">
      <p>Este é um email automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>
  `

  try {
    console.log('📧 Enviando email de teste...')
    console.log(`   Para: ${testEmail}`)
    console.log('   From: onboarding@resend.dev (email de teste do Resend)')
    console.log('')
    console.log('⚠️  NOTA: Se receber erro 403, você está em modo de teste.')
    console.log('   Neste caso, só pode enviar para o email cadastrado na sua conta Resend.')
    console.log('   Para enviar para qualquer email, verifique um domínio: https://resend.com/domains')
    console.log('')

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Valida AI <onboarding@resend.dev>', // Email padrão do Resend para testes
        to: [testEmail],
        subject: '🎉 Bem-vindo ao Valida AI - Suas Credenciais de Acesso',
        html: emailHtml,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Erro ao enviar email: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    console.log('✅ Email enviado com sucesso!')
    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 DETALHES DO ENVIO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`ID do Email: ${data.id}`)
    console.log(`Destinatário: ${testEmail}`)
    console.log(`Assunto: Bem-vindo ao Valida AI`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('💡 Verifique a caixa de entrada (e spam) do email!')

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message)
    process.exit(1)
  }
}

sendTestEmail()

