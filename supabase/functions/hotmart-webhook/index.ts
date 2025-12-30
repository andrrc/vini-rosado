import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Lista de origens permitidas para CORS (whitelist)
 * Webhooks geralmente não precisam de CORS, mas mantemos por segurança
 */
const ALLOWED_ORIGINS: string[] = [
  // Webhooks geralmente não têm origem (origin), mas mantemos a lista vazia por padrão
  // Se precisar permitir alguma origem específica para debug/teste, adicione aqui
]

/**
 * Função para gerar headers CORS baseados na origem da requisição
 * Retorna headers com Access-Control-Allow-Origin apenas se a origem estiver na whitelist
 * ou for um subdomínio da Vercel (.vercel.app)
 * Para webhooks, geralmente não retorna Allow-Origin (mais seguro)
 */
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin')
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }

  // Verifica se a origem está na whitelist ou é um subdomínio da Vercel
  const isAllowed = origin && (
    (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)) || 
    origin.endsWith('.vercel.app')
  )

  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  // Webhooks não devem ter Allow-Origin por padrão (mais seguro)

  return headers
}

// Função para enviar email de boas-vindas com credenciais
async function sendWelcomeEmail(
  to: string,
  name: string,
  transactionCode: string,
  loginUrl: string
): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  
  // Se não tiver Resend configurado, apenas logar (não falhar o webhook)
  if (!resendApiKey) {
    console.log('⚠️ RESEND_API_KEY não configurada. Email não será enviado.')
    console.log(`📧 Email que seria enviado para ${to}:`)
    console.log(`   Código da Transação: ${transactionCode}`)
    return
  }

  try {
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
      <p>Olá <strong>${name}</strong>,</p>
      <p>Sua compra foi aprovada e sua conta no <strong>Valida AI</strong> está pronta para uso!</p>
      
      <div class="credentials-box">
        <h3 style="margin-top: 0; color: #1e40af;">📋 Suas Credenciais de Acesso</h3>
        <p><strong>Email:</strong> ${to}</p>
        <p><strong>Senha Inicial (Código da Transação):</strong></p>
        <div class="code">${transactionCode}</div>
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

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Email de teste do Resend
        // ⚠️ Em modo de teste, só pode enviar para o email cadastrado na conta Resend
        // Para produção, configure um domínio verificado em resend.com/domains
        // e altere para: 'Valida AI <noreply@seudominio.com>'
        from: 'Valida AI <onboarding@resend.dev>',
        to: [to],
        subject: '🎉 Bem-vindo ao Valida AI - Suas Credenciais de Acesso',
        html: emailHtml,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Erro ao enviar email: ${response.status} - ${errorData}`)
    }

    console.log(`✅ Email de boas-vindas enviado para ${to}`)
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error)
    // Não falhar o webhook se o email falhar
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // ============================================
    // VERIFICAÇÃO DE SEGURANÇA - Autenticação do Webhook
    // ============================================
    const hotmartSecret = Deno.env.get('HOTMART_SECRET')
    
    if (!hotmartSecret) {
      console.error('❌ CRÍTICO: HOTMART_SECRET não configurada no ambiente. Webhook vulnerável!')
      console.error('⚠️ Configure a variável HOTMART_SECRET no Supabase Dashboard > Settings > Edge Functions')
      // Em produção, você pode escolher entre:
      // 1. Bloquear todas as requisições (mais seguro)
      // 2. Apenas alertar e continuar (menos seguro, mas não quebra em desenvolvimento)
      // Vamos bloquear por segurança:
      return new Response(
        JSON.stringify({ 
          error: 'Configuração de segurança ausente. Contate o administrador.',
        }),
        {
          status: 500,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      )
    }

    // Ler o body primeiro para verificar o token (Hotmart pode enviar no body)
    // Mas precisamos ler como texto para não consumir o stream
    const bodyText = await req.text()
    let webhookData: any
    
    try {
      webhookData = JSON.parse(bodyText)
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Body inválido. JSON malformado.' }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      )
    }

    // Verificar token de autenticação do webhook Hotmart
    // Hotmart pode enviar o token no header X-Hotmart-Hottok OU no campo 'hottok' do body
    const headerToken = req.headers.get('X-Hotmart-Hottok')
    const bodyToken = webhookData.hottok || webhookData.token || webhookData.secret
    
    const receivedToken = headerToken || bodyToken
    const tokenUsedFromBody = !headerToken && !!bodyToken // Flag para não usar hottok como transactionCode depois

    if (!receivedToken) {
      console.warn('⚠️ Tentativa de acesso ao webhook sem token de autenticação')
      console.warn(`   IP: ${req.headers.get('x-forwarded-for') || 'unknown'}`)
      console.warn(`   User-Agent: ${req.headers.get('user-agent') || 'unknown'}`)
      
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      )
    }

    // Comparação segura de strings (timing-safe)
    // Usar crypto.subtle para comparação constante-time
    const encoder = new TextEncoder()
    const receivedTokenBytes = encoder.encode(receivedToken)
    const secretBytes = encoder.encode(hotmartSecret)
    
    // Comparação timing-safe usando crypto.subtle
    if (receivedTokenBytes.length !== secretBytes.length) {
      console.warn('⚠️ Tentativa de acesso com token de tamanho incorreto')
      return new Response(
        JSON.stringify({ error: 'Token de autenticação inválido' }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      )
    }

    // Comparação timing-safe manual (protege contra timing attacks)
    let isValid = true
    for (let i = 0; i < receivedTokenBytes.length; i++) {
      if (receivedTokenBytes[i] !== secretBytes[i]) {
        isValid = false
      }
    }

    if (!isValid) {
      console.warn('⚠️ Tentativa de acesso ao webhook com token inválido')
      console.warn(`   IP: ${req.headers.get('x-forwarded-for') || 'unknown'}`)
      console.warn(`   User-Agent: ${req.headers.get('user-agent') || 'unknown'}`)
      console.warn(`   Token recebido (primeiros 4 chars): ${receivedToken.substring(0, 4)}***`)
      
      return new Response(
        JSON.stringify({ error: 'Token de autenticação inválido' }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('✅ Webhook autenticado com sucesso')

    // Verificar se o status é APPROVED
    if (webhookData.status !== 'APPROVED') {
      return new Response(
        JSON.stringify({ message: 'Status não aprovado', status: webhookData.status }),
        {
          status: 200,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      )
    }

    // Obter dados do comprador
    const email = webhookData.buyer?.email || webhookData.data?.buyer?.email
    const name = webhookData.buyer?.name || webhookData.data?.buyer?.name || 'Usuário'

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email não encontrado no webhook' }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        }
      )
    }

    // Extrair código da transação (tentar vários campos possíveis do webhook Hotmart)
    // IMPORTANTE: O cliente encontra esse código em:
    // 1. Email de confirmação da Hotmart (enviado após compra aprovada)
    // 2. Área do membro: https://consumer.hotmart.com → Minhas Compras → Detalhes
    // NOTA: Não usar webhookData.hottok como transactionCode se foi usado para autenticação
    const transactionCode = 
      webhookData.transaction || 
      webhookData.purchase_code || 
      (tokenUsedFromBody ? null : webhookData.hottok) || // Só usar hottok se não foi usado para auth
      webhookData.transaction_code ||
      webhookData.data?.transaction ||
      webhookData.data?.purchase_code ||
      webhookData.data?.hottok ||
      webhookData.purchase?.transaction ||
      webhookData.purchase?.code ||
      null

    if (!transactionCode) {
      console.warn('⚠️ Código da transação não encontrado no webhook. Usando fallback.')
    }

    // Usar código da transação como senha inicial (ou gerar um fallback se não encontrar)
    // O cliente usará esse código para fazer login pela primeira vez
    const initialPassword = transactionCode || `HP${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    console.log(`📝 Senha inicial definida para ${email}: ${initialPassword.substring(0, 10)}...`)
    console.log(`💡 Cliente deve usar esse código como senha no primeiro acesso`)

    // Criar cliente Supabase com service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verificar se o usuário já existe (listar e buscar por email)
    let userId: string
    let userExists = false

    // Listar usuários e verificar se já existe
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Erro ao listar usuários:', listError)
    } else {
      const existingUser = usersData.users.find(u => u.email === email)
      if (existingUser) {
        userId = existingUser.id
        userExists = true
      }
    }

    if (!userExists) {
      // Criar novo usuário no Auth com senha inicial = código da transação
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: initialPassword, // Senha inicial = código da transação
        email_confirm: true, // Email já validado pela Hotmart
        user_metadata: {
          name,
          source: 'hotmart',
          is_first_access: true, // Flag para identificar primeiro acesso
          transaction_code: transactionCode || initialPassword, // Salvar código para referência
        },
      })

      if (createError || !newUser.user) {
        throw new Error(`Erro ao criar usuário: ${createError?.message}`)
      }

      userId = newUser.user.id
      console.log(`✅ Usuário criado com senha inicial (código transação): ${email}`)
      
      // Enviar email de boas-vindas com credenciais (não bloqueia se falhar)
      const siteUrl = Deno.env.get('SITE_URL') || 'https://seudominio.com'
      const loginUrl = `${siteUrl}/login`
      
      await sendWelcomeEmail(
        email,
        name,
        initialPassword,
        loginUrl
      )
    } else {
      console.log(`ℹ️ Usuário já existe: ${email}`)
      // Se usuário já existe, não atualizar senha (segurança)
    }

    // Salvar/atualizar na tabela profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        name,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })

    if (profileError) {
      console.error('Erro ao salvar perfil:', profileError)
      // Não falhar o webhook se o perfil já existe
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário criado/atualizado com sucesso',
        userId,
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Erro no webhook:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro interno do servidor',
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  }
})
